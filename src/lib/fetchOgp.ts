export interface OgpData {
  title: string;
  description: string;
  ogpImage: string;
}

const cache = new Map<string, OgpData>();

/** テスト用キャッシュクリア */
export function clearCache(): void {
  cache.clear();
}

/**
 * 指定URLのOGPメタタグをビルド時にfetchして返す
 */
export async function fetchOgp(url: string): Promise<OgpData> {
  if (cache.has(url)) {
    return cache.get(url)!;
  }

  const fallback: OgpData = { title: url, description: '', ogpImage: '' };

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OGP-fetcher/1.0)' },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[fetchOgp] Failed to fetch ${url}: ${res.status}`);
      return fallback;
    }

    const html = await res.text();
    const data: OgpData = {
      title: extractMeta(html, 'og:title') ?? extractTag(html, 'title') ?? url,
      description: extractMeta(html, 'og:description') ?? extractMeta(html, 'description') ?? '',
      ogpImage: extractMeta(html, 'og:image') ?? '',
    };

    cache.set(url, data);
    return data;
  } catch (err) {
    console.warn(`[fetchOgp] Error fetching ${url}:`, err);
    return fallback;
  }
}

/** <meta property="og:xxx" content="..."> または <meta name="xxx" content="..."> を抽出 */
function extractMeta(html: string, key: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeHtmlEntities(m[1]);
  }
  return undefined;
}

/** <title>...</title> を抽出 */
function extractTag(html: string, tag: string): string | undefined {
  const m = html.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i'));
  return m?.[1] ? decodeHtmlEntities(m[1].trim()) : undefined;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}
