/**
 * ビルド成果物のスモークチェック
 *
 * ユニットテストでは検知できない「生成された HTML の回帰」を検査する。
 * 特に getCollection() の返却順はライブラリの実装に依存して静かに変わるため
 * （Astro 5 -> 6 で JSON 定義順から id 順に変わった実績がある）、
 * データファイルから期待する並び順を組み立てて実際の出力と照合する。
 *
 * 使い方: bun run build && bun run smoke
 * 検査対象のディレクトリは SMOKE_DIST_DIR で差し替えられる（失敗パスの検証用）。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sanitizeForLog } from './lib/sanitize.js';

const DIST = process.env.SMOKE_DIST_DIR ?? 'dist';
const SITE = 'https://yosse95ai.github.io';

let failures = 0;

// 記事 ID や URL は RSS フィード由来の外部データなので、ログ出力前にサニタイズする
// （Log Injection / CWE-117 対策。リポジトリ全体で sanitizeForLog を通す方針）
const section = (title: string) => console.log(`\n▶ ${sanitizeForLog(title)}`);
const ok = (message: string) => console.log(`  ✅ ${sanitizeForLog(message)}`);
/** 詳細は 1 要素 1 行として渡す（サニタイズで改行が失われるため文字列連結にしない） */
const ng = (message: string, details: string[] = []) => {
  failures++;
  const body = details.map((line) => `\n     ${sanitizeForLog(line)}`).join('');
  console.error(`  ❌ ${sanitizeForLog(message)}${body}`);
};

const distFile = (path: string) => join(DIST, path);
const readDist = (path: string) => readFileSync(distFile(path), 'utf-8');
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf-8')) as T;

/**
 * needles が html 内にこの順序で出現することを検査する。
 * 欠落と順序違いを区別して報告する。
 */
const checkOrder = (html: string, needles: string[], label: string) => {
  const missing = needles.filter((needle) => !html.includes(needle));
  if (missing.length > 0) {
    ng(`${label}: 出力に存在しない項目がある`, missing);
    return;
  }
  const actual = [...needles].sort((a, b) => html.indexOf(a) - html.indexOf(b));
  if (actual.every((needle, i) => needle === needles[i])) {
    ok(`${label}（${needles.length} 件が期待どおりの順序）`);
    return;
  }
  ng(`${label}: 並び順が期待と異なる`, [
    `期待: ${needles.join(' > ')}`,
    `実際: ${actual.join(' > ')}`,
  ]);
};

// ---------------------------------------------------------------- ページの生成

const PAGES = [
  'index.html',
  '404.html',
  'gallery/index.html',
  'history/index.html',
  'sitemap-index.xml',
  'sitemap-0.xml',
];

section('ページの生成');
for (const page of PAGES) {
  if (existsSync(distFile(page))) ok(page);
  else ng(`${page} が生成されていない`);
}

// 開発用のコンポーネントカタログは build スクリプトで削除される想定
if (existsSync(distFile('catalog'))) {
  ng('dist/catalog が残っている（開発用カタログは公開しない）');
} else {
  ok('dist/catalog が削除されている');
}

if (failures > 0) {
  console.error('\nページが生成されていないため、以降の検査を中止します。');
  process.exit(1);
}

section('各ページの <title>');
for (const page of PAGES.filter((p) => p.endsWith('.html') && p !== '404.html')) {
  const title = readDist(page).match(/<title>([^<]*)<\/title>/)?.[1]?.trim();
  if (title) ok(`${page}: ${title}`);
  else ng(`${page}: <title> が空、または存在しない`);
}

// -------------------------------------------------------------------- sitemap

