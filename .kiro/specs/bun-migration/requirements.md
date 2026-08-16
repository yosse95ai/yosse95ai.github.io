# Requirements Document

## Introduction

本 spec は、プロジェクト `yosse95ai.github.io` のパッケージマネージャを npm から Bun に置き換えるための要件を定義する。
要件はすべて `design.md`（Design-First ワークフローで確定済み）から導出しており、設計に記載のない新規要求は含まない。

移行の目的は高速化ではなく、次の 2 点である。

1. npm lockfile のプラットフォーム固有 `optionalDependencies` バグ（npm/cli#4828, #8320）からの構造的な脱出
2. `tsx` 依存の除去

一貫した方針は「**Bun はパッケージマネージャとしてのみ使い、実行ランタイムは Node のまま維持する**」であり、
成果物（`dist/`）の同一性と npm への切り戻し可能性を移行の合否条件とする。

移行は設計の Phase 0（低リスク先行）→ Phase 1（ローカル Bun 化）→ Phase 2（CI Bun 化）→ Phase 3（ドキュメント更新）の順に実施する。
本文書は「何を満たすべきか」を定義する場所であるため要件そのものを Phase で分割せず、段階性が合否に関わる箇所は受入基準の中で表現する。

---

## Glossary

- **Bun**: パッケージマネージャとして導入するツール。バージョン 1.3.14 を固定値とする
- **npm**: 移行前のパッケージマネージャ。切り戻し経路として `Npm_Lockfile` と併せて利用可能な状態を維持する
- **Node**: 実行ランタイム。バージョン 24 系（`.nvmrc` の値は `24`）
- **Build_System**: `astro build && rm -rf dist/catalog`（`bun run build` / `npm run build` から起動される）が構成するビルド処理
- **Dist_Artifact**: `Build_System` が出力する `dist/` 配下の全ファイル
- **Baseline_Dist_Hashes**: Phase 0 のクリーンな Node 環境で取得した `Dist_Artifact` 全ファイルの相対パスと SHA-256 の一覧（およびそのエントリ数）
- **Baseline_Test_Count**: Phase 0 のクリーンな Node 環境で `npm run test` が報告したテスト件数
- **Test_Runner**: Vitest（`vitest --run`）。Bun のネイティブランナー `bun test` は採用しない
- **Package_Manifest**: `package.json`
- **Bun_Lockfile**: `bun.lock`（コミット対象）
- **Npm_Lockfile**: `package-lock.json`（ロールバック専用として残置）
- **Bun_Version_File**: `.bun-version`
- **Nvm_Version_File**: `.nvmrc`
- **Deploy_Workflow**: `.github/workflows/deploy.yml`
- **Blog_Update_Workflow**: `.github/workflows/update-aws-blog.yml`
- **Astro_Action**: `withastro/action@v6`
- **Setup_Bun_Action**: `oven-sh/setup-bun@v2`
- **Pages artifact**: `Deploy_Workflow` の build job が GitHub Pages 向けにアップロードする成果物
- **Actions ログ**: GitHub Actions のワークフロー実行ログ
- **実行ログ**: スクリプトまたはワークフローステップが標準出力・標準エラーに出力する内容
- **Blog_Update_Script**: `scripts/update-aws-blog.ts`
- **Ogp_Cache_Script**: `scripts/refresh-ogp-cache.ts`
- **Ogp_Cache_Refresh**: `Blog_Update_Script` が実行する OGP キャッシュ更新処理（`refreshOgpCache()`）
- **Project_Documentation**: `doc/blueprint.md`、`.kiro/steering/tech.md`、`.kiro/steering/development-standard.md`
- **Spec_History_Documents**: `.kiro/specs/` 配下の既存 spec 群（実装済み機能の履歴文書）
- **移行作業**: 本 spec の Phase 0〜3 を実行する作業プロセス（実行者は人間または AI エージェント）
- **Phase 0 の変更**: Bun を導入せずに Node 環境のみで成立する先行変更（`motion` 依存の削除および `npx tsx` 呼び出しの除去）
- **リポジトリ**: 本プロジェクトの Git リポジトリ（`yosse95ai/yosse95ai.github.io`）の作業ツリー全体
- **開発者**: ローカル環境で本プロジェクトを開発する人

---

## Requirements

