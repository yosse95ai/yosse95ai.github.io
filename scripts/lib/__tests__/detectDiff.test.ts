import { describe, it, expect } from 'vitest';
import { detectDiff } from '../detectDiff.js';

/** テスト用XMLヘルパー */
function makeRss(links: string[]): string {
  const items = links
    .map(
      (link) =>
        `<item><link>${link}</link><pubDate>Tue, 01 Jul 2025 00:00:00 +0000</pubDate></item>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>${items}</channel></rss>`;
}

// ─────────────────────────────────────────────
// Property 5: 差分検出の正確性
// Validates: Requirements 4.1, 4.4
// ─────────────────────────────────────────────
describe('Property 5: 差分検出の正確性', () => {
  it('newUrls は「今回XMLに存在し前回XMLに存在しないURL」の集合と一致する', () => {
    const patterns: Array<{
      currentLinks: string[];
      previousLinks: string[];
      expectedNew: string[];
    }> = [
      // パターン1: 今回に新規URLが1件追加
      {
        currentLinks: [
          'https://example.com/article-a',
          'https://example.com/article-b',
          'https://example.com/article-c',
        ],
        previousLinks: [
          'https://example.com/article-a',
          'https://example.com/article-b',
        ],
        expectedNew: ['https://example.com/article-c'],
      },
      // パターン2: 今回に複数の新規URLが追加
      {
        currentLinks: [
          'https://example.com/article-x',
          'https://example.com/article-y',
          'https://example.com/article-z',
        ],
        previousLinks: ['https://example.com/article-x'],
        expectedNew: [
          'https://example.com/article-y',
          'https://example.com/article-z',
        ],
      },
      // パターン3: 今回と前回が完全に同じ（差分なし）
      {
        currentLinks: [
          'https://example.com/article-1',
          'https://example.com/article-2',
        ],
        previousLinks: [
          'https://example.com/article-1',
          'https://example.com/article-2',
        ],
        expectedNew: [],
      },
    ];

    for (const { currentLinks, previousLinks, expectedNew } of patterns) {
      const currentXml = makeRss(currentLinks);
      const previousXml = makeRss(previousLinks);
      const result = detectDiff(currentXml, previousXml);

      const resultUrls = [...result.newUrls].sort();
      const expectedUrls = [...expectedNew].sort();

      expect(resultUrls).toEqual(expectedUrls);
      expect(result.hasChanges).toBe(expectedNew.length > 0);
    }
  });
});

// ─────────────────────────────────────────────
// Property 6: 初回実行時の全件新規扱い
// Validates: Requirements 4.2
// ─────────────────────────────────────────────
describe('Property 6: 初回実行時の全件新規扱い', () => {
  it('previousFeedXml が null の場合、newUrls はXML内の全 <link> 要素を含む', () => {
    const patterns: Array<{ links: string[] }> = [
      // パターン1: 3件
      {
        links: [
          'https://example.com/article-a',
          'https://example.com/article-b',
          'https://example.com/article-c',
        ],
      },
      // パターン2: 1件
      {
        links: ['https://example.com/only-article'],
      },
      // パターン3: 5件
      {
        links: [
          'https://example.com/art-1',
          'https://example.com/art-2',
          'https://example.com/art-3',
          'https://example.com/art-4',
          'https://example.com/art-5',
        ],
      },
    ];

    for (const { links } of patterns) {
      const currentXml = makeRss(links);
      const result = detectDiff(currentXml, null);

      const resultUrls = [...result.newUrls].sort();
      const expectedUrls = [...links].sort();

      expect(resultUrls).toEqual(expectedUrls);
      expect(result.hasChanges).toBe(links.length > 0);
    }
  });
});

// ─────────────────────────────────────────────
// Property 7: 差分なし時の冪等性
// Validates: Requirements 4.3
// ─────────────────────────────────────────────
describe('Property 7: 差分なし時の冪等性', () => {
  it('同じXMLを currentFeedXml と previousFeedXml の両方に渡すと hasChanges: false を返す', () => {
    const patterns: Array<{ links: string[] }> = [
      // パターン1: 2件
      {
        links: [
          'https://example.com/article-a',
          'https://example.com/article-b',
        ],
      },
      // パターン2: 4件
      {
        links: [
          'https://example.com/art-1',
          'https://example.com/art-2',
          'https://example.com/art-3',
          'https://example.com/art-4',
        ],
      },
      // パターン3: 空フィード
      {
        links: [],
      },
    ];

    for (const { links } of patterns) {
      const xml = makeRss(links);
      const result = detectDiff(xml, xml);

      expect(result.hasChanges).toBe(false);
      expect(result.newUrls).toHaveLength(0);
    }
  });
});

// ─────────────────────────────────────────────
// ユニットテスト
// ─────────────────────────────────────────────
describe('detectDiff ユニットテスト', () => {
  it('新規記事あり: 今回XMLに新しいURLがある場合、hasChanges: true と newUrls が返る', () => {
    const currentXml = makeRss([
      'https://example.com/article-old',
      'https://example.com/article-new',
    ]);
    const previousXml = makeRss(['https://example.com/article-old']);

    const result = detectDiff(currentXml, previousXml);

    expect(result.hasChanges).toBe(true);
    expect(result.newUrls).toHaveLength(1);
    expect(result.newUrls[0]).toBe('https://example.com/article-new');
  });

  it('差分なし: 同じURLセットの場合、hasChanges: false と空の newUrls が返る', () => {
    const xml = makeRss([
      'https://example.com/article-a',
      'https://example.com/article-b',
    ]);

    const result = detectDiff(xml, xml);

    expect(result.hasChanges).toBe(false);
    expect(result.newUrls).toHaveLength(0);
  });

  it('初回実行（全件新規）: previousFeedXml が null の場合、全URLが newUrls に含まれる', () => {
    const links = [
      'https://example.com/article-1',
      'https://example.com/article-2',
      'https://example.com/article-3',
    ];
    const currentXml = makeRss(links);

    const result = detectDiff(currentXml, null);

    expect(result.hasChanges).toBe(true);
    expect(result.newUrls).toHaveLength(3);

    const resultUrls = [...result.newUrls].sort();
    expect(resultUrls).toEqual([...links].sort());
  });

  it('空フィード: item なしのXMLを渡すと hasChanges: false と空の newUrls が返る', () => {
    const emptyXml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel></channel></rss>`;

    const result = detectDiff(emptyXml, null);

    expect(result.hasChanges).toBe(false);
    expect(result.newUrls).toHaveLength(0);
  });
});
