import { describe, it, expect } from 'vitest';
import { sanitizeForLog } from '../sanitize.js';

describe('sanitizeForLog', () => {
  it('改行文字をスペースに置換する', () => {
    expect(sanitizeForLog('line1\nline2')).toBe('line1 line2');
  });

  it('キャリッジリターンをスペースに置換する', () => {
    expect(sanitizeForLog('line1\rline2')).toBe('line1 line2');
  });

  it('CR+LFをスペース2つに置換する', () => {
    expect(sanitizeForLog('line1\r\nline2')).toBe('line1  line2');
  });

  it('制御文字を除去する', () => {
    expect(sanitizeForLog('hello\x00world')).toBe('helloworld');
    expect(sanitizeForLog('hello\x1Fworld')).toBe('helloworld');
  });

  it('通常の文字列はそのまま返す', () => {
    expect(sanitizeForLog('https://aws.amazon.com/jp/blogs/news/article/')).toBe(
      'https://aws.amazon.com/jp/blogs/news/article/',
    );
  });

  it('空文字列はそのまま返す', () => {
    expect(sanitizeForLog('')).toBe('');
  });

  it('Log Injection攻撃パターンを無害化する', () => {
    const malicious = 'normal\nINFO: injected log entry\noriginal';
    const result = sanitizeForLog(malicious);
    expect(result).not.toContain('\n');
    expect(result).toBe('normal INFO: injected log entry original');
  });
});
