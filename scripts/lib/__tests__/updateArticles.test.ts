import { describe, it, expect } from 'vitest';
import { mergeAndSort } from '../updateArticles.js';
import type { ArticleEntry } from '../types.js';

// Property 8: マージ後のソート安定性
// Validates: Requirements 5.1, 5.3
describe('Property 8: マージ後のソート安定性', () => {
  it('マージ結果は publishedAt 降順でソートされ、publishedAt なし記事は末尾に配置される', () => {
    const patterns: Array<{ existing: ArticleEntry[]; newArticles: ArticleEntry[] }> = [
      {
        existing: [
          { id: 'a', externalUrl: 'https://example.com/a', publishedAt: '2025-01-01' },
          { id: 'b', externalUrl: 'https://example.com/b', publishedAt: '2025-06-01' },
        ],
        newArticles: [{ id: 'c', externalUrl: 'https://example.com/c', publishedAt: '2025-03-01' }],
      },
      {
        existing: [
          { id: 'x', externalUrl: 'https://example.com/x' },
          { id: 'y', externalUrl: 'https://example.com/y', publishedAt: '2025-05-01' },
        ],
        newArticles: [{ id: 'z', externalUrl: 'https://example.com/z', publishedAt: '2025-07-01' }],
      },
      {
        existing: [{ id: 'p', externalUrl: 'https://example.com/p' }],
        newArticles: [{ id: 'q', externalUrl: 'https://example.com/q' }],
      },
      {
        existing: [],
        newArticles: [
          { id: 'n1', externalUrl: 'https://example.com/n1', publishedAt: '2025-07-01' },
          { id: 'n2', externalUrl: 'https://example.com/n2', publishedAt: '2025-01-01' },
          { id: 'n3', externalUrl: 'https://example.com/n3' },
        ],
      },
      {
        existing: [
          { id: 'e1', externalUrl: 'https://example.com/e1', publishedAt: '2025-07-01' },
          { id: 'e2', externalUrl: 'https://example.com/e2' },
        ],
        newArticles: [],
      },
    ];

    for (const { existing, newArticles } of patterns) {
      const result = mergeAndSort(existing, newArticles);
      const withDate = result.filter((a) => a.publishedAt !== undefined);
      const withoutDate = result.filter((a) => a.publishedAt === undefined);

      const withoutDateStartIndex = result.findIndex((a) => a.publishedAt === undefined);
      if (withoutDateStartIndex !== -1) {
        for (let i = withoutDateStartIndex; i < result.length; i++) {
          expect(result[i].publishedAt).toBeUndefined();
        }
        for (let i = 0; i < withoutDateStartIndex; i++) {
          expect(result[i].publishedAt).toBeDefined();
        }
      }

      for (let i = 0; i < withDate.length - 1; i++) {
        expect(withDate[i].publishedAt! >= withDate[i + 1].publishedAt!).toBe(true);
      }

      expect(withDate.length + withoutDate.length).toBe(result.length);
    }
  });
});

// Property 9: 重複排除の保証
// Validates: Requirements 5.2
describe('Property 9: 重複排除の保証', () => {
  it('マージ結果には同じ externalUrl を持つエントリーが1件のみ存在する', () => {
    const patterns: Array<{
      existing: ArticleEntry[];
      newArticles: ArticleEntry[];
      expectedUniqueCount: number;
    }> = [
      {
        existing: [
          { id: 'a', externalUrl: 'https://example.com/a', publishedAt: '2025-01-01' },
          { id: 'b', externalUrl: 'https://example.com/b', publishedAt: '2025-02-01' },
        ],
        newArticles: [
          { id: 'a-dup', externalUrl: 'https://example.com/a', publishedAt: '2025-01-01' },
          { id: 'c', externalUrl: 'https://example.com/c', publishedAt: '2025-03-01' },
        ],
        expectedUniqueCount: 3,
      },
      {
        existing: [],
        newArticles: [
          { id: 'x', externalUrl: 'https://example.com/x', publishedAt: '2025-01-01' },
          { id: 'x-dup', externalUrl: 'https://example.com/x', publishedAt: '2025-01-01' },
          { id: 'y', externalUrl: 'https://example.com/y', publishedAt: '2025-02-01' },
        ],
        expectedUniqueCount: 2,
      },
      {
        existing: [
          { id: 'p', externalUrl: 'https://example.com/p', publishedAt: '2025-01-01' },
          { id: 'p-dup', externalUrl: 'https://example.com/p', publishedAt: '2025-01-01' },
        ],
        newArticles: [{ id: 'q', externalUrl: 'https://example.com/q', publishedAt: '2025-02-01' }],
        expectedUniqueCount: 2,
      },
      {
        existing: [{ id: 'a2', externalUrl: 'https://example.com/a2', publishedAt: '2025-01-01' }],
        newArticles: [{ id: 'b2', externalUrl: 'https://example.com/b2', publishedAt: '2025-02-01' }],
        expectedUniqueCount: 2,
      },
    ];

    for (const { existing, newArticles, expectedUniqueCount } of patterns) {
      const result = mergeAndSort(existing, newArticles);
      const urls = result.map((a) => a.externalUrl);
      expect(urls.length).toBe(new Set(urls).size);
      expect(result.length).toBe(expectedUniqueCount);
    }
  });
});

