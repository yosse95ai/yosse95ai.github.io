# Design Document: blog-list-update

## Overview

ホーム画面のブログリストを最新 5 件に制限し「全てを見る」ボタンを追加する。
ヒストリーページにはブログ全件リストを追加し、ユーザーがすべての記事を一覧できるようにする。

### 変更スコープ

| ファイル | 変更内容 |
|---|---|
| `src/components/organisms/BlogList.astro` | `limit` prop 追加、スライス処理、レスポンシブグリッド対応、「全てを見る」ボタン |
| `src/pages/index.astro` | `<BlogList limit={5} />` に変更 |
| `src/pages/history.astro` | `id="blog"` ラッパー付きで `<BlogList />` を追加 |

---

## Architecture

### コンポーネント構成（変更後）

```
pages/
  index.astro          ← BlogList に limit={5} を渡す
  history.astro        ← id="blog" セクションに BlogList（limit なし）を追加

components/organisms/
  BlogList.astro       ← limit?: number を受け取り、表示件数を制御
                          「全てを見る」ボタンを横スクロール列末尾に配置
                          レスポンシブ: スマホ=横スクロール / PC=グリッドタイル（mode prop で切替）
```

### データフロー

```
Content Collections (blogAws / blogOther)
  ↓ getCollection()
BlogList.astro (ビルド時)
  ↓ fetchOgp() で各記事の OGP を取得
  ↓ publishedAt 降順ソート
  ↓ limit が指定されていれば slice(0, limit)
  → OgpCard × N + 「全てを見る」ボタン（limit 指定時のみ）
```

---

## Components and Interfaces

### BlogList.astro — Props 変更

```typescript
export interface Props {
  /** 表示件数上限。未指定時は全件表示 */
  limit?: number;
  /**
   * カードのレイアウトモード
   * - "scroll"  : 横スクロール（デフォルト / ホーム画面）
   * - "grid"    : レスポンシブグリッド（ヒストリーページ）
   */
  layout?: 'scroll' | 'grid';
}
```

> **設計判断**: `layout` prop を追加することで、ホーム画面とヒストリーページで同一コンポーネントを再利用しつつ、レイアウトを切り替える。`history.astro` は `layout="grid"` を渡す。

### 「全てを見る」ボタン

- `limit` が指定されている場合のみ表示（`limit` が `undefined` の場合は非表示）
- 横スクロール列の末尾、カードと同じ行内に `shrink-0` で配置
- リンク先: `/history#blog`
- スタイル: DaisyUI `btn btn-primary` + `rounded-xl w-40 h-full`

### レスポンシブレイアウト（layout="grid" 時）

```
スマホ（〜767px）: 横スクロール（既存と同じ flex + overflow-x-auto）
PC（768px〜）   : CSS Grid（4 列固定）
```

Tailwind クラス例:
```html
<!-- layout="grid" の場合 -->
<div class="
  flex gap-4 overflow-x-auto pb-2 -mx-2 px-2
  md:!grid md:overflow-x-visible md:pb-0 md:mx-0 md:px-0
  md:grid-cols-4
">
```

---

## Data Models

### BlogCard（内部型）

`BlogList.astro` 内で使用する中間データ型。既存の構造を踏襲。

```typescript
interface BlogCard {
  id: string;
  externalUrl: string;
  type: 'aws' | 'other';
  title: string;
  description: string;
  ogpImage: string;
  publishedAt: string | null;
}
```

### limit スライス処理

```typescript
// ソート後に limit を適用
const displayedAwsCards  = limit !== undefined ? sortedAwsCards.slice(0, limit)   : sortedAwsCards;
const displayedOtherCards = limit !== undefined ? sortedOtherCards.slice(0, limit) : sortedOtherCards;
```

- `limit` が記事数より大きい場合は全件表示（`Array.slice` の仕様上、自動的に全件になる）
- `limit=0` は 0 件表示（要件外だが仕様として明確化）

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: limit による表示件数制御

*For any* 記事リスト（0 件以上）と任意の `limit` 値（0 以上の整数）に対して、`limit` を指定してスライスした結果の件数は `min(limit, 元の記事数)` と等しくなる。また `limit` が `undefined` の場合、結果の件数は元の記事数と等しくなる。

