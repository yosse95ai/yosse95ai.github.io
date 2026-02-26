/** RSSフィードから正規化した記事データ */
export interface FeedArticle {
  /** URLから生成したスラッグ */
  id: string;
  /** 記事URL */
  externalUrl: string;
  /** ISO 8601形式（例: "2025-07-01"） */
  publishedAt: string;
}

/** 記事リストJSONの1エントリー（publishedAtはoptional） */
export interface ArticleEntry {
  id: string;
  externalUrl: string;
  publishedAt?: string;
}

/** 差分検出結果 */
export interface DiffResult {
  newArticles: ArticleEntry[];
  hasChanges: boolean;
}
