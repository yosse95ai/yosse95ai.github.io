import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * 前回のRSSフィードXMLキャッシュを読み込む
 * @param cachePath - キャッシュファイルのパス
 * @returns キャッシュXML文字列（存在しない場合はnull）
 */
export function loadCache(cachePath: string): string | null {
  if (!existsSync(cachePath)) {
    return null;
  }

  try {
    const content = readFileSync(cachePath, 'utf-8');
    if (content.trim() === '') {
      console.warn(`[feedCache] キャッシュファイルが空です: ${cachePath}`);
      return null;
    }
    return content;
  } catch (err) {
    console.warn(`[feedCache] キャッシュファイルの読み込みに失敗しました: ${cachePath}`, err);
    return null;
  }
}

/**
 * 今回取得したRSSフィードXMLをキャッシュとして保存する
 * @param cachePath - キャッシュファイルのパス
 * @param xmlContent - 保存するXML文字列
 */
export function saveCache(cachePath: string, xmlContent: string): void {
  const dir = dirname(cachePath);
  mkdirSync(dir, { recursive: true });

  try {
    writeFileSync(cachePath, xmlContent, 'utf-8');
  } catch (err) {
    console.error(`[feedCache] キャッシュファイルの書き込みに失敗しました: ${cachePath}`, err);
    throw err;
  }
}
