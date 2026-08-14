import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchOgp, clearCache } from '../lib/fetchOgp';

const mockHtml = (title: string, description: string, image: string, publishedAt?: string) => `
<html>
  <head>
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    ${publishedAt ? `<meta property="article:published_time" content="${publishedAt}" />` : ''}
  </head>
</html>
`;

beforeEach(() => {
  clearCache();
  vi.restoreAllMocks();
});

describe('fetchOgp', () => {
  it('OGPメタタグを正常に取得できる', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockHtml('テストタイトル', 'テスト説明文', 'https://example.com/image.png', '2025-06-01T10:00:00+09:00'),
    }));

    const result = await fetchOgp('https://example.com/article');

    expect(result.title).toBe('テストタイトル');
    expect(result.description).toBe('テスト説明文');
    expect(result.ogpImage).toBe('https://example.com/image.png');
    expect(result.publishedAt).toBe('2025-06-01T10:00:00+09:00');
  });

  it('article:published_time がない場合は publishedAt が null になる', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockHtml('タイトル', '説明', ''),
    }));

    const result = await fetchOgp('https://example.com/no-date');

    expect(result.publishedAt).toBeNull();
  });

  it('fetchが失敗した場合にfallbackを返す', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }));

    const url = 'https://example.com/not-found';
    const result = await fetchOgp(url);

    expect(result.title).toBe(url);
    expect(result.description).toBe('');
    expect(result.ogpImage).toBe('');
  });

  it('fetchが例外を投げた場合にfallbackを返す', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const url = 'https://example.com/error';
    const result = await fetchOgp(url);

    expect(result.title).toBe(url);
    expect(result.description).toBe('');
  });

  it('同一URLへの2回目のfetchはキャッシュから返す', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockHtml('キャッシュテスト', '説明', 'https://example.com/img.png'),
    });
    vi.stubGlobal('fetch', mockFetch);

    const url = 'https://example.com/cached';
    await fetchOgp(url);
    await fetchOgp(url);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('一時的なエラー（503）はリトライして成功結果を返す', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml('リトライ成功', '説明', 'https://example.com/retry.png'),
      });
    vi.stubGlobal('fetch', mockFetch);

    const result = await fetchOgp('https://example.com/flaky');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.ogpImage).toBe('https://example.com/retry.png');
  });

  it('404はリトライせず即座にfallbackを返す', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal('fetch', mockFetch);

    await fetchOgp('https://example.com/gone');

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('同時実行数を制限する', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight--;
        return { ok: true, text: async () => mockHtml('t', 'd', 'https://example.com/i.png') };
      }),
    );

    const urls = Array.from({ length: 20 }, (_, i) => `https://example.com/parallel-${i}`);
    await Promise.all(urls.map((u) => fetchOgp(u)));

    expect(maxInFlight).toBeLessThanOrEqual(4);
  });

  it('同一URLへの同時リクエストはfetchを1回に集約する', async () => {
    const mockFetch = vi.fn().mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 5));
      return { ok: true, text: async () => mockHtml('t', 'd', 'https://example.com/i.png') };
    });
    vi.stubGlobal('fetch', mockFetch);

    const url = 'https://example.com/concurrent';
    await Promise.all([fetchOgp(url), fetchOgp(url), fetchOgp(url)]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('HTMLエンティティをデコードする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockHtml('タイトル &amp; サブタイトル', '説明 &lt;test&gt;', ''),
    }));

    const result = await fetchOgp('https://example.com/entities');

    expect(result.title).toBe('タイトル & サブタイトル');
    expect(result.description).toBe('説明 <test>');
  });
});
