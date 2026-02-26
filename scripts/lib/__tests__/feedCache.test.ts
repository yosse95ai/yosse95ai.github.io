import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadCache, saveCache } from '../feedCache.js';

// fs モジュールをモック
vi.mock('fs');

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockMkdirSync = vi.mocked(mkdirSync);

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────
// Property 4: キャッシュのラウンドトリップ
// Validates: Requirements 3.1, 3.4
// ─────────────────────────────────────────────
describe('Property 4: キャッシュのラウンドトリップ', () => {
  it('saveCache で保存した内容を loadCache で読み込むと元の文字列が返される', () => {
    const patterns = [
      // パターン1: 通常のRSSフィードXML
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item><link>https://aws.amazon.com/jp/blogs/news/article-one/</link></item>
  </channel>
</rss>`,
      // パターン2: 複数記事を含むXML
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item><link>https://aws.amazon.com/jp/blogs/news/article-a/</link><pubDate>Tue, 01 Jul 2025 00:00:00 +0000</pubDate></item>
    <item><link>https://aws.amazon.com/jp/blogs/news/article-b/</link><pubDate>Mon, 30 Jun 2025 00:00:00 +0000</pubDate></item>
  </channel>
</rss>`,
      // パターン3: 最小限のXML
      `<?xml version="1.0"?><rss><channel></channel></rss>`,
    ];

    for (const xmlContent of patterns) {
      const cachePath = '/tmp/test-cache.xml';
      let savedContent: string | undefined;

      // saveCache の書き込みをキャプチャ
      mockMkdirSync.mockReturnValue(undefined as unknown as ReturnType<typeof mkdirSync>);
      mockWriteFileSync.mockImplementation((_path, data) => {
        savedContent = data as string;
      });

      saveCache(cachePath, xmlContent);

      // loadCache でキャプチャした内容を返す
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(savedContent as unknown as ReturnType<typeof readFileSync>);

      const loaded = loadCache(cachePath);
      expect(loaded).toBe(xmlContent);
    }
  });
});

// ─────────────────────────────────────────────
// loadCache ユニットテスト
// ─────────────────────────────────────────────
describe('loadCache', () => {
  it('正常読み込み: ファイルが存在する場合、内容を返す', () => {
    const cachePath = '/tmp/cache.xml';
    const xmlContent = '<rss><channel></channel></rss>';

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(xmlContent as unknown as ReturnType<typeof readFileSync>);

    const result = loadCache(cachePath);
    expect(result).toBe(xmlContent);
    expect(mockReadFileSync).toHaveBeenCalledWith(cachePath, 'utf-8');
  });

  it('ファイル未存在時の null 返却: ファイルが存在しない場合、null を返す', () => {
    mockExistsSync.mockReturnValue(false);

    const result = loadCache('/tmp/nonexistent.xml');
    expect(result).toBeNull();
    expect(mockReadFileSync).not.toHaveBeenCalled();
  });

  it('破損ファイル時の null 返却: 空ファイルの場合、null を返す', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('' as unknown as ReturnType<typeof readFileSync>);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = loadCache('/tmp/empty.xml');

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('読み込みエラー時に null を返し、console.warn を呼ぶ', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation(() => {
      throw new Error('Permission denied');
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = loadCache('/tmp/unreadable.xml');

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ─────────────────────────────────────────────
// saveCache ユニットテスト
// ─────────────────────────────────────────────
describe('saveCache', () => {
  it('正常保存: saveCache でファイルが正しく保存される', () => {
    const cachePath = '/tmp/subdir/cache.xml';
    const xmlContent = '<rss><channel></channel></rss>';

    mockMkdirSync.mockReturnValue(undefined as unknown as ReturnType<typeof mkdirSync>);
    mockWriteFileSync.mockImplementation(() => {});

    saveCache(cachePath, xmlContent);

    expect(mockMkdirSync).toHaveBeenCalledWith('/tmp/subdir', { recursive: true });
    expect(mockWriteFileSync).toHaveBeenCalledWith(cachePath, xmlContent, 'utf-8');
  });

  it('書き込みエラー時に console.error を呼び、例外を再スローする', () => {
    const cachePath = '/tmp/cache.xml';
    const writeError = new Error('Disk full');

    mockMkdirSync.mockReturnValue(undefined as unknown as ReturnType<typeof mkdirSync>);
    mockWriteFileSync.mockImplementation(() => {
      throw writeError;
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => saveCache(cachePath, '<rss/>')).toThrow(writeError);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