section('sitemap');
{
  const locs = [...readDist('sitemap-0.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const expected = [`${SITE}/`, `${SITE}/catalog/`, `${SITE}/gallery/`, `${SITE}/history/`];
  if (locs.length === expected.length && expected.every((url) => locs.includes(url))) {
    ok(`${locs.length} URL: ${locs.join(', ')}`);
  } else {
    ng('sitemap の URL が期待と異なる', [
      `期待: ${expected.join(', ')}`,
      `実際: ${locs.join(', ')}`,
    ]);
  }
}

// ------------------------------------------------- コレクションの表示順（本題）

const index = readDist('index.html');
const gallery = readDist('gallery/index.html');
const history = readDist('history/index.html');

section('Skills の表示順（skills.json の order 昇順）');
{
  type Skill = { id: string; order: number; name: string };
  const skills = readJson<Skill[]>('src/data/skills/skills.json');
  const expected = [...skills]
    .sort((a, b) => a.order - b.order)
    .map((skill) => `title="${skill.name}"`);
  checkOrder(index, expected, 'Skills');
}

section('Gallery の表示順（img.json の order 昇順）');
{
  type Image = { id: string; order: number; src: string };
  const images = readJson<Image[]>('src/data/gallery/img.json');
  const expected = [...images]
    .sort((a, b) => a.order - b.order)
    // 最適化後は /_astro/<元のファイル名>.<hash>.webp になる
    .map((image) => `/_astro/${image.src.split('/').pop()!.replace(/\.[^.]+$/, '')}.`);
  checkOrder(gallery, expected, 'Gallery');
}

section('Gallery のレイアウト方式');
{
  // CSS マルチカラム（columns-*）は WebKit が列の分割位置の余りを次の列の先頭に
  // 持ち込むため、iOS/iPadOS Safari で列の上端に穴が空く（issue #58）。
  // 列は JS で振り分ける方式に変えたので、マルチカラムへの逆戻りを検知する。
  const multicol = gallery.match(/class="[^"]*\bcolumns-\d[^"]*"/);
  if (multicol) {
    ng('ギャラリーが CSS マルチカラムを使っている（#58 が再発する）', [multicol[0]]);
  } else {
    ok('CSS マルチカラムを使っていない');
  }

  if (gallery.includes('data-photo-grid')) {
    ok('列を振り分けるコンテナ（data-photo-grid）がある');
  } else {
    ng('data-photo-grid が無い（PhotoGrid の構造が変わった可能性）');
  }

  // 列の高さ見積もりに使う縦横比が全画像に埋め込まれていること
  const ratioCount = (gallery.match(/data-ratio="/g) ?? []).length;
  const imageCount = readJson<unknown[]>('src/data/gallery/img.json').length;
  if (ratioCount === imageCount) {
    ok(`data-ratio が ${ratioCount} 件（img.json の件数と一致）`);
  } else {
    ng(`data-ratio が ${ratioCount} 件しかない（img.json は ${imageCount} 件）`);
  }
}

section('Speaking の表示順（date 降順）');
{
  type Speaking = { id: string; date: string; event: string };
  const speaking = readJson<Speaking[]>('src/data/speaking/speaking.json');
  const expected = [...speaking]
    .sort((a, b) => b.date.localeCompare(a.date))
    // SpeakingCard は「{年} — {イベント名}」を表示する
    .map((item) => `>${item.date.slice(0, 4)} — ${item.event}<`);
  checkOrder(index, expected, 'Speaking');
}

section('Blog カード（publishedAt 降順、同値は id 昇順）');
{
  type Article = { id: string; externalUrl: string; publishedAt?: string };
  for (const [file, label] of [
    ['aws-articles.json', 'AWS ブログ'],
    ['other-articles.json', 'その他ブログ'],
  ] as const) {
    const articles = readJson<Article[]>(`src/data/blog/${file}`);
    const missing = articles.filter((a) => !history.includes(`href="${a.externalUrl}"`));
    if (missing.length > 0) {
      ng(
        `${label}: 記事が出力されていない`,
        missing.map((a) => a.id),
      );
      continue;
    }
    ok(`${label}: ${articles.length} 件すべてが出力されている`);

    // publishedAt を持つ記事同士の相対順序のみ検証する
    // （OGP から日付を補完している記事はデータファイルだけでは順序が確定しないため）
    const dated = articles.filter((a): a is Required<Article> => Boolean(a.publishedAt));
    if (dated.length < 2) continue;
    const expected = [...dated]
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id))
      .map((a) => `href="${a.externalUrl}"`);
    checkOrder(history, expected, `${label}の並び`);
  }
}

// ---------------------------------------------------------------- アイコン描画

section('アイコンの描画');
{
  const svgCount = (index.match(/<svg/g) ?? []).length;
  if (svgCount >= 10) ok(`svg 要素が ${svgCount} 個`);
  else ng(`svg 要素が ${svgCount} 個しかない（アイコンの解決に失敗している可能性）`);

  // 多色ロゴは Iconify の正規化で currentColor に置換されることがあるため色を直接検査する
  const colors = [
    { label: 'Kiro の紫（thesvg-color:kiro）', value: '#993ff5' },
    { label: 'Dify の青（local:dify）', value: '#03f' },
    { label: 'devicon の色（TypeScript）', value: '#007acc' },
  ];
  for (const { label, value } of colors) {
    if (index.includes(value)) ok(`${label}: ${value} が維持されている`);
    else ng(`${label}: ${value} が出力に無い（currentColor に置換された可能性）`);
  }
}

// ------------------------------------------------------------------------ 結果

if (failures > 0) {
  console.error(`\n❌ スモークチェック失敗: ${failures} 件`);
  process.exit(1);
}
console.log('\n✅ スモークチェック成功: すべての項目が期待どおり');
