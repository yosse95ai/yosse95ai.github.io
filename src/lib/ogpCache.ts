import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { OgpData } from './fetchOgp';
import { formatErrorForLog, sanitizeForLog } from './sanitize';

/** OGPキャッシュファイル（リポジトリにコミットしてビルド間で共有する） */
export const OGP_CACHE_PATH = join('src', 'data', 'blog', 'ogp-cache.json');

export type OgpCache = Record<string, OgpData>;

/** 相対パスはプロジェクトルート（ビルド実行時のcwd）基準で解決する */
function resolveCachePath(path: string): string {
  return resolve(process.cwd(), path);
}

function isOgpData(value: unknown): value is OgpData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.title === 'string' &&
    typeof v.description === 'string' &&
    typeof v.ogpImage === 'string' &&
    (typeof v.publishedAt === 'string' || v.publishedAt === null)
  );
}

/**
 * 前回ビルド時に取得できたOGPデータを読み込む。
 * ファイルが無い・壊れている場合は空オブジェクトを返す（ビルドは止めない）。
 */
export function loadOgpCache(path: string = OGP_CACHE_PATH): OgpCache {
  const fullPath = resolveCachePath(path);
  if (!existsSync(fullPath)) return {};

  try {
    const parsed: unknown = JSON.parse(readFileSync(fullPath, 'utf-8'));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      console.warn(`[ogpCache] 不正な形式のキャッシュを無視します: ${sanitizeForLog(path)}`);
      return {};
    }

    const cache: OgpCache = {};
    for (const [url, data] of Object.entries(parsed as Record<string, unknown>)) {
      if (isOgpData(data)) cache[url] = data;
    }
    return cache;
  } catch (err) {
    console.warn(
      `[ogpCache] キャッシュの読み込みに失敗しました: ${sanitizeForLog(path)}: ${formatErrorForLog(err)}`,
    );
    return {};
  }
}

/**
 * 取得できたOGPデータをディスクへ保存する。
 * 差分のみ書き込むため、キーはURL昇順で安定ソートする。
 */
export function saveOgpCache(cache: OgpCache, path: string = OGP_CACHE_PATH): void {
  const fullPath = resolveCachePath(path);

  const sorted: OgpCache = {};
  for (const url of Object.keys(cache).sort()) {
    sorted[url] = cache[url]!;
  }

  try {
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
  } catch (err) {
    // キャッシュ保存の失敗はビルドを止める理由にならない
    console.warn(
      `[ogpCache] キャッシュの保存に失敗しました: ${sanitizeForLog(path)}: ${formatErrorForLog(err)}`,
    );
  }
}
