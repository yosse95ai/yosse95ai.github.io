import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadOgpCache, saveOgpCache } from '../lib/ogpCache';

const tempDirs: string[] = [];

function tempCachePath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ogp-cache-'));
  tempDirs.push(dir);
  return join(dir, 'ogp-cache.json');
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe('ogpCache', () => {
  it('保存したキャッシュを読み戻せる', () => {
    const path = tempCachePath();
    const entry = {
      title: 'タイトル',
      description: '説明',
      ogpImage: 'https://example.com/img.png',
      publishedAt: '2026-01-01',
    };

    saveOgpCache({ 'https://example.com/a': entry }, path);

    expect(loadOgpCache(path)).toEqual({ 'https://example.com/a': entry });
  });

  it('URL昇順で安定した順序で書き出す', () => {
    const path = tempCachePath();
    const entry = { title: 't', description: '', ogpImage: '', publishedAt: null };

    saveOgpCache({ 'https://example.com/b': entry, 'https://example.com/a': entry }, path);

    expect(Object.keys(loadOgpCache(path))).toEqual([
      'https://example.com/a',
      'https://example.com/b',
    ]);
  });

  it('ファイルが存在しない場合は空オブジェクトを返す', () => {
    expect(loadOgpCache(join(tmpdir(), 'no-such-ogp-cache-file.json'))).toEqual({});
  });

  it('壊れたJSONの場合は空オブジェクトを返す', () => {
    const path = tempCachePath();
    writeFileSync(path, '{ broken', 'utf-8');

    expect(loadOgpCache(path)).toEqual({});
  });

  it('スキーマに合わないエントリーは無視する', () => {
    const path = tempCachePath();
    const valid = { title: 't', description: 'd', ogpImage: 'i', publishedAt: null };
    writeFileSync(
      path,
      JSON.stringify({
        'https://example.com/valid': valid,
        'https://example.com/invalid': { title: 't' },
      }),
      'utf-8',
    );

    expect(loadOgpCache(path)).toEqual({ 'https://example.com/valid': valid });
  });
});