**Validates: Requirements 1.1, 1.2, 1.4**

---

## Error Handling

### fetchOgp 失敗時

- 既存の `fetchOgp.ts` がフォールバック（`{ title: url, description: '', ogpImage: '', publishedAt: null }`）を返す設計になっているため、BlogList 側での追加ハンドリングは不要
- ネットワークエラー・タイムアウトは `fetchOgp` 内で `console.warn` してフォールバックを返す

### limit が不正値の場合

- TypeScript strict mode により `limit?: number` の型チェックがビルド時に保証される
- 実行時に `NaN` や負数が渡された場合、`Array.slice(0, NaN)` は空配列を返す（JavaScript 仕様）。要件外のため追加ガードは設けない

### 記事データが 0 件の場合

- `sortedAwsCards` または `sortedOtherCards` が空配列の場合、カードが表示されないだけで UI は正常に描画される
- 「全てを見る」ボタンは `limit` の有無のみで表示制御するため、0 件でも表示される（要件上問題なし）

---

## Testing Strategy

### デュアルテストアプローチ

ユニットテストとプロパティベーステストを組み合わせて網羅的なカバレッジを確保する。

- **ユニットテスト**: 具体的な例・エッジケース・エラー条件を検証
- **プロパティテスト**: 任意の入力に対して成立すべき普遍的な性質を検証

### プロパティベーステスト

**ライブラリ**: `fast-check`（TypeScript ネイティブ、Vitest との相性が良い）

```bash
npm install --save-dev fast-check
```

**設定**: 各プロパティテストは最低 100 回のイテレーションを実行する（`fast-check` のデフォルトは 100 回）。

**テストファイル**: `src/tests/blog-list-update.test.ts`

#### Property 1 の実装方針

```typescript
// Feature: blog-list-update, Property 1: limit による表示件数制御
import fc from 'fast-check';

test('limit を指定した場合、表示件数は min(limit, 記事数) になる', () => {
  fc.assert(
    fc.property(
      fc.array(fc.record({ id: fc.string(), publishedAt: fc.option(fc.string()) })),
      fc.nat(), // limit: 0 以上の整数
      (articles, limit) => {
        const result = articles.slice(0, limit);
        return result.length === Math.min(limit, articles.length);
      }
    ),
    { numRuns: 100 }
  );
});

test('limit が undefined の場合、全件表示される', () => {
  fc.assert(
    fc.property(
      fc.array(fc.record({ id: fc.string(), publishedAt: fc.option(fc.string()) })),
      (articles) => {
        const result = articles.slice(0, undefined);
        return result.length === articles.length;
      }
    ),
    { numRuns: 100 }
  );
});
```

### ユニットテスト

**テストファイル**: `src/tests/blog-list-update.test.ts`（プロパティテストと同ファイル）

#### Example 1: ホーム画面の「全てを見る」ボタン

`BlogList.astro` を `limit={5}` でレンダリングしたとき:
- AWS Blog・Other Blog それぞれの横スクロール列末尾に `href="/history#blog"` を持つ要素が存在する
- その要素が `btn` クラスを持つ

#### Example 2: ヒストリーページの DOM 構造

`history.astro` をレンダリングしたとき:
- `id="blog"` を持つ要素が存在する
- `CareerTimeline` → `ActivitySection` の DOM 順序が維持されている（BlogList セクションはその前後に挿入）

> **注意**: Astro コンポーネントの統合テストは Vitest + `@astrojs/test-utils` または `astro check` で行う。ビルド時 SSG のため、DOM 検証は `astro build` 後の HTML を対象とするか、コンポーネントの Props 型チェックで代替する。

### テスト実行

```bash
npx vitest run src/tests/blog-list-update.test.ts
```

### ユニットテストのバランス

- プロパティテストが多様な入力をカバーするため、ユニットテストは具体的な例・統合ポイント・エッジケースに絞る
- CSS レスポンシブの視覚的な振る舞い（3.4〜3.6）は自動テストの対象外とし、手動確認で担保する
