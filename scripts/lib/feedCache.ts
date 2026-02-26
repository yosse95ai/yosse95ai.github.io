import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve, normalize } from 'path';
import { sanitizeForLog } from './sanitize.js';

/**
 * Path Traversal (CWE-22) 対策: パスが許可ディレクトリ配下にあることを検証する
 */
function validatePath(filePath: string, allowedDir: string): void {
  const resolvedPath = resolve(filePath);
  const resolvedAllowed = resolve(allowedDir);
  if (!resolvedPath.startsWith(resolvedAllowed + '/') && resolvedPath !== resolvedAllowed) {
    throw new Error(`Path traversal detected: ${sanitizeForLog(normalize(filePath))}`);
  }
}

/**
 * 前回のRSSフィードXMLキャッシュを読み込む
 * @param cachePath - キャッシュファイルのパス（src/data/blog/ 配下のみ許可）
 * @returns キャッシュXML文字列（存在しない場合はnull）
 */
export function loadCache(cachePath: string): string | null {
  validatePath(cachePath, 'src/data/blog');

  if (!existsSync(cachePath)) {
    return null;
  }

  try {
    const content = readFileSync(cachePath, 'utf-8');
    if (content.trim() === '') {
      console.warn(`[feedCache] キャッシュファイルが空です: ${sanitizeForLog(cachePath)}`);
      return null;
    }
    return content;
  } catch (err) {
    console.warn(`[feedCache] キャッシュファイルの読み込みに失敗しました: ${sanitizeForLog(cachePath)}`, err);
    return null;
  }
}

/**
 * 今回取得したRSSフィードXMLをキャッシュとして保存する
 * @param cachePath - キャッシュファイルのパス（src/data/blog/ 配下のみ許可）
 * @param xmlContent - 保存するXML文字列
 */
export function saveCache(cachePath: string, xmlContent: string): void {
  validatePath(cachePath, 'src/data/blog');

  const dir = dirname(cachePath);
  mkdirSync(dir, { recursive: true });

  try {
    writeFileSync(cachePath, xmlContent, 'utf-8');
  } catch (err) {
    console.error(`[feedCache] キャッシュファイルの書き込みに失敗しました: ${sanitizeForLog(cachePath)}`, err);
    throw err;
  }
}