### Requirement 1: パッケージマネージャの Bun への置換

**User Story:** 開発者として、依存解決を Bun に一元化したい。それによって npm lockfile のプラットフォーム固有 `optionalDependencies` バグを構造的に回避できる。

#### Acceptance Criteria

1. THE Bun_Lockfile SHALL リポジトリルートに Git の追跡対象ファイルとしてコミットされた状態で存在し、`.gitignore` による除外対象に含まれない
2. WHEN `bun install` が `Bun_Lockfile` が存在せず `Npm_Lockfile` のみ存在する状態で実行される, THE Bun SHALL `Npm_Lockfile` から移行した `Bun_Lockfile` をリポジトリルートに生成し、終了コード 0 で完了し、かつ `Npm_Lockfile` の内容を変更しない
3. THE Package_Manifest SHALL `packageManager` フィールドに `"bun@1.3.14"` を持つ
4. WHEN CI が依存をインストールする, THE Deploy_Workflow SHALL 依存インストール手段として `bun install --frozen-lockfile` のみを実行し、`npm ci` および `npm install` を実行しない
5. WHEN `bun install --frozen-lockfile` が `node_modules` を削除したクリーン環境で実行される, THEN THE Bun SHALL 終了コード 0 でインストールを完了し、かつ実行後の `Bun_Lockfile` の SHA-256 を実行前の値と一致させる
6. THE Package_Manifest SHALL `scripts.ogp:refresh` の値として `"bun scripts/refresh-ogp-cache.ts"` を持つ
7. THE Package_Manifest SHALL `scripts.blog:update` の値として `"bun scripts/update-aws-blog.ts"` を持つ
8. IF `bun install --frozen-lockfile` の実行時に `Bun_Lockfile` の内容と `Package_Manifest` の依存宣言が一致しない, THEN THE Bun SHALL 非ゼロの終了コードでインストールを中止し、lockfile が最新でないことを示すエラーを出力し、かつ `Bun_Lockfile` を更新しない
9. WHEN 依存の追加または更新のために `bun add` もしくは `bun update` が実行される, THE Bun SHALL `Bun_Lockfile` のみを更新し、`Npm_Lockfile` を変更しない

### Requirement 2: 実行ランタイムを Node に維持すること

**User Story:** 開発者として、Bun 導入後もビルドとテストを Node ランタイム上で動かしたい。それによって Bun ランタイム固有の既知障害（withastro/astro#15926、oven-sh/bun#20070）を回避できる。

#### Acceptance Criteria

1. WHILE `bun run build` または `bun run test` により起動されたプロセスが実行中である, THE Build_System SHALL 当該プロセス内で `process.versions.bun` が `undefined` であり、かつ `process.versions.node` のメジャーバージョンが `Nvm_Version_File` に記載された値（`24`）と一致する状態で動作する
2. THE リポジトリ SHALL リポジトリルートおよび全サブディレクトリ（`node_modules` を除く）に `bunfig.toml` が 0 個である状態を維持する
3. THE Deploy_Workflow SHALL 全ステップの `run` コマンドおよび `with` パラメータに文字列 `--bun` を 0 個含む構成のみで構成される
4. THE Package_Manifest SHALL `scripts.test` の値として文字列 `"vitest --run"` を完全一致で維持する
5. THE Package_Manifest SHALL `dependencies` および `devDependencies` の双方において `@types/bun` を 0 個含まない状態を維持する
6. WHERE `Astro_Action` が `package-manager` として Bun を選択して実行される, THE Astro_Action SHALL `Setup Node (Bun)` ステップで `Nvm_Version_File` に記載されたメジャーバージョン（`24`）の Node をセットアップした後にビルドを実行する

**検証プロパティ:** P3（実行ランタイムが Node であること）

### Requirement 3: 成果物の同一性

**User Story:** サイト運用者として、パッケージマネージャの変更が配信物に一切影響しないことを確認したい。それによって本番サイトへの影響ゼロを保証できる。

#### Acceptance Criteria

