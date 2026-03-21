# 要件ドキュメント

## はじめに

DaisyUI v5 の primary カラー上書き方式を、現在の `:root` 詳細度ハック方式から公式 `@plugin "daisyui/theme"` 方式に移行するリファクタリングの要件を定義する。本移行により、CSS 変数の重複定義を排除し、DaisyUI 公式 API に準拠したテーマカスタマイズを実現する。

## 用語集

- **Global_CSS**: `src/styles/global.css` ファイル。Tailwind CSS / DaisyUI のインポートとプロジェクト固有のカスタムプロパティを定義するスタイルシート
- **Theme_Plugin**: `@plugin "daisyui/theme"` ディレクティブ。DaisyUI v5 が提供する公式テーマカスタマイズ API
- **Root_Hack**: `:root, [data-theme=light]` セレクタを `@layer` 外に配置して DaisyUI の CSS 変数を上書きする詳細度ハック方式
- **Theme_Block**: `@theme` ディレクティブ。Tailwind CSS v4 のカスタムプロパティ定義ブロック
- **Build_System**: `npm run build` コマンドで実行される Astro + Tailwind CSS v4 + DaisyUI v5 のビルドパイプライン
- **Catalog_Page**: `src/pages/catalog.astro` ファイル。開発用コンポーネントカタログページ
- **Style_Guide**: `.kiro/steering/style-guide.md` ファイル。プロジェクトのスタイリング規約を定義するステアリングドキュメント
- **Primary_Color**: `--color-primary` CSS 変数。値は `oklch(0.55 0.15 145)`
- **Primary_Content_Color**: `--color-primary-content` CSS 変数。値は `oklch(0.98 0.005 145)`

## 要件

### 要件 1: Theme Plugin によるカラー定義

**ユーザーストーリー:** 開発者として、DaisyUI 公式の `@plugin "daisyui/theme"` API を使って primary カラーをカスタマイズしたい。これにより、DaisyUI の内部実装に依存しない保守性の高いテーマ設定を実現できる。

#### 受入基準

1. WHEN Global_CSS がビルドされる THEN Theme_Plugin は `@plugin "daisyui"` の直後に `@plugin "daisyui/theme"` ブロックを含むこと
2. THE Theme_Plugin SHALL ベーステーマとして `name: "night"` を指定すること
3. THE Theme_Plugin SHALL `default: true` を指定し、デフォルトテーマとして適用されること
4. THE Theme_Plugin SHALL Primary_Color を `oklch(0.55 0.15 145)` として定義すること
5. THE Theme_Plugin SHALL Primary_Content_Color を `oklch(0.98 0.005 145)` として定義すること

### 要件 2: 重複定義の排除

**ユーザーストーリー:** 開発者として、`--color-primary` の定義箇所を 1 箇所に集約したい。これにより、値の同期漏れリスクを排除し、カラー管理を簡素化できる。

#### 受入基準

1. WHEN 移行が完了した THEN Global_CSS は Root_Hack ブロック（`:root, [data-theme=light]` または `:root, [data-theme=night]` セレクタの `@layer` 外定義）を含まないこと
2. WHEN 移行が完了した THEN Theme_Block は `--color-primary` の定義を含まないこと
3. WHEN 移行が完了した THEN Theme_Block は `--color-primary-content` の定義を含まないこと
4. WHEN 移行が完了した THEN Global_CSS 内で `--color-primary` を定義する箇所は Theme_Plugin の 1 箇所のみであること
5. WHEN 移行が完了した THEN Global_CSS 内で `--color-primary-content` を定義する箇所は Theme_Plugin の 1 箇所のみであること

### 要件 3: ビジュアルリグレッション防止

**ユーザーストーリー:** 開発者として、移行後もサイトの見た目が変わらないことを保証したい。これにより、ユーザー体験を損なうことなくリファクタリングを完了できる。

#### 受入基準

1. WHEN Theme_Plugin が適用された THEN `btn-primary` クラスを持つ DaisyUI ボタンコンポーネントは Primary_Color を背景色として使用すること
2. WHEN Theme_Plugin が適用された THEN `badge-primary` クラスを持つ DaisyUI バッジコンポーネントは Primary_Color を背景色として使用すること
3. WHEN Theme_Plugin が適用された THEN `text-primary` Tailwind ユーティリティクラスは Primary_Color をテキスト色として適用すること
4. WHEN Theme_Plugin が適用された THEN `bg-primary` Tailwind ユーティリティクラスは Primary_Color を背景色として適用すること
5. WHEN 移行が完了した THEN `--color-bg`、`--color-text`、`--color-secondary` 等の他のカスタムプロパティの値は移行前と同一であること

### 要件 4: ビルド互換性

**ユーザーストーリー:** 開発者として、移行後も `npm run build` が正常に完了することを保証したい。これにより、デプロイパイプラインが中断されないことを確認できる。

#### 受入基準

1. WHEN `npm run build` が実行された THEN Build_System はエラーなく完了すること
2. IF Theme_Plugin の構文が DaisyUI に認識されない THEN Build_System はビルドエラーを出力し、開発者はエラーメッセージから原因を特定できること

### 要件 5: 段階的検証

**ユーザーストーリー:** 開発者として、移行を段階的に検証したい。これにより、問題が発生した場合に影響範囲を限定し、安全にロールバックできる。

#### 受入基準

1. WHEN フェーズ 1 の検証を行う THEN Catalog_Page は `data-theme="night"` を使った Before/After 比較セクションを含むこと
2. WHEN フェーズ 1 の検証を行う THEN Root_Hack は削除せず Theme_Plugin と共存させた状態でビルドが成功すること
3. WHEN フェーズ 2 の全体適用を行う THEN Root_Hack の削除と Theme_Block からの primary 関連定義の削除を実施すること
4. WHEN フェーズ 3 のクリーンアップを行う THEN Catalog_Page から検証用 Before/After セクションを削除すること

### 要件 6: ステアリングルール更新

**ユーザーストーリー:** 開発者として、検証結果に基づいて style-guide.md を更新したい。これにより、プロジェクトの規約が実際の技術的事実と一致した状態を維持できる。

#### 受入基準

1. WHEN Theme_Plugin による移行が成功した THEN Style_Guide の「DaisyUI テーマカラーの上書き規約」セクションは `@plugin "daisyui/theme"` を正しい方法として記載すること
2. WHEN Theme_Plugin による移行が成功した THEN Style_Guide は Root_Hack 方式をレガシー方式として記載すること
3. WHEN Theme_Plugin による移行が成功した THEN Style_Guide はベーステーマとして `night` を使用する旨を記載すること
4. IF Theme_Plugin による移行が失敗した THEN Style_Guide は変更せず現行の記載を維持すること

### 要件 7: ロールバック可能性

**ユーザーストーリー:** 開発者として、移行が失敗した場合に即座に元の状態に戻せるようにしたい。これにより、サイトのダウンタイムを最小限に抑えられる。

#### 受入基準

1. WHEN 移行中に問題が発生した THEN 開発者は `git checkout -- src/styles/global.css` で Global_CSS を移行前の状態に復元できること
2. WHEN ロールバックが実行された THEN Build_System は正常にビルドを完了すること
