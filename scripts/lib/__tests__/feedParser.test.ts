import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseFeed, extractIdFromUrl } from '../feedParser.js';

// サンプルRSSフィードXML（2件の記事、降順ソート確認用）
const VALID_RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>AWS Blog</title>
    <item>
      <link>https://aws.amazon.com/jp/blogs/news/article-one/</link>
      <pubDate>Tue, 01 Jul 2025 00:00:00 +0000</pubDate>
    </item>
    <item>
      <link>https://aws.amazon.com/jp/blogs/news/article-two/</link>
      <pubDate>Mon, 30 Jun 2025 00:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

// <item> なしの空フィード
const EMPTY_RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>AWS Blog</title>
  </channel>
</rss>`;

// 不正なXML
const INVALID_XML = `this is not xml at all <<>>`;

/** fetchをモックするヘルパー */
function mockFetch(status: number, body: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Not Found',
      text: () => Promise.resolve(body),
    }),
  );
}

const ALLOWED_FEED_URL = 'https://aws.amazon.com/jp/blogs/news/author/test/feed/';

beforeEach(() => {
  vi.unstubAllGlobals();
});

// ─────────────────────────────────────────────
// extractIdFromUrl
// ─────────────────────────────────────────────
describe('extractIdFromUrl', () => {
  it('末尾スラッシュありURLから正しいスラッグを返す', () => {
    expect(extractIdFromUrl('https://aws.amazon.com/jp/blogs/news/my-article/')).toBe('my-article');
  });

  it('末尾スラッシュなしURLから正しいスラッグを返す', () => {
    expect(extractIdFromUrl('https://aws.amazon.com/jp/blogs/news/my-article')).toBe('my-article');
  });

  it('複数の末尾スラッシュを除去してスラッグを返す', () => {
    expect(extractIdFromUrl('https://aws.amazon.com/jp/blogs/news/my-article///')).toBe('my-article');
  });
});

// ─────────────────────────────────────────────
// parseFeed
// ─────────────────────────────────────────────
describe('parseFeed', () => {
  describe('正常パース', () => {
    it('有効なRSSフィードXMLを渡すと FeedArticle[] が返る', async () => {
      mockFetch(200, VALID_RSS_XML);
      const articles = await parseFeed(ALLOWED_FEED_URL);

      expect(articles).toHaveLength(2);
      expect(articles[0].externalUrl).toBe('https://aws.amazon.com/jp/blogs/news/article-one/');
      expect(articles[0].id).toBe('article-one');
      expect(articles[1].externalUrl).toBe('https://aws.amazon.com/jp/blogs/news/article-two/');
      expect(articles[1].id).toBe('article-two');
    });

    it('結果が publishedAt 降順でソートされている', async () => {
      mockFetch(200, VALID_RSS_XML);
      const articles = await parseFeed(ALLOWED_FEED_URL);

      expect(articles[0].publishedAt).toBe('2025-07-01');
      expect(articles[1].publishedAt).toBe('2025-06-30');
      expect(articles[0].publishedAt >= articles[1].publishedAt).toBe(true);
    });
  });

  describe('pubDate変換', () => {
    it('RFC 2822形式の日付が YYYY-MM-DD に変換される', async () => {
      mockFetch(200, VALID_RSS_XML);
      const articles = await parseFeed(ALLOWED_FEED_URL);

      // "Tue, 01 Jul 2025 00:00:00 +0000" → "2025-07-01"
      expect(articles[0].publishedAt).toBe('2025-07-01');
      // "Mon, 30 Jun 2025 00:00:00 +0000" → "2025-06-30"
      expect(articles[1].publishedAt).toBe('2025-06-30');
    });
  });

  describe('空フィード', () => {
    it('<item> が存在しないRSSフィードを渡すと空配列が返る', async () => {
      mockFetch(200, EMPTY_RSS_XML);
      const articles = await parseFeed(ALLOWED_FEED_URL);

      expect(articles).toEqual([]);
    });
  });

  describe('不正XML', () => {
    it('不正なXML文字列を渡すと例外がスローされる', async () => {
      mockFetch(200, INVALID_XML);
      await expect(parseFeed(ALLOWED_FEED_URL)).rejects.toThrow();
    });
  });

  describe('非200レスポンス', () => {
    it('fetchが404を返すと例外がスローされる', async () => {
      mockFetch(404, 'Not Found');
      await expect(parseFeed(ALLOWED_FEED_URL)).rejects.toThrow(
        /HTTP 404/,
      );
    });

    it('fetchが500を返すと例外がスローされる', async () => {
      mockFetch(500, 'Internal Server Error');
      await expect(parseFeed(ALLOWED_FEED_URL)).rejects.toThrow(
        /HTTP 500/,
      );
    });
  });

  describe('SSRF対策: 許可されていないオリジンは拒否される', () => {
    it('https://example.com は拒否される', async () => {
      await expect(parseFeed('https://example.com/feed.rss')).rejects.toThrow(
        /feedUrl origin not allowed/,
      );
    });

    it('http://aws.amazon.com（HTTP）は拒否される', async () => {
      await expect(parseFeed('http://aws.amazon.com/feed.rss')).rejects.toThrow(
        /feedUrl origin not allowed/,
      );
    });

    it('不正なURLは拒否される', async () => {
      await expect(parseFeed('not-a-url')).rejects.toThrow(/Invalid feedUrl/);
    });
  });
});

// ─────────────────────────────────────────────
// Property 1: パース結果は常に publishedAt 降順
// Validates: Requirements 2.5
// ─────────────────────────────────────────────
describe('Property 1: パース結果は常に publishedAt 降順', () => {
  it('複数件の記事が publishedAt 降順でソートされている', async () => {
    const patterns = [
      // パターン1: 3件・日付がバラバラな順序
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <item><link>https://aws.amazon.com/jp/blogs/news/article-b/</link><pubDate>Mon, 30 Jun 2025 00:00:00 +0000</pubDate></item>
  <item><link>https://aws.amazon.com/jp/blogs/news/article-a/</link><pubDate>Tue, 01 Jul 2025 00:00:00 +0000</pubDate></item>
  <item><link>https://aws.amazon.com/jp/blogs/news/article-c/</link><pubDate>Wed, 01 Jan 2025 00:00:00 +0000</pubDate></item>
</channel></rss>`,
      // パターン2: 5件・昇順で並んでいる
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <item><link>https://aws.amazon.com/jp/blogs/news/art-1/</link><pubDate>Wed, 01 Jan 2025 00:00:00 +0000</pubDate></item>
  <item><link>https://aws.amazon.com/jp/blogs/news/art-2/</link><pubDate>Thu, 15 Feb 2024 00:00:00 +0000</pubDate></item>
  <item><link>https://aws.amazon.com/jp/blogs/news/art-3/</link><pubDate>Fri, 31 Dec 2021 00:00:00 +0000</pubDate></item>
  <item><link>https://aws.amazon.com/jp/blogs/news/art-4/</link><pubDate>Mon, 30 Jun 2025 00:00:00 +0000</pubDate></item>
  <item><link>https://aws.amazon.com/jp/blogs/news/art-5/</link><pubDate>Tue, 01 Jul 2025 00:00:00 +0000</pubDate></item>