1. WHEN Phase 0 のクリーンな Node 環境（`Nvm_Version_File` 記載バージョン、`node_modules` 削除後の再インストール直後）で `npm run build` が完了する, THE 移行作業 SHALL `find dist -type f -exec shasum -a 256 {} \; | sort -k2` の出力を `Baseline_Dist_Hashes` として記録する
2. WHEN Bun 環境で `bun run build` が完了する, THE Dist_Artifact SHALL `dist/` 配下の全ファイルについて、`dist/` からの相対パスが同一のファイル同士を対応付けたとき、全ファイルの SHA-256 が `Baseline_Dist_Hashes` の対応エントリと 1 件の差異もなく一致する
3. WHEN Bun 環境で `bun run build` が完了する, THE Dist_Artifact SHALL `dist/` 配下のファイル数（ディレクトリを除く再帰的な総数）が `Baseline_Dist_Hashes` のエントリ数と一致し、`Baseline_Dist_Hashes` に存在しない相対パスおよび欠落する相対パスが 0 件である
4. WHEN Phase 0 の変更（`motion` の削除および `npx tsx` の除去）を適用した Node 環境で `npm run build` が完了する, THE Dist_Artifact SHALL 全ファイルの SHA-256 と `dist/` 配下のファイル数が `Baseline_Dist_Hashes` と完全一致する
5. IF `Dist_Artifact` の SHA-256 またはファイル数が `Baseline_Dist_Hashes` と 1 件以上一致しない, THEN THE 移行作業 SHALL 不一致の相対パスと不一致種別（ハッシュ相違・欠落・余剰）を示す比較結果を出力し、以降の Phase を開始せずに該当 Phase の変更をロールバックする
6. IF `Baseline_Dist_Hashes` が未取得である, THEN THE 移行作業 SHALL 比較を成功と判定せず、ベースライン未取得を示すエラーを出力して Phase 1 以降の作業を開始しない
7. WHEN CI の `Deploy_Workflow` の build job が完了する, THE Pages artifact SHALL 含まれるファイル数が `Baseline_Dist_Hashes` のエントリ数と一致する

**検証プロパティ:** P1（成果物の同一性）

### Requirement 4: テストの完全パス

**User Story:** 開発者として、テストランナーを Vitest のまま維持しつつ Bun 経由で起動したい。それによってモック API（`vi.*`）を使う既存テストを書き換えずに移行できる。

#### Acceptance Criteria

1. THE Test_Runner SHALL Vitest（`vitest --run` による一括実行）であり、Bun ネイティブテストランナー（`bun test`）を使用しない
2. WHEN `bun run test` が実行される, THE Test_Runner SHALL 失敗 0 件・エラー 0 件で終了コード 0 を返して完了する
3. WHEN `bun run test` が実行される, THE Test_Runner SHALL Phase 0 で確定した `Baseline_Test_Count` と完全一致するテスト件数（合格件数およびスキップ件数を含む総数）を報告する
4. THE 既存テストコード（`src/tests/` 配下 4 ファイルおよび `scripts/lib/__tests__/` 配下 5 ファイル、計 9 ファイル）SHALL 内容・ファイル数ともに変更されない状態を維持する
5. WHEN CI が Bun 環境でテストを実行する, THE Deploy_Workflow SHALL テスト実行ステップとして `bun run test` を実行し、終了コードが 0 以外の場合はワークフローを失敗させて後続のビルド・デプロイステップを実行しない
6. IF テストが 1 件でも失敗する、または報告件数が `Baseline_Test_Count` と一致しない, THEN THE 移行作業 SHALL 該当 Phase を停止し、失敗テスト名と失敗理由を記録した上で移行前の状態を保持する
7. WHEN Phase 0 が完了する, THE 移行作業 SHALL 移行前の `npm run test` 実行結果から得たテスト総数を `Baseline_Test_Count` として記録する
8. THE Test_Runner SHALL `vi.stubGlobal` / `vi.mock` / `vi.unstubAllGlobals` を含む既存モック API がすべて動作し、日本語のテスト名が文字化けせずに出力される状態を満たす

**検証プロパティ:** P2（テストの完全パス）

### Requirement 5: 切り戻し可能性の保持

**User Story:** サイト運用者として、Bun 経路に問題が出た場合に npm 運用へ即座に戻したい。それによって移行のリスクを限定できる。

#### Acceptance Criteria

