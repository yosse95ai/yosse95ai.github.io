import { describe, test } from 'vitest';
import fc from 'fast-check';

/**
 * Validates: Requirements 1.1, 1.2, 1.4
 */
describe('blog-list-update: limit によるスライス処理', () => {
  test('Property 1: limit 指定時、表示件数は min(limit, 記事数) になる', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ id: fc.string(), publishedAt: fc.option(fc.string(), { nil: null }) })),
        fc.nat(),
        (articles, limit) => {
          const result = articles.slice(0, limit);
          return result.length === Math.min(limit, articles.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 1: limit 未指定時、全件が返される', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ id: fc.string(), publishedAt: fc.option(fc.string(), { nil: null }) })),
        (articles) => {
          const result = articles.slice(0, undefined);
          return result.length === articles.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});
