import { XMLParser } from 'fast-xml-parser';
import type { FeedArticle } from './types.js';

const AWS_BLOG_PREFIX = 'https://aws.amazon.com/jp/blogs/news/';
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_REGEX = /^[a-z0-9-]+$/i;

/**
 * 記事URLからIDスラッグを生成する
 * 例: "https://aws.amazon.com/jp/blogs/news/my-article/" → "my-article"
 */
export function extractIdFromUrl(url: string): string {
  const trimmed = url.replace(/\/+$/, '');
  const segments = trimmed.split('/');
  return segments[segments.length - 1] ?? '';
}

/**
 * URLを元にした短いハッシュ文字列を生成する（衝突回避用）
 */
function hashUrl(url: string): string {
  let sum = 0;
  for (let i = 0; i < url.length; i++) {
    sum += url.charCodeAt(i);
  }
  return String(sum % 10000).padStart(4, '0');
}

/**
 * RFC 2822形式の日付文字列を YYYY-MM-DD 形式に変換する
 * 例: "Tue, 01 Jul 2025 00:00:00 +0000" → "2025-07-01"
 */
function convertPubDate(pubDate: string): string {
  const date = new Date(pubDate);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid pubDate: ${pubDate}`);
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * RSSフィードURLを取得してパースし、記事リストを返す
 * @param feedUrl - RSSフィードのURL
 * @returns 記事リスト（publishedAt降順）
 */
export async function parseFeed(feedUrl: string): Promise<FeedArticle[]> {
  // フィード取得
  let xmlText: string;
  try {
    const response = await fetch(feedUrl);
    if (!response.ok) {
      const msg = `Failed to fetch feed: HTTP ${response.status} ${response.statusText}`;
      console.error(msg);
      throw new Error(msg);
    }
    xmlText = await response.text();
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Failed to fetch feed:')) {
      throw err;
    }
    const msg = `Network error while fetching feed: ${String(err)}`;
    console.error(msg);
    throw new Error(msg);
  }

  // XMLパース
  let parsed: unknown;
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      cdataPropName: '__cdata',
    });
    parsed = parser.parse(xmlText);
  } catch (err) {
    const msg = `Failed to parse XML: ${String(err)}`;
    console.error(msg);
    throw new Error(msg);
  }

  // <channel> > <item> 要素を取得
  let items: unknown[];
  try {
    const rss = parsed as Record<string, unknown>;
    const channel = (rss['rss'] as Record<string, unknown>)?.['channel'] as Record<string, unknown>;
    if (!channel) {
      throw new Error('Missing <channel> element in RSS feed');
    }
    const rawItems = channel['item'];
    if (!rawItems) {
      // itemが存在しない場合は空配列を返す
      return [];
    }
    items = Array.isArray(rawItems) ? rawItems : [rawItems];
  } catch (err) {
    const msg = `Unexpected RSS structure: ${String(err)}`;
    console.error(msg);
    throw new Error(msg);
  }

  // ID衝突検出用マップ: slug → url
  const slugToUrl = new Map<string, string>();
  const articles: FeedArticle[] = [];

  for (const item of items) {
    const record = item as Record<string, unknown>;

    // <link> の取得（CDATAセクション対応）
    let link: string | undefined;
    const rawLink = record['link'];
    if (typeof rawLink === 'string') {
      link = rawLink.trim();
    } else if (rawLink && typeof rawLink === 'object') {
      const cdataVal = (rawLink as Record<string, unknown>)['__cdata'];
      if (typeof cdataVal === 'string') {
        link = cdataVal.trim();
      }
    }

    if (!link) {
      console.error('Skipping item: missing <link>');
      continue;
    }

    // externalUrl バリデーション
    if (!link.startsWith(AWS_BLOG_PREFIX)) {
      console.error(`Skipping item: externalUrl does not match required prefix: ${link}`);
      continue;
    }

    // <pubDate> の取得と変換
    let publishedAt: string;
    const rawPubDate = record['pubDate'];
    if (typeof rawPubDate !== 'string' || !rawPubDate.trim()) {
      console.error(`Skipping item: missing or invalid <pubDate> for ${link}`);
      continue;
    }
    try {
      publishedAt = convertPubDate(rawPubDate.trim());
    } catch {
      console.error(`Skipping item: failed to convert pubDate "${rawPubDate}" for ${link}`);
      continue;
    }

    // publishedAt バリデーション
    if (!DATE_REGEX.test(publishedAt)) {
      console.error(`Skipping item: publishedAt "${publishedAt}" is not YYYY-MM-DD format for ${link}`);
      continue;
    }

    // IDスラッグ生成
    let id = extractIdFromUrl(link);

    // IDスラッグ バリデーション
    if (!id || !SLUG_REGEX.test(id)) {
      console.error(`Skipping item: invalid ID slug "${id}" for ${link}`);
      continue;
    }

    // ID衝突検出
    if (slugToUrl.has(id)) {
      const existingUrl = slugToUrl.get(id)!;
      if (existingUrl !== link) {
        // 衝突: 既存エントリーのIDにもハッシュを付与
        const existingHash = hashUrl(existingUrl);
        const existingArticleIdx = articles.findIndex(a => a.externalUrl === existingUrl);
        if (existingArticleIdx !== -1) {
          articles[existingArticleIdx] = {
            ...articles[existingArticleIdx],
            id: `${id}-${existingHash}`,
          };
        }
        // 新しいエントリーにもハッシュを付与
        id = `${id}-${hashUrl(link)}`;
      }
    } else {
      slugToUrl.set(id, link);
    }

    articles.push({ id, externalUrl: link, publishedAt });
  }

  // publishedAt 降順でソート
  articles.sort((a, b) => {
    if (a.publishedAt > b.publishedAt) return -1;
    if (a.publishedAt < b.publishedAt) return 1;
    return 0;
  });

  return articles;
}