1. THE Npm_Lockfile SHALL リポジトリのルートに Git 追跡対象ファイルとして存在し、Phase 0 から Phase 3 のいずれのコミットにおいても削除・リネーム・内容変更が 0 件である
2. WHEN `Npm_Lockfile` が存在する状態で `npm ci` が実行される, THE npm SHALL 終了コード 0 で完了し、`Package_Manifest` の全依存関係を `node_modules` に配置し、かつ `Npm_Lockfile` の内容を変更しない
3. IF `npm ci` が終了コード 0 以外で終了する, THEN THE 移行作業 SHALL 切り戻し不能と判定し、失敗した依存関係名と失敗理由を示すエラー内容を記録し、`Npm_Lockfile` を実行前の内容のまま保持する
4. WHEN Phase 2 のコミットのみが revert される, THE Deploy_Workflow SHALL ワークフローファイルおよび `Package_Manifest` への手動編集 0 件で npm 経路（`setup-node` + `npm ci` + `npm run test` + `Astro_Action` の自動検出による npm 選択）に戻る
5. WHILE `package-manager` の明示指定が `Deploy_Workflow` に存在しない, THE Astro_Action SHALL lockfile 検出順に従い `Npm_Lockfile` を先に検出し、`Bun_Lockfile` が同時に存在する場合でも npm を選択する
6. WHERE Phase 1 までを含む完全ロールバックが必要である, THE 移行作業 SHALL Phase 3 / Phase 2 / Phase 1 のコミットの revert と `npm ci` の再実行のみ（手動でのファイル編集 0 件）で npm 運用を復元する
7. WHILE 完全ロールバックが実施される, THE Phase 0 の変更（`motion` 依存の削除および `npx tsx` 呼び出しの除去）SHALL revert 対象に含まれず、ロールバック完了後も適用済みの状態を維持する

**検証プロパティ:** P5（切り戻し可能性の保持）

### Requirement 6: CI パイプラインの Bun 化

**User Story:** 開発者として、CI の依存インストールを Bun に切り替えたい。それによってローカルと CI の依存解決経路を一致させられる。

#### Acceptance Criteria

1. THE Deploy_Workflow SHALL `Setup_Bun_Action` を `bun-version-file: .bun-version` 付きで、依存インストールステップより前に実行される位置で使用する
2. THE Deploy_Workflow SHALL `actions/setup-node` を含まない構成である（`Astro_Action` が内部で行う Node セットアップを唯一の Node 供給経路とする）
3. THE Deploy_Workflow SHALL `Astro_Action` の入力として `package-manager: bun` を明示する（`Npm_Lockfile` が残置されているため、明示しない場合 lockfile 検出順により npm が選択される）
4. THE Deploy_Workflow SHALL `Astro_Action` の入力として `node-version: '24'` を明示し、その値は `Nvm_Version_File` に記載された Node メジャーバージョンと一致する
5. THE Blog_Update_Workflow SHALL `actions/setup-node@v4` を `node-version-file: .nvmrc` 付きで維持し、`Setup_Bun_Action` を `bun-version-file: .bun-version` 付きで追加する
6. THE Blog_Update_Workflow SHALL 依存インストールとして `bun install --frozen-lockfile` を実行し、`npm ci` を含まない
7. THE Blog_Update_Workflow SHALL 更新スクリプトの起動コマンドとして `bun scripts/update-aws-blog.ts` を使用し、`npx tsx` を含まない
8. THE Deploy_Workflow SHALL `cache: npm` の指定を持たない構成である
9. THE Blog_Update_Workflow SHALL `cache: npm` の指定を持たない構成である
10. THE Deploy_Workflow SHALL 依存インストールとして `bun install --frozen-lockfile` を実行する
11. THE Deploy_Workflow SHALL テスト実行コマンドとして `bun run test` を使用し、テストが 1 件以上失敗した場合はジョブを失敗として終了して後続の `Astro_Action` ステップおよび deploy ジョブを実行しない
12. WHEN Deploy_Workflow が実行される, THE Actions ログ SHALL `Setup Bun` ステップと `Setup Node (Bun)` ステップの完了を記録し、かつ全ステップのログを通じて `npm install` および `npm ci` の実行を 0 件とする
13. IF Actions ログに `npm install` または `npm ci` の実行が 1 件以上記録される, THEN THE 移行作業 SHALL `Astro_Action` の `package-manager` 指定を `bun` に修正する
14. IF `Bun_Lockfile` が `Package_Manifest` の依存宣言と不整合であり `--frozen-lockfile` による検証が失敗する, THEN THE Deploy_Workflow および Blog_Update_Workflow SHALL lockfile 不整合を示すエラーを出力してジョブを失敗として終了し、リポジトリ内の lockfile を更新しない

