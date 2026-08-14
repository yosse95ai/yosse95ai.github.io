import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isAllowedOgpUrl } from '../lib/fetchOgp';

describe('isAllowedOgpUrl (SSRF対策)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    'https://aws.amazon.com/jp/blogs/news/article/',
    'https://github.com/owner/repo/pull/1',
    'https://findy-tools.io/articles/aws-amplify-gen-2/40',
    'https://www.youtube.com/watch?v=xxxx',
    'https://youtu.be/xxxx',
  ])('アローリストのホストは許可する: %s', (url) => {
    expect(isAllowedOgpUrl(url)).toBe(true);
  });

  it('サブドメインも許可する', () => {
    expect(isAllowedOgpUrl('https://docs.aws.amazon.com/index.html')).toBe(true);
  });

  it.each([
    // 内部ネットワーク・メタデータエンドポイント
    'https://169.254.169.254/latest/meta-data/',
    'https://127.0.0.1/',
    'https://localhost/',
    'https://10.0.0.1/',
    // アローリスト外の外部サイト
    'https://evil.example.com/',
    // アローリストのホスト名を含むだけの別ドメイン
    'https://aws.amazon.com.evil.example.com/',
    // https以外のスキーム
    'http://aws.amazon.com/jp/blogs/news/article/',
    'file:///etc/passwd',
    // URLとして解釈できない値
    'not-a-url',
  ])('許可しない: %s', (url) => {
    expect(isAllowedOgpUrl(url)).toBe(false);
  });
});
