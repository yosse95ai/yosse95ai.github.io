import { existsSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { parseFeed, extractIdFromUrl } from './lib/feedParser.js';
import { loadCache, saveCache } from './lib/feedCache.js';
import { detectDiff } from './lib/detectDiff.js';
import { mergeAndSort } from './lib/updateArticles.js';
import { sanitizeForLog } from './lib/sanitize.js';
import { refreshOgpCache } from './refresh-ogp-cache.js';
import type { ArticleEntry } from './lib/types.js';

// 定数
const FEED_URL = 'https://aws.amazon.com/jp/blogs/news/author/yhiroaky/feed/';
const CACHE_PATH = 'src/data/blog/rss-cache.xml';
const ARTICLES_PATH = 'src/data/blog/aws-articles.json';
const OGP_CACHE_PATH = 'src/data/blog/ogp-cache.json';

/** 今日の日付を YYYY-MM-DD 形式で返す */
function getTodayString(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** gh CLI でオープンな chore/update-aws-blog- プレフィックスのPRを検索する */
interface PrInfo {
  headRefName: string;
  number: number;
}

function findExistingPr(): PrInfo | null {
  const output = execSync(
    `gh pr list --state open --json headRefName,number --jq '[.[] | select(.headRefName | startswith("chore/update-aws-blog-"))]'`,
    { encoding: 'utf-8' },
  ).trim();

  const prs = JSON.parse(output) as PrInfo[];
  return prs.length > 0 ? (prs[0] ?? null) : null;
}

/** 更新対象ファイルをステージングする（OGPキャッシュは存在する場合のみ） */
function stageUpdatedFiles(): void {
  const paths = [ARTICLES_PATH, CACHE_PATH];
  if (existsSync(OGP_CACHE_PATH)) paths.push(OGP_CACHE_PATH);
  execSync(`git add ${paths.join(' ')}`, { encoding: 'utf-8' });
}

/**
 * OGPキャッシュを更新する。
 * 失敗してもデプロイ時に再取得されるため、記事更新自体は継続する。
 *
 * 子プロセスを起動せず、同一プロセス内で関数を直接呼び出すため
 * 実行ランタイム（Node / Bun）に依存しない。
 */
async function updateOgpCache(): Promise<void> {
  try {
    const { succeeded, failed } = await refreshOgpCache();
    console.log(
      `[update-aws-blog] ogp-cache.json を更新しました（成功 ${succeeded} 件 / 失敗 ${failed} 件）`,
    );
  } catch (err) {
    console.warn('[update-aws-blog] OGPキャッシュの更新に失敗しました（処理は継続します）:', err);
  }
}

async function main(): Promise<void> {
  // 1. 生XMLを取得（差分検出用）
  console.log('[update-aws-blog] RSSフィードを取得中...');
  const feedResponse = await fetch(FEED_URL);
  if (!feedResponse.ok) {
    console.error(`[update-aws-blog] フィード取得失敗: HTTP ${feedResponse.status}`);
    process.exit(1);
  }
  const currentXml = await feedResponse.text();

  // 2. parseFeed でパース済みデータを取得（id・publishedAt 補完用）
  const feedArticles = await parseFeed(FEED_URL);
  console.log(`[update-aws-blog] ${feedArticles.length} 件の記事を取得しました`);

  // 3. 前回キャッシュXMLを読み込み
  const previousXml = loadCache(CACHE_PATH);

  // 4. 差分検出
  console.log('[update-aws-blog] 差分を検出中...');
  const diff = detectDiff(currentXml, previousXml);

  // 5. 差分なしの場合は早期終了
  if (!diff.hasChanges) {
    console.log('[update-aws-blog] 差分なし。処理を終了します。');
    process.exit(0);
  }

  console.log(`[update-aws-blog] ${diff.newUrls.length} 件の新規記事を検出しました`);

  // 6. キャッシュXMLを上書き保存
  saveCache(CACHE_PATH, currentXml);
  console.log('[update-aws-blog] キャッシュを更新しました');

  // 7. detectDiff の newUrls を FeedArticle[] と突き合わせて ArticleEntry[] を生成
  const feedMap = new Map(feedArticles.map((a) => [a.externalUrl, a]));

  const completeEntries: ArticleEntry[] = diff.newUrls.map((externalUrl) => {
    const feed = feedMap.get(externalUrl);
    return feed
      ? { id: feed.id, externalUrl, publishedAt: feed.publishedAt }
      : { id: extractIdFromUrl(externalUrl), externalUrl }; // フォールバック
  });

  // 8. 既存JSONにマージ
  const existingJson = readFileSync(ARTICLES_PATH, 'utf-8');
  const existing = JSON.parse(existingJson) as ArticleEntry[];
  const merged = mergeAndSort(existing, completeEntries);

  writeFileSync(ARTICLES_PATH, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  console.log('[update-aws-blog] aws-articles.json を更新しました');

  // 8-2. 新規記事分のOGPキャッシュを更新（デプロイ時の取得失敗に備えたフォールバック）
  await updateOgpCache();

  // 9. ブランチ名を生成
  const today = getTodayString();
  const newBranchName = `chore/update-aws-blog-${today}`;

  // 10. 既存PRを検索
  const existingPr = findExistingPr();

  if (existingPr === null) {
    // 既存PRなし: 新規ブランチを作成してコミット・PR作成
    console.log(`[update-aws-blog] 新規ブランチ "${sanitizeForLog(newBranchName)}" を作成します`);
    execSync(`git checkout -b ${newBranchName}`, { encoding: 'utf-8' });
    stageUpdatedFiles();
    execSync(`git commit -m "chore: update AWS blog articles (${today})"`, { encoding: 'utf-8' });
    execSync(`git push origin ${newBranchName} --force`, { encoding: 'utf-8' });
    execSync(
      `gh pr create --title "chore: update AWS blog articles" --body "自動更新: 新規AWSブログ記事を追加" --head ${newBranchName} --base master`,
      { encoding: 'utf-8' },
    );
    console.log('[update-aws-blog] PRを作成しました');
  } else {
    // 既存PRあり: 既存ブランチへforce push
    const existingBranch = existingPr.headRefName;
    console.log(`[update-aws-blog] 既存PR #${existingPr.number} のブランチ "${sanitizeForLog(existingBranch)}" へforce pushします`);
    execSync(`git checkout -b ${existingBranch}`, { encoding: 'utf-8' });
    stageUpdatedFiles();
    execSync(`git commit -m "chore: update AWS blog articles (${today})"`, { encoding: 'utf-8' });
    execSync(`git push origin ${existingBranch} --force`, { encoding: 'utf-8' });
    console.log('[update-aws-blog] 既存PRを更新しました');
  }
}

main().catch((err: unknown) => {
  console.error('[update-aws-blog] エラーが発生しました:', err);
  process.exit(1);
});