### Requirement 7: `npx tsx` の除去とサイレント劣化の検出

**User Story:** 開発者として、`Blog_Update_Script` が Bun 単体環境でも壊れないようにしたい。それによって OGP キャッシュ更新が黙って失敗し続ける状態を防げる。

#### Acceptance Criteria

1. THE Blog_Update_Script SHALL `Ogp_Cache_Refresh` の起動時に `npx` および `tsx` のいずれのコマンドも子プロセスとして起動しない
2. WHEN `Blog_Update_Script` が `bun` のみ利用可能で `node` および `npx` が PATH 上に存在しない環境で実行される, THE Ogp_Cache_Refresh SHALL 対象記事の OGP を全件取得してキャッシュに書き込み、終了ステータス 0 で完了する
3. WHEN `Blog_Update_Script` が `node` が PATH 上に存在する環境で実行される, THE Ogp_Cache_Refresh SHALL 対象記事の OGP を全件取得してキャッシュに書き込み、終了ステータス 0 で完了する
4. WHEN `Ogp_Cache_Refresh` が完了する, THE 実行ログ SHALL 文字列「OGPキャッシュの更新に失敗しました」を含まず、取得成功件数と取得失敗件数を数値で含む
5. WHEN `Blog_Update_Workflow` が `workflow_dispatch` で手動実行される, THE 実行ログ SHALL `Ogp_Cache_Refresh` の成功または失敗を示す行と、取得成功件数・取得失敗件数を含む
6. IF `Ogp_Cache_Refresh` が失敗する, THEN THE Blog_Update_Script SHALL 失敗原因を識別できる警告を出力し、記事更新処理を継続する
7. WHEN `bun scripts/refresh-ogp-cache.ts` が単独で実行される, THE Ogp_Cache_Script SHALL 対象記事を全件取得対象とし、取得成功件数・取得失敗件数を出力する

**検証プロパティ:** P4（OGP キャッシュ更新がサイレント劣化していない）

**備考:** 実装方式（`process.execPath` の再利用 / Bun 判定分岐 / `Ogp_Cache_Script` の関数を直接 import）は設計で未確定であり、本要件は振る舞いのみを規定する。

### Requirement 8: 不要依存の削除

**User Story:** 開発者として、参照のない依存と代替可能になった依存を削除したい。それによって依存ツリーと lockfile を小さく保てる。

#### Acceptance Criteria

1. THE Package_Manifest SHALL `dependencies` および `devDependencies` の全エントリに `motion` を 0 個含まない
2. THE Package_Manifest SHALL `devDependencies` に `tsx` を 0 個含まず、かつ `scripts` 内に `tsx` を呼び出すコマンドを 0 個含まない
3. WHEN `motion` と `tsx` を削除した状態で本番ビルドコマンドを実行する, THE Dist_Artifact SHALL 全出力ファイルのパス集合とファイル単位ハッシュが `Baseline_Dist_Hashes` と完全一致する
4. THE Package_Manifest SHALL 維持対象依存（`astro` / `vitest` / `fast-check` / `fast-xml-parser` / `tailwindcss` / `daisyui` / `astro-icon`）のパッケージ名とバージョン指定文字列を削除前と 1 文字も変更しない
5. THE Package_Manifest SHALL `esbuild` を直接依存として宣言せず、`esbuild` は `astro` の推移的依存として lockfile 上に 1 件以上解決された状態を保つ
6. IF `motion` または `tsx` の削除後にビルド・型チェック・テストのいずれかのコマンドが終了コード 0 以外を返す, THEN THE 移行作業 SHALL 当該コマンド名と失敗内容を示すエラー出力を提示し、`Package_Manifest` と lockfile を削除前の状態へ復元する

### Requirement 9: バージョン指定の単一ソース化

**User Story:** 開発者として、Bun と Node のバージョン指定が複数箇所で矛盾しない状態にしたい。それによって暗黙の一致に依存した構成を排除できる。

#### Acceptance Criteria

