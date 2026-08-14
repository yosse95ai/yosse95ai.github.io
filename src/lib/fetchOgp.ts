import { loadOgpCache, saveOgpCache, type OgpCache } from './ogpCache';

export interface OgpData {
  title: string;
  description: string;
  ogpImage: string;
  publishedAt: string | null;
}

/**
 * 外部サイト（aws.amazon.com など）はビルド時の同時大量アクセスで
 * スロットリングされることがあるため、同時実行数を制限する。
 */
const MAX_CONCURRENCY = toPositiveInt(process.env.OGP_CONCURRENCY, 4);
/** 1URLあたりの最大試行回数（初回 + リトライ） */
const MAX_ATTEMPTS = toPositiveInt(process.env.OGP_MAX_ATTEMPTS, 3);
/** リトライ待機のベース時間（指数バックオフ） */
const RETRY_BASE_DELAY_MS = toPositiveInt(process.env.OGP_RETRY_BASE_DELAY_MS, isTestEnv() ? 1 : 700);
const REQUEST_TIMEOUT_MS = toPositiveInt(process.env.OGP_TIMEOUT_MS, 15000);

/** 一時的な障害としてリトライ対象にするHTTPステータス */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504, 509, 520, 521, 522, 523, 524]);

/** ディスクキャッシュ（テスト時は副作用を避けるため無効化） */
const DISK_CACHE_ENABLED = !isTestEnv() && process.env.OGP_DISK_CACHE !== 'off';

const memoryCache = new Map<string, OgpData>();
const inFlight = new Map<string, Promise<OgpData>>();

let diskCache: OgpCache | null = null;
let diskCacheDirty = false;

/** テスト用キャッシュクリア */
export function clearCache(): void {
  memoryCache.clear();
  inFlight.clear();
}

/** ディスクキャッシュを明示的に書き出す（スクリプトからの利用を想定） */
export function flushOgpCache(): void {
  if (diskCache && diskCacheDirty) {
    saveOgpCache(diskCache);
    diskCacheDirty = false;
  }
}

/**
 * 指定URLのOGPメタタグをビルド時にfetchして返す。
 *
 * 取得に失敗した場合は
 *   1. 前回ビルドで成功したディスクキャッシュ
 *   2. URLのみのフォールバック
 * の順に代替値を返すため、一時的なネットワーク障害で画像が消えることはない。
 */
export async function fetchOgp(url: string): Promise<OgpData> {
  const cached = memoryCache.get(url);
  if (cached) return cached;

  const pending = inFlight.get(url);
  if (pending) return pending;

  const task = resolveOgp(url);
  inFlight.set(url, task);
  try {
    return await task;
  } finally {
    inFlight.delete(url);
  }
}

async function resolveOgp(url: string): Promise<OgpData> {
  const fetched = await fetchWithRetry(url);

  if (fetched) {
    memoryCache.set(url, fetched);
    rememberOnDisk(url, fetched);
    return fetched;
  }

  const stale = readFromDisk(url);
  if (stale) {
    console.warn(`[fetchOgp] Falling back to cached OGP data for ${url}`);
    memoryCache.set(url, stale);
    return stale;
  }

  const fallback: OgpData = { title: url, description: '', ogpImage: '', publishedAt: null };
  // 同一ビルド内で他ページから再試行しないようフォールバックもメモリに保持する
  memoryCache.set(url, fallback);
  return fallback;
}

/** リトライ付きでOGPを取得する。全試行が失敗した場合のみ null を返す */
async function fetchWithRetry(url: string): Promise<OgpData | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const isLastAttempt = attempt === MAX_ATTEMPTS;

    try {
      const html = await withConcurrencyLimit(async () => {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; OGP-fetcher/1.0)',
            Accept: 'text/html,application/xhtml+xml',
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!res.ok) {
          throw new HttpError(res.status);
        }
        return res.text();
      });

      return parseOgp(html, url);
    } catch (err) {
      const retryable = !(err instanceof HttpError) || RETRYABLE_STATUS.has(err.status);

      if (retryable && !isLastAttempt) {
        const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * 100);
        console.warn(
          `[fetchOgp] Retrying ${url} (attempt ${attempt + 1}/${MAX_ATTEMPTS}) after ${delay}ms:`,
          describeError(err),
        );
        await sleep(delay);
        continue;
      }

      console.warn(`[fetchOgp] Failed to fetch ${url}:`, describeError(err));
      return null;
    }
  }

  return null;
}

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
  }
}

function describeError(err: unknown): string {
  if (err instanceof HttpError) return err.message;
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}

function parseOgp(html: string, url: string): OgpData {
  return {
    title: extractMeta(html, 'og:title') ?? extractTag(html, 'title') ?? url,
    description: extractMeta(html, 'og:description') ?? extractMeta(html, 'description') ?? '',
    ogpImage: extractMeta(html, 'og:image') ?? extractMeta(html, 'twitter:image') ?? '',
    publishedAt: extractMeta(html, 'article:published_time') ?? null,
  };
}

/* ------------------------------ 同時実行制御 ------------------------------ */

let activeRequests = 0;
const waiters: (() => void)[] = [];

async function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  await acquireSlot();
  try {
    return await fn();
  } finally {
    releaseSlot();
  }
}

function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENCY) {
    activeRequests++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => waiters.push(resolve));
}

function releaseSlot(): void {
  const next = waiters.shift();
  if (next) {
    // スロットを待機中のタスクへそのまま引き渡す（activeRequests は変えない）
    next();
  } else {
    activeRequests--;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------ ディスクキャッシュ ------------------------------ */

function getDiskCache(): OgpCache | null {
  if (!DISK_CACHE_ENABLED) return null;
  diskCache ??= loadOgpCache();
  return diskCache;
}

function readFromDisk(url: string): OgpData | undefined {
  return getDiskCache()?.[url];
}

function rememberOnDisk(url: string, data: OgpData): void {
  const cache = getDiskCache();
  if (!cache) return;

  const previous = cache[url];
  if (previous && JSON.stringify(previous) === JSON.stringify(data)) return;

  cache[url] = data;
  scheduleDiskFlush();
}

function scheduleDiskFlush(): void {
  if (diskCacheDirty) return;
  diskCacheDirty = true;
  // ビルド終了時に一度だけ書き出す
  process.once('exit', () => {
    if (diskCache) saveOgpCache(diskCache);
  });
}

/* ------------------------------ HTML パース ------------------------------ */

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

/* ------------------------------ 環境設定 ------------------------------ */

function isTestEnv(): boolean {
  return Boolean(process.env.VITEST);
}

function toPositiveInt(value: string | undefined, defaultValue: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : defaultValue;
}
