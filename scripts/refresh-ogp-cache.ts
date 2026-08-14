/**
 * サイトが参照する外部URLのOGPを取得し、src/data/blog/ogp-cache.json を更新する。
 *
 * デプロイ時のビルドは外部サイトへのアクセスが一時的に失敗することがあり、
 * その場合このキャッシュへフォールバックしてカードの画像・タイトルを維持する。
 */
import { readFileSync } from 'node:fs';
import { fetchOgp, flushOgpCache } from '../src/lib/fetchOgp.js';
import { OGP_CACHE_PATH } from '../src/lib/ogpCache.js';
import { formatErrorForLog, sanitizeForLog } from '../src/lib/sanitize.js';

interface UrlEntry {
  externalUrl?: string;
  url?: string | null;
}

const DATA_FILES = [
  'src/data/blog/aws-articles.json',
  'src/data/blog/other-articles.json',
  'src/data/oss/contributions.json',
  'src/data/speaking/speaking.json',
] as const;

/** SpeakingCard は YouTube のみOGPを取得する */
const isYouTube = (url: string): boolean =>
  url.includes('youtube.com') || url.includes('youtu.be');

function collectUrls(): string[] {
  const urls = new Set<string>();

  for (const file of DATA_FILES) {
    let entries: UrlEntry[];
    try {
      entries = JSON.parse(readFileSync(file, 'utf-8')) as UrlEntry[];
    } catch (err) {
      console.warn(
        `[refresh-ogp-cache] 読み込みに失敗しました: ${sanitizeForLog(file)}: ${formatErrorForLog(err)}`,
      );
      continue;
    }

    for (const entry of entries) {
      const url = entry.externalUrl ?? entry.url;
      if (!url) continue;
      // speaking.json は YouTube 以外はOGPを使わない
      if (file === 'src/data/speaking/speaking.json' && !isYouTube(url)) continue;
      urls.add(url);
    }
  }

  return [...urls];
}

async function main(): Promise<void> {
  const urls = collectUrls();
  console.log(`[refresh-ogp-cache] ${urls.length} 件のURLを対象にOGPを取得します`);

  const results = await Promise.all(
    urls.map(async (url) => ({ url, ogp: await fetchOgp(url) })),
  );

  const failed = results.filter(({ url, ogp }) => ogp.title === url && ogp.ogpImage === '');
  flushOgpCache();

  console.log(
    `[refresh-ogp-cache] 成功 ${results.length - failed.length} 件 / 失敗 ${failed.length} 件 → ${sanitizeForLog(OGP_CACHE_PATH)}`,
  );
  for (const { url } of failed) {
    console.warn(`[refresh-ogp-cache] 取得できませんでした: ${sanitizeForLog(url)}`);
  }
}

main().catch((err: unknown) => {
  console.error(`[refresh-ogp-cache] エラーが発生しました: ${formatErrorForLog(err)}`);
  process.exit(1);
});