// ユニットテスト
describe('mergeAndSort ユニットテスト', () => {
  it('ソート順: publishedAt 降順でソートされる', () => {
    const existing: ArticleEntry[] = [
      { id: 'old', externalUrl: 'https://example.com/old', publishedAt: '2025-01-01' },
    ];
    const newArticles: ArticleEntry[] = [
      { id: 'new', externalUrl: 'https://example.com/new', publishedAt: '2025-07-01' },
      { id: 'mid', externalUrl: 'https://example.com/mid', publishedAt: '2025-04-01' },
    ];
    const result = mergeAndSort(existing, newArticles);
    expect(result[0].publishedAt).toBe('2025-07-01');
    expect(result[1].publishedAt).toBe('2025-04-01');
    expect(result[2].publishedAt).toBe('2025-01-01');
  });

  it('重複排除: 同じ externalUrl を持つ記事は1件のみ残る', () => {
    const existing: ArticleEntry[] = [
      { id: 'article-a', externalUrl: 'https://example.com/a', publishedAt: '2025-01-01' },
      { id: 'article-b', externalUrl: 'https://example.com/b', publishedAt: '2025-02-01' },
    ];
    const newArticles: ArticleEntry[] = [
      { id: 'article-a-dup', externalUrl: 'https://example.com/a', publishedAt: '2025-01-01' },
      { id: 'article-c', externalUrl: 'https://example.com/c', publishedAt: '2025-03-01' },
    ];
    const result = mergeAndSort(existing, newArticles);
    const urls = result.map((a) => a.externalUrl);
    expect(urls).toHaveLength(3);
    expect(new Set(urls).size).toBe(3);
    expect(urls).toContain('https://example.com/a');
    expect(urls).toContain('https://example.com/b');
    expect(urls).toContain('https://example.com/c');
  });

  it('publishedAt なし記事は末尾に配置される', () => {
    const existing: ArticleEntry[] = [
      { id: 'no-date', externalUrl: 'https://example.com/no-date' },
    ];
    const newArticles: ArticleEntry[] = [
      { id: 'with-date', externalUrl: 'https://example.com/with-date', publishedAt: '2025-07-01' },
    ];
    const result = mergeAndSort(existing, newArticles);
    expect(result[0].externalUrl).toBe('https://example.com/with-date');
    expect(result[1].externalUrl).toBe('https://example.com/no-date');
    expect(result[1].publishedAt).toBeUndefined();
  });

  it('既存リストが空の場合、新規記事のみがソートされて返る', () => {
    const newArticles: ArticleEntry[] = [
      { id: 'b', externalUrl: 'https://example.com/b', publishedAt: '2025-01-01' },
      { id: 'a', externalUrl: 'https://example.com/a', publishedAt: '2025-06-01' },
    ];
    const result = mergeAndSort([], newArticles);
    expect(result).toHaveLength(2);
    expect(result[0].publishedAt).toBe('2025-06-01');
    expect(result[1].publishedAt).toBe('2025-01-01');
  });

  it('新規記事が空の場合、既存リストがそのままソートされて返る', () => {
    const existing: ArticleEntry[] = [
      { id: 'b', externalUrl: 'https://example.com/b', publishedAt: '2025-01-01' },
      { id: 'a', externalUrl: 'https://example.com/a', publishedAt: '2025-06-01' },
    ];
    const result = mergeAndSort(existing, []);
    expect(result).toHaveLength(2);
    expect(result[0].publishedAt).toBe('2025-06-01');
    expect(result[1].publishedAt).toBe('2025-01-01');
  });

  it('両方空の場合、空配列が返る', () => {
    expect(mergeAndSort([], [])).toHaveLength(0);
  });

  it('publishedAt なし記事が複数ある場合、すべて末尾に配置される', () => {
    const existing: ArticleEntry[] = [
      { id: 'no-date-1', externalUrl: 'https://example.com/no-date-1' },
    ];
    const newArticles: ArticleEntry[] = [
      { id: 'with-date', externalUrl: 'https://example.com/with-date', publishedAt: '2025-07-01' },
      { id: 'no-date-2', externalUrl: 'https://example.com/no-date-2' },
    ];
    const result = mergeAndSort(existing, newArticles);
    expect(result[0].publishedAt).toBe('2025-07-01');
    expect(result[1].publishedAt).toBeUndefined();
    expect(result[2].publishedAt).toBeUndefined();
  });
});
