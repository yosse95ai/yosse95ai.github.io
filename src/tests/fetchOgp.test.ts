import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchOgp, clearCache } from '../lib/fetchOgp';

const mockHtml = (title: string, description: string, image: string) => `
<html>
  <head>
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
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
      text: async () => mockHtml('テストタイトル', 'テスト説明文', 'https://example.com/image.png'),
    }));

    const result = await fetchOgp('https://example.com/article');

    expect(result.title).toBe('テストタイトル');
    expect(result.description).toBe('テスト説明文');
    expect(result.ogpImage).toBe('https://example.com/image.png');
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