1. THE Bun_Version_File SHALL 改行を除き 1 行のみのプレーンテキストとして、前後に空白文字を含まないセマンティックバージョン文字列 `1.3.14`（`メジャー.マイナー.パッチ` 形式、接頭辞 `v` なし）を持つ
2. THE Package_Manifest の `packageManager` フィールド SHALL `bun@<version>` 形式であり、その `<version>` 部分が `Bun_Version_File` の値と文字列として完全一致する
3. THE Nvm_Version_File SHALL 改行を除き 1 行のみのプレーンテキストとして、前後に空白文字を含まない値 `24`（接頭辞 `v` なし）を維持する
4. THE Deploy_Workflow の `Astro_Action` に渡す `node-version` の値 SHALL `Nvm_Version_File` の値と文字列として完全一致する
5. THE Setup_Bun_Action SHALL バージョンを `Bun_Version_File` へのファイル参照入力（`bun-version-file`）でのみ受け取り、バージョン値を直接指定する入力を併用しない
6. IF ローカルの `bun --version` の出力が `Bun_Version_File` の値と一致しない, THEN THE 開発者 SHALL `bun upgrade --to <Bun_Version_File の値>` を実行し、実行後に `bun --version` の出力が一致することを確認する

### Requirement 10: サプライチェーン防御としての `trustedDependencies` 未定義

**User Story:** サイト運用者として、未知の依存の postinstall がブロックされる状態を保ちたい。それによってサプライチェーン攻撃の影響範囲を限定できる。

#### Acceptance Criteria

1. THE Package_Manifest SHALL `trustedDependencies` フィールドを未定義（キー自体が存在しない状態）で維持する。空配列 `[]` および任意の要素を持つ配列はいずれも未定義とみなさない
2. WHILE `trustedDependencies` が未定義である, THE Bun SHALL Bun 組み込み信頼リスト（npm レジストリ由来パッケージのみを対象とする）に含まれる依存の lifecycle script のみを実行し、それ以外の依存の lifecycle script は実行せずブロック済みとして扱う
3. IF `trustedDependencies` に 1 個以上の要素を持つ明示リストを定義する変更が行われる, THEN THE Package_Manifest SHALL その列挙に `sharp` と `esbuild` を含める
4. WHEN `bun install` の完了直後（`node_modules` の削除・再生成を挟まずに）`bun pm untrusted` が実行される, THE 移行作業 SHALL その標準出力の全文を記録項目として保存する
5. IF `bun pm untrusted` が `node_modules` が存在しない状態、または直前に `bun install` が完了していない状態で実行される, THEN THE 移行作業 SHALL その出力（0 件報告を含む）を無効として破棄し、`bun install` 実行後に再取得する
6. WHEN `trustedDependencies` 未定義の状態で `bun install` に続いて `bun run build` が実行される, THE Build_System SHALL 終了コード 0 で完了する

**備考:** `bun pm untrusted` の結果は合否ゲートではない。移行の正しさは P1 と P2 で判定する。

### Requirement 11: ドキュメントと steering の更新

**User Story:** 開発者として、ドキュメントと steering が Bun 運用を反映した状態にしたい。それによって人間と AI エージェントの双方が誤った npm 前提で作業することを防げる。

#### Acceptance Criteria