</channel></rss>`,
      // パターン3: 2件・同じ日付
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <item><link>https://aws.amazon.com/jp/blogs/news/same-a/</link><pubDate>Tue, 01 Jul 2025 00:00:00 +0000</pubDate></item>
  <item><link>https://aws.amazon.com/jp/blogs/news/same-b/</link><pubDate>Tue, 01 Jul 2025 00:00:00 +0000</pubDate></item>
</channel></rss>`,
    ];

    for (const xml of patterns) {
      mockFetch(200, xml);
      const articles = await parseFeed(ALLOWED_FEED_URL);
      for (let i = 0; i < articles.length - 1; i++) {
        expect(articles[i].publishedAt >= articles[i + 1].publishedAt).toBe(true);
      }
    }
  });
});

// ─────────────────────────────────────────────
// Property 2: 日付変換は常に YYYY-MM-DD 形式
// Validates: Requirements 2.3, 8.2
// ─────────────────────────────────────────────
describe('Property 2: 日付変換は常に YYYY-MM-DD 形式', () => {
  it('様々なRFC 2822日付が正しく YYYY-MM-DD に変換される', async () => {
    const patterns: Array<{ pubDate: string; expected: string }> = [
      { pubDate: 'Tue, 01 Jul 2025 00:00:00 +0000', expected: '2025-07-01' },
      { pubDate: 'Mon, 30 Jun 2025 12:34:56 +0000', expected: '2025-06-30' },
      { pubDate: 'Wed, 01 Jan 2025 00:00:00 +0000', expected: '2025-01-01' },
      { pubDate: 'Fri, 31 Dec 2021 23:59:59 +0000', expected: '2021-12-31' },
      { pubDate: 'Thu, 15 Feb 2024 08:00:00 +0000', expected: '2024-02-15' },
    ];

    for (const { pubDate, expected } of patterns) {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <item><link>https://aws.amazon.com/jp/blogs/news/test-article/</link><pubDate>${pubDate}</pubDate></item>
</channel></rss>`;
      mockFetch(200, xml);
      const articles = await parseFeed(ALLOWED_FEED_URL);
      expect(articles).toHaveLength(1);
      expect(articles[0].publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(articles[0].publishedAt).toBe(expected);
    }
  });
});

// ─────────────────────────────────────────────
// Property 3: IDスラッグは常に英数字・ハイフンのみ
// Validates: Requirements 2.4, 8.3
// ─────────────────────────────────────────────
describe('Property 3: IDスラッグは常に英数字・ハイフンのみ', () => {
  it('様々なURLから生成されるスラッグが /^[a-z0-9-]+$/i にマッチする', () => {
    const urls = [
      'https://aws.amazon.com/jp/blogs/news/my-article/',
      'https://aws.amazon.com/jp/blogs/news/aws-lambda-update/',
      'https://aws.amazon.com/jp/blogs/news/article123/',
      'https://aws.amazon.com/jp/blogs/news/some-long-article-title-2025/',
      'https://aws.amazon.com/jp/blogs/news/a/',
    ];

    for (const url of urls) {
      const slug = extractIdFromUrl(url);
      expect(slug.length).toBeGreaterThan(0);
      expect(slug).toMatch(/^[a-z0-9-]+$/i);
    }
  });
});

// ─────────────────────────────────────────────
// Property 10: URLバリデーションの網羅性
// Validates: Requirements 8.1
// ─────────────────────────────────────────────
describe('Property 10: URLバリデーションの網羅性', () => {
  it('プレフィックスが正しいURLのみが結果に含まれる', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <item><link>https://aws.amazon.com/jp/blogs/news/valid-article/</link><pubDate>Tue, 01 Jul 2025 00:00:00 +0000</pubDate></item>
  <item><link>https://example.com/article/</link><pubDate>Tue, 01 Jul 2025 00:00:00 +0000</pubDate></item>
  <item><link>https://aws.amazon.com/blogs/news/article/</link><pubDate>Tue, 01 Jul 2025 00:00:00 +0000</pubDate></item>
  <item><link>http://aws.amazon.com/jp/blogs/news/article/</link><pubDate>Tue, 01 Jul 2025 00:00:00 +0000</pubDate></item>
  <item><link>https://aws.amazon.com/jp/blogs/compute/article/</link><pubDate>Tue, 01 Jul 2025 00:00:00 +0000</pubDate></item>
</channel></rss>`;

    mockFetch(200, xml);
    const articles = await parseFeed(ALLOWED_FEED_URL);

    // 正しいプレフィックスのURLのみが含まれる
    expect(articles).toHaveLength(1);
    expect(articles[0].externalUrl).toBe('https://aws.amazon.com/jp/blogs/news/valid-article/');

    // 不正なURLが含まれていないことを確認
    const invalidUrls = [
      'https://example.com/article/',
      'https://aws.amazon.com/blogs/news/article/',
      'http://aws.amazon.com/jp/blogs/news/article/',
      'https://aws.amazon.com/jp/blogs/compute/article/',
    ];
    for (const url of invalidUrls) {
      expect(articles.some(a => a.externalUrl === url)).toBe(false);
    }
  });

  it('不正なプレフィックスのURLはすべてスキップされる', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <item><link>https://example.com/article/</link><pubDate>Tue, 01 Jul 2025 00:00:00 +0000</pubDate></item>
  <item><link>https://aws.amazon.com/blogs/news/article/</link><pubDate>Tue, 01 Jul 2025 00:00:00 +0000</pubDate></item>
  <item><link>http://aws.amazon.com/jp/blogs/news/article/</link><pubDate>Tue, 01 Jul 2025 00:00:00 +0000</pubDate></item>
  <item><link>https://aws.amazon.com/jp/blogs/compute/article/</link><pubDate>Tue, 01 Jul 2025 00:00:00 +0000</pubDate></item>
</channel></rss>`;

    mockFetch(200, xml);
    const articles = await parseFeed(ALLOWED_FEED_URL);
    expect(articles).toEqual([]);
  });
});
