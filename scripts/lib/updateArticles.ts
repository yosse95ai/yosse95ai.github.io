import type { ArticleEntry } from './types.js';

/**
 * 既存記事リストに新規記事を追加し、publishedAt降順でソートして返す
 * - externalUrl をキーとして重複排除
 * - publishedAt がない記事はリスト末尾に配置
 */
export function mergeAndSort(
  existing: ArticleEntry[],
  newArticles: ArticleEntry[],
): ArticleEntry[] {
  // externalUrl をキーとして重複排除（後勝ち: newArticles が優先）
  const map = new Map<string, ArticleEntry>();
  for (const article of existing) {
    map.set(article.externalUrl, article);
  }
  for (const article of newArticles) {
    map.set(article.externalUrl, article);
  }

  const merged = Array.from(map.values());

  // publishedAt あり・なしで分割
  const withDate = merged.filter((a): a is ArticleEntry & { publishedAt: string } =>
    a.publishedAt !== undefined,
  );
  const withoutDate = merged.filter((a) => a.publishedAt === undefined);

  // publishedAt 降順でソート
  withDate.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  // publishedAt なし記事は末尾に配置
  return [...withDate, ...withoutDate];
}
