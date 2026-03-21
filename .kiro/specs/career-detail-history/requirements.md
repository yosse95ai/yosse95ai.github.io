# Requirements Document

## Introduction

History ページ（`/history`）の経歴タイムラインに description フィールドの表示機能を追加し、タイムライン縦線のモバイル表示不具合を修正する。Home ページ（`/`）のタイムラインは現状のコンパクト表示を維持する。

対象 GitHub Issue: #27「Bio の変更」

## Glossary

- **History_Page**: `/history` パスで表示される経歴タイムライン全件表示ページ（`src/pages/history.astro`）
- **Home_Page**: `/` パスで表示されるトップページ（`src/pages/index.astro`）
- **CareerTimeline**: 経歴コレクションを取得・ソートし TimelineItem を一覧表示する organism コンポーネント
- **TimelineItem**: 経歴タイムラインの個別エントリを表示する molecule コンポーネント
- **career_entry**: `career.json` 内の個別経歴データ（organization, role, startDate, endDate, description）
- **description**: career_entry に含まれる経歴の詳細説明テキスト（optional, nullable）
- **showAll**: CareerTimeline の prop。`true` で全件表示 + description 表示、`false` で最新 4 件のみ + description 非表示
- **timeline_vertical_line**: TimelineItem 内でエントリ間を接続する縦線要素

## Requirements

### Requirement 1: History ページでの description 表示

**User Story:** As a サイト訪問者, I want to History ページで各経歴の詳細な活動内容を閲覧したい, so that 各キャリアでの具体的な取り組みを理解できる。

#### Acceptance Criteria

1. WHEN CareerTimeline が `showAll=true` で呼び出される, THE CareerTimeline SHALL 各 career_entry の description を TimelineItem に渡す
2. WHEN TimelineItem が truthy な description を受け取る, THE TimelineItem SHALL description テキストを含む `<p>` 要素を出力する
3. WHEN TimelineItem が null、undefined、または空文字列の description を受け取る, THE TimelineItem SHALL description 関連の DOM 要素を一切出力しない

### Requirement 2: Home ページの表示不変性

**User Story:** As a サイト訪問者, I want to Home ページのタイムラインが従来通りコンパクトに表示されてほしい, so that トップページの情報密度が適切に保たれる。

#### Acceptance Criteria

1. WHEN CareerTimeline が `showAll=false` で呼び出される, THE CareerTimeline SHALL description に `undefined` を渡して TimelineItem を呼び出す
2. WHILE Home_Page が表示されている, THE CareerTimeline SHALL 最新 4 件のみを表示し description テキストを出力しない
3. WHEN description フィールドが career_entry に追加される, THE Home_Page SHALL 変更前と同一の表示を維持する

### Requirement 3: レスポンシブレイアウト

**User Story:** As a サイト訪問者, I want to モバイルでもデスクトップでも経歴情報を見やすく閲覧したい, so that どのデバイスからでも快適に情報を得られる。

#### Acceptance Criteria

1. WHILE 画面幅が `md`（768px）未満である, THE TimelineItem SHALL organization、role、description を縦積みレイアウトで表示する
2. WHILE 画面幅が `md`（768px）以上かつ `showAll=true` である, THE CareerTimeline SHALL CSS Grid（`auto 1px 1fr`）により左カラム（organization + role）の幅を全エントリの最大コンテンツ幅に自動で揃え、右カラム（description）を残りの幅で表示する
3. WHILE 画面幅が `md` 以上かつ `showAll=true` である, THE CareerTimeline SHALL 左カラムと右カラムの間にセパレーターセル（`1px`、`var(--color-border)`）を表示する
4. WHILE `showAll=false` である, THE CareerTimeline SHALL CSS Grid を適用せず、従来の flex レイアウトを維持する

### Requirement 4: タイムライン縦線のモバイル表示修正

**User Story:** As a サイト訪問者, I want to タイムラインの縦線がコンテンツの高さに正しく追従してほしい, so that タイムラインの視覚的な連続性が保たれる。

#### Acceptance Criteria

1. WHEN TimelineItem の `isLast` が `false` である, THE TimelineItem SHALL 縦線をコンテンツの全高さに追従させて表示する
2. WHEN TimelineItem の `isLast` が `true` である, THE TimelineItem SHALL 縦線を表示しない
3. THE timeline_vertical_line SHALL `absolute` 配置を使用してモバイル・デスクトップ両方でコンテンツ高さに追従する

### Requirement 5: career.json データ追加

**User Story:** As a サイト管理者, I want to 大学・大学院の経歴に description を追加したい, so that 学生時代の研究内容を訪問者に伝えられる。

#### Acceptance Criteria

1. WHEN career.json に description フィールドが追加される, THE career_entry SHALL 既存の content.config.ts スキーマ（`z.string().nullable().optional()`）のバリデーションを通過する
2. THE career_entry `kyutech-undergrad` SHALL description フィールドに仮想ドラムシステム開発に関する説明を持つ
3. THE career_entry `kyutech-master` SHALL description フィールドに UKF を用いたスティック軌跡補間に関する説明を持つ
4. IF career.json に不正な型の description が含まれる, THEN THE Astro ビルドプロセス SHALL Zod バリデーションエラーを発生させビルドを失敗させる

### Requirement 6: 既存表示要素の不変性

**User Story:** As a サイト訪問者, I want to 既存の経歴情報（組織名、役割、期間）が変更なく表示されてほしい, so that 正確な経歴情報を引き続き閲覧できる。

#### Acceptance Criteria

1. THE TimelineItem SHALL showAll の値に関わらず organization、role、startDate、endDate の表示を変更しない
2. WHEN description 表示機能が追加される, THE TimelineItem SHALL 日付フォーマット（`YYYY-MM` → `YYYY 年 M 月`）のロジックを変更しない
3. WHEN description 表示機能が追加される, THE CareerTimeline SHALL startDate 降順ソートのロジックを変更しない
