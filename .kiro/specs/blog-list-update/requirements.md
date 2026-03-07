# Requirements Document

## Introduction

ホーム画面のブログリストを最新 5 件に制限し「全てを見る」ボタンを追加する。
ヒストリーページにはブログ全件リストを追加し、ユーザーがすべての記事を一覧できるようにする。

## Glossary

- **BlogList**: `src/components/organisms/BlogList.astro` — ブログ記事を OGP カードで表示するコンポーネント
- **Index_Page**: `src/pages/index.astro` — トップページ（Bento Grid レイアウト）
- **History_Page**: `src/pages/history.astro` — 全経歴タイムラインページ
- **OgpCard**: `src/components/molecules/OgpCard.astro` — 外部 URL の OGP 情報を表示するカードコンポーネント
- **limit**: BlogList に渡す表示件数上限プロパティ（数値 or `undefined`）

## Requirements

### Requirement 1: ホーム画面のブログリスト件数制限

**User Story:** As a サイト訪問者, I want ホーム画面で最新ブログ記事を手軽に確認したい, so that ページが長くなりすぎず、重要な記事をすぐ見つけられる。

#### Acceptance Criteria

1. WHEN `limit` プロパティが指定された場合, THE BlogList SHALL AWS Blog・Other Blog それぞれのカテゴリで `limit` 件以内の記事のみ表示する
2. WHEN `limit` プロパティが指定されない場合, THE BlogList SHALL 全件を表示する（既存の動作を維持する）
3. THE Index_Page SHALL `BlogList` に `limit={5}` を渡し、各カテゴリ最新 5 件のみ表示する
4. WHEN 記事が `limit` 件未満の場合, THE BlogList SHALL 取得できた件数をそのまま表示する

### Requirement 2: ホーム画面の「全てを見る」ボタン

**User Story:** As a サイト訪問者, I want ホーム画面から全ブログ記事一覧へ移動したい, so that 興味があるときに全記事を確認できる。

#### Acceptance Criteria

1. THE Index_Page SHALL AWS Blog・Other Blog それぞれの横スクロール列の末尾に「全てを見る」ボタンを配置する（セクション下部ではなく、カードと同じ行内）
2. WHEN ユーザーが横スクロールして 5 件のカードを確認した後, THE 「全てを見る」ボタン SHALL スクロール列の末尾に表示され、追加記事の閲覧を促す
3. WHEN 「全てを見る」ボタンがクリックされた場合, THE Index_Page SHALL ヒストリーページのブログセクション（`/history#blog`）へ遷移する
4. THE Index_Page SHALL 「全てを見る」ボタンを DaisyUI の `btn` クラスを用いてスタイリングする

### Requirement 3: ヒストリーページへのブログ全件リスト追加

**User Story:** As a サイト訪問者, I want ヒストリーページで全ブログ記事を確認したい, so that 過去の記事も含めてすべての執筆物を一覧できる。

#### Acceptance Criteria

1. THE History_Page SHALL `BlogList` コンポーネントを `limit` なしで配置し、全件を表示する
2. THE History_Page SHALL ブログセクションに `id="blog"` 属性を付与し、アンカーリンクで直接遷移できるようにする
3. THE History_Page SHALL `CareerTimeline` → `ActivitySection` → `BlogList` の順序で配置する
4. WHEN 画面幅が 768px 未満の場合, THE History_Page の BlogList SHALL 横スクロール形式でカードを表示する
5. WHEN 画面幅が 768px 以上の場合, THE History_Page の BlogList SHALL 4 列固定のグリッドタイル形式でカードを表示する
6. THE History_Page の BlogList SHALL PC グリッド表示時にカード幅を親コンテナに合わせて伸縮させる