1. THE `doc/blueprint.md` SHALL 技術スタック表にパッケージ管理を Bun（ランタイムは Node を維持）として記載する
2. THE `doc/blueprint.md` SHALL 技術スタック表のアニメーション行を Tailwind `animate-*` + CSS + Astro CSS View Transitions の 3 要素をすべて含む記述として記載する
3. THE `doc/blueprint.md` SHALL ディレクトリ構成図に `Bun_Lockfile` / `Npm_Lockfile` / `Bun_Version_File` / `Nvm_Version_File` の 4 エントリを記載し、`Npm_Lockfile` には切り戻し用に残置している旨の注記を併記する
4. THE `.kiro/steering/tech.md` SHALL テスト実行コマンドを `bun run test` として記載し、`bun test` が `vi.*` API 非対応のため使用不可である旨を明記する
5. THE `.kiro/steering/tech.md` SHALL デプロイ構成を `Setup_Bun_Action` + `Astro_Action`（`package-manager: bun` を指定）+ `actions/deploy-pages@v4` の 3 要素をすべて含む記述として記載する
6. THE `.kiro/steering/tech.md` SHALL 開発コマンドとして `bun install` / `bun run dev` / `bun run build` / `bun run preview` の 4 コマンドをすべて記載する
7. THE `.kiro/steering/tech.md` SHALL `bunfig.toml` の `[run] bun = true` を設定しない方針と、コマンド実行時に `--bun` フラグを付与しない方針の 2 点を記載する
8. THE `.kiro/steering/development-standard.md` SHALL rule-1 に、既存の Node バージョン確認手順（`cat ./.nvmrc` / `node --version` / `nvm use`）に続くステップとして、`cat ./.bun-version` による期待バージョン確認、`bun --version` による実測、両者が不一致の場合に `bun upgrade --to <version>` を実行する手順を記載する
9. THE Spec_History_Documents SHALL 本要件の作業前後で内容が変更されない状態を維持する（`.kiro/specs/` を対象とした差分が 0 ファイルであること）
10. WHEN Phase 3 が完了する, THE Project_Documentation SHALL `bun update` 実行時に `Bun_Lockfile` のみが更新され `Npm_Lockfile` と乖離することを踏まえた運用ルールを記載する

### Requirement 12: 段階移行とベースラインの確定

**User Story:** 開発者として、移行を Phase 単位で切り分けて進めたい。それによって問題が発生した際の原因特定とロールバックが容易になる。

#### Acceptance Criteria

1. WHEN Phase 0 が開始される, THE 移行作業 SHALL `node_modules` を削除した状態から `npm ci` / `npm run test` / `npm run build` を順に実行し、`dist/` 配下の全ファイルについて相対パスと SHA-256 の一覧を `Baseline_Dist_Hashes` として記録し、実行されたテストケースの総数（失敗 0 件であること）を `Baseline_Test_Count` として記録する
2. THE Phase 0 の変更 SHALL Bun を導入せず（`Bun_Lockfile` / `packageManager` / `Bun_Version_File` を追加せず）、Node 環境のみで `npm ci` / `npm run test` / `npm run build` の 3 コマンドすべてが終了コード 0 で完了する
3. THE Phase 0 の変更 SHALL 単独で `master` にマージ可能である（後続 Phase の変更に依存せず、Phase 1 以降を適用しない状態で基準 2 の 3 コマンドがすべて終了コード 0 で完了する）
4. WHEN Phase 1 が完了する, THE 移行作業 SHALL ローカルで `bun run build` を実行して `Dist_Artifact` が `Baseline_Dist_Hashes` と完全一致すること、および `bun run test` の実行テストケース数が `Baseline_Test_Count` と一致し失敗 0 件であることを確認する
5. WHEN Phase 1 が完了する, THE 移行作業 SHALL `bun run dev` を実行し、astro の ready ログが出力され、かつ表示された開発サーバ URL のトップページ（`/`）への HTTP GET が 200 を返すことを確認する
6. WHEN Phase 2 が完了する, THE 移行作業 SHALL feature branch 上で `Deploy_Workflow` の build job を実行し、job が成功することを確認する
7. THE 移行作業 SHALL Phase 0 → Phase 1 → Phase 2 → Phase 3 の順に実施し、各 Phase は直前の Phase の検証基準がすべて満たされた後に開始する
8. IF いずれかの Phase の検証で `Baseline_Dist_Hashes` との不一致、`Baseline_Test_Count` との不一致、テスト失敗、または終了コード 0 以外が発生する, THEN THE 移行作業 SHALL 当該 Phase の変更を `master` にマージせず、当該 Phase の変更を移行前の状態に戻し、不一致または失敗した検証項目を示す報告を残す

### Requirement 13: lockfile のプラットフォーム非依存性の検証

**User Story:** 開発者として、開発機で生成した lockfile が CI でそのまま通ることを確認したい。それによって移行の主目的（npm lockfile バグの回避）が達成されたと判断できる。

#### Acceptance Criteria

