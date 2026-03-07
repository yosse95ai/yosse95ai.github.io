# 実装計画: blog-list-update

## 概要

`BlogList.astro` に `limit` / `layout` prop を追加し、ホーム画面では最新 5 件 + 「全てを見る」ボタン、ヒストリーページでは全件グリッド表示を実現する。

## タスク

- [x] 1. fast-check をインストールする
  - `npm install --save-dev fast-check` を実行してプロパティテスト用ライブラリを追加する
  - _Requirements: テスト戦略全般_

- [x] 2. `BlogList.astro` に `limit` prop とスライス処理を追加する
  - [x] 2.1 Props インターフェースに `limit?: number` を追加し、ソート後に `slice(0, limit)` を適用する
    - `displayedAwsCards` / `displayedOtherCards` 変数を導入してスライス結果を保持する
    - _Requirements: 1.1, 1.2, 1.4_

  - [x]* 2.2 Property 1 のプロパティテストを書く（`src/tests/blog-list-update.test.ts` 新規作成）
    - **Property 1: limit による表示件数制御**
    - `limit` 指定時: `result.length === Math.min(limit, articles.length)` が成立する
    - `limit` 未指定時: 全件が返される
    - **Validates: Requirements 1.1, 1.2, 1.4**

- [x] 3. カタログに「全てを見る」ボタンの Before/After を追加してユーザー確認を得る
  - `src/pages/catalog.astro` の BlogList セクションに Before/After を横並びで追加する
  - Before: 現在の BlogList（ボタンなし）
  - After: 横スクロール列末尾に「全てを見る」ボタンが付いた状態（ダミー実装でよい）
  - ユーザーの承認を得てから次のタスクへ進む
  - _Requirements: 2.1, 2.2_

- [x] 4. `BlogList.astro` に「全てを見る」ボタンを追加する
  - [x] 4.1 `limit` が指定されている場合のみ、横スクロール列末尾に `href="/history#blog"` のボタンを追加する
    - DaisyUI `btn btn-primary` + `shrink-0 rounded-xl w-40 h-full` でスタイリングする
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 4.2 「全てを見る」ボタンのユニットテストを書く
    - `limit` 指定時にボタン要素が存在し `href="/history#blog"` を持つことを確認する
    - `limit` 未指定時にボタンが存在しないことを確認する
    - _Requirements: 2.1, 2.3_

- [x] 5. チェックポイント — ここまでのテストをすべて通す
  - 全テストが通ることを確認する。疑問点があればユーザーに確認する。

- [x] 6. カタログに historyページ グリッドレイアウトの Before/After を追加してユーザー確認を得る
  - `src/pages/catalog.astro` の BlogList セクションに Before/After を横並びで追加する
  - Before: 現在の横スクロール表示
  - After: PC 幅でグリッドタイル表示（`md:grid` + `auto-fill`）
  - ユーザーの承認を得てから次のタスクへ進む
  - _Requirements: 3.4, 3.5, 3.6_

- [ ] 7. `BlogList.astro` に `layout` prop とレスポンシブグリッドを追加する
  - [ ] 7.1 Props インターフェースに `layout?: 'scroll' | 'grid'` を追加し、`layout="grid"` 時に Tailwind クラスを切り替える
    - スマホ（〜767px）: 横スクロール（既存と同じ `flex overflow-x-auto`）
    - PC（768px〜）: `md:grid md:[grid-template-columns:repeat(auto-fill,minmax(288px,1fr))]`
    - _Requirements: 3.4, 3.5, 3.6_

- [ ] 8. `src/pages/index.astro` を更新する
  - [ ] 8.1 `<BlogList />` を `<BlogList limit={5} />` に変更する
    - _Requirements: 1.3_

- [ ] 9. `src/pages/history.astro` を更新する
  - [ ] 9.1 `id="blog"` ラッパー付きで `<BlogList layout="grid" />` を追加する
    - 既存の `CareerTimeline` / `ActivitySection` の順序を変えない
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 9.2 ヒストリーページの DOM 構造ユニットテストを書く
    - `id="blog"` 要素が存在することを確認する
    - _Requirements: 3.2_

- [ ] 10. 最終チェックポイント — 全テストをパスさせる
  - 全テストが通ることを確認する。疑問点があればユーザーに確認する。

## Notes

- `*` 付きタスクはオプション。MVP を優先する場合はスキップ可
- 各タスクは対応する要件番号を参照しているため、トレーサビリティを維持できる
- CSS レスポンシブの視覚的な振る舞い（Requirements 3.4〜3.6）はカタログ確認 + 手動確認で担保する
