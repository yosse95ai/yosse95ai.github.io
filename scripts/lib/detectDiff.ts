import { XMLParser } from 'fast-xml-parser';
import type { DiffResult } from './types.js';

/**
 * XML文字列から <link> 要素のURLセットを抽出する
 */
function extractLinks(xml: string): Set<string> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    cdataPropName: '__cdata',
  });

  const parsed = parser.parse(xml) as Record<string, unknown>;
  const rss = parsed['rss'] as Record<string, unknown> | undefined;
  const channel = rss?.['channel'] as Record<string, unknown> | undefined;

  if (!channel) {
    return new Set<string>();
  }

  const rawItems = channel['item'];
  if (!rawItems) {
    return new Set<string>();
  }

  const items: unknown[] = Array.isArray(rawItems) ? rawItems : [rawItems];
  const links = new Set<string>();

  for (const item of items) {
    const record = item as Record<string, unknown>;
    const rawLink = record['link'];

    let link: string | undefined;
    if (typeof rawLink === 'string') {
      link = rawLink.trim();
    } else if (rawLink && typeof rawLink === 'object') {
      const cdataVal = (rawLink as Record<string, unknown>)['__cdata'];
      if (typeof cdataVal === 'string') {
        link = cdataVal.trim();
      }
    }

    if (link) {
      links.add(link);
    }
  }

  return links;
}

/**
 * 今回取得したRSSフィードXMLと前回キャッシュXMLを比較して差分を返す
 * @param currentFeedXml - 今回取得したRSSフィードのXML文字列
 * @param previousFeedXml - 前回保存したキャッシュXMLの文字列（初回はnull）
 * @returns 差分結果
 */
export function detectDiff(
  currentFeedXml: string,
  previousFeedXml: string | null
): DiffResult {
  const currentLinks = extractLinks(currentFeedXml);

  let newUrls: Set<string>;
  if (previousFeedXml === null) {
    // 初回実行: 全リンクを新規として扱う
    newUrls = currentLinks;
  } else {
    const previousLinks = extractLinks(previousFeedXml);
    newUrls = new Set<string>();
    for (const url of currentLinks) {
      if (!previousLinks.has(url)) {
        newUrls.add(url);
      }
    }
  }

  const newUrlsArray = Array.from(newUrls);

  return {
    newUrls: newUrlsArray,
    hasChanges: newUrlsArray.length > 0,
  };
}