1. WHEN macOS ARM64 で生成された `Bun_Lockfile` をコミットした状態で Linux x64 の CI が `bun install --frozen-lockfile` を実行する, THE Bun SHALL 終了コード 0 でインストールを完了し、かつ実行後の `Bun_Lockfile` の内容が実行前と完全一致（差分 0 行）である
2. WHEN `bun install` が実行される, THE Bun SHALL 実行中のプラットフォームに対応する `optionalDependencies` のみを `node_modules` に展開し、他プラットフォーム向けパッケージのディレクトリを 0 個配置する
3. WHEN macOS ARM64 で `bun install` が実行される, THE 移行作業 SHALL 対象 5 系統（`@tailwindcss/oxide` / `lightningcss` / `@rollup/rollup-*` / `sharp`（`@img/*`）/ `esbuild`（`@esbuild/*`、宣言 26 個））について、`node_modules` に展開されたプラットフォーム別パッケージが darwin-arm64 系のみであることを記録する
4. WHEN Linux x64 の CI で `bun install --frozen-lockfile` が完了する, THE 移行作業 SHALL 上記 5 系統について展開されたプラットフォーム別パッケージが linux-x64 系のみであることを記録する
5. IF Linux x64 の CI で `bun install --frozen-lockfile` が終了コード 0 以外で終了する、または実行後に `Bun_Lockfile` に差分が発生する, THEN THE 移行作業 SHALL Phase 2 の後続タスクを開始せず、不足または不一致となったパッケージ名と該当プラットフォームを記録して原因調査を実施する
6. IF 上記 5 系統のいずれかについて、実行プラットフォームに対応するパッケージが `node_modules` に展開されていない, THEN THE 移行作業 SHALL Phase 2 の後続タスクを開始せず、当該パッケージ名を記録して原因調査を実施する

---

## Correctness Properties との対応

`design.md` の Correctness Properties P1〜P5 と、本文書の受入基準の対応。

| Property | 内容 | 検証する受入基準 |
|---|---|---|
| P1 | 成果物の同一性 | 3.2, 3.3, 3.4, 3.7, 8.3 |
| P2 | テストの完全パス | 4.2, 4.3 |
| P3 | 実行ランタイムが Node であること | 2.1, 2.2, 2.3, 2.4, 2.5, 2.6 |
| P4 | OGP キャッシュ更新がサイレント劣化していない | 7.2, 7.3, 7.4, 7.5 |
| P5 | 切り戻し可能性の保持 | 5.1, 5.2, 5.4 |

---

## 本文書に含めない事項（設計の非目標・スコープ外）

設計で明示的に非目標とされているため、要件化していない。

- ビルド時間・テスト時間の短縮
- `bun test`（Bun ネイティブランナー）への移行
- `bunfig.toml` による Bun ランタイム化
- Docker 化
- `@types/bun` の追加
- Astro のメジャーアップグレード（5 → 7）
- `esbuild` の 2 バージョン重複の解消（npm でも同じ結果であり移行前後で変わらない）
- CI キャッシュの追加（`Setup_Bun_Action` に `cache:` 相当が存在しない）

次の項目は設計（`design.md`）に記載がなく、新規の実装スコープを生むため要件化しない。

- OGP 取得処理のタイムアウト値（個別取得・全体実行の双方）の規定
- `Ogp_Cache_Refresh` の失敗時に Pull Request 本文へ未更新である旨を記載すること
- OGP 取得失敗時に既存キャッシュ項目を保持すること（現行実装の振る舞いが未確認）
- `Ogp_Cache_Script` が取得失敗時に非ゼロ終了コードを返すこと（現行実装の振る舞いが未確認）
- `Bun_Version_File` / `packageManager` / `Nvm_Version_File` の値の不一致を CI が検出してジョブを失敗させる検証ステップ（要件 9 は「一致している状態」のみを規定する）

また、設計の Open Questions のうち次の 4 件は未確定事項であり、断定的な受入基準として書けないため要件化していない。
実装時または Phase 実行時に確定させる。

- 実際の GitHub Actions ランナー上での `Astro_Action` + `package-manager: bun` の詳細挙動（Open Question 2。要件 6.12 で観測のみ規定）
- `npx tsx` 除去の実装方式の選択（Open Question 4。要件 7 は振る舞いのみを規定）
- `Baseline_Test_Count` の具体値（Open Question 5。要件 4.7 / 12.1 で確定手順のみを規定）
- `Npm_Lockfile` の最終的な削除タイミングおよび `Bun_Lockfile` との乖離の扱い（Open Question 3 / 6。要件 11.10 は運用ルールを記載する義務のみを規定する）
