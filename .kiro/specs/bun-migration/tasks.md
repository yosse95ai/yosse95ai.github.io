# Implementation Plan: bun-migration

## Overview

パッケージマネージャを npm から Bun に置き換える。実行ランタイムは Node 24 のまま維持する。
設計の Phase 0（低リスク先行）→ Phase 1（ローカル Bun 化）→ Phase 2（CI Bun 化）→ Phase 3（ドキュメント更新）
の順に実施し、各 Phase は直前の Phase の検証基準がすべて満たされてから開始する（要件 12.7）。

Phase ごとに独立したコミットを作り、ロールバックが Phase 単位の revert で成立する状態を保つ（要件 5.4, 5.6）。
新規のプロパティベーステストは追加しない。移行の正しさは Correctness Properties P1〜P5 を
コマンド実行と CI ログで確認する形で検証する。

**作業上の前提**
- ローカルの `node_modules` は空。Phase 0 の最初に `npm ci` が必要
- `.nvmrc` は `24`。作業開始時に `nvm use` でローカル Node を切り替える
- `git push` は自律実行しない。push を伴うタスクではユーザー確認を取る
- コミット時は Individual / AWS のどちらのユーザープロファイルを使うかユーザーに確認する

## Tasks

- [x] 1. Phase 0: ベースラインの取得
  - [x] 1.1 クリーンな Node 環境を用意して依存をインストールする
    - `cat ./.nvmrc` / `node --version` を確認し、不一致なら `nvm use`
    - `rm -rf node_modules` の後に `npm ci` を実行し、終了コード 0 を確認する
    - `package-lock.json` が実行前後で変化しないことを確認する
    - _要件: 5.2, 12.1, 12.2_

  - [x] 1.2 `Baseline_Test_Count` を記録する
    - `npm run test` を実行し、失敗 0 件であることとテスト総数を記録する
    - テストファイル数が 9 件（`src/tests/` 4 + `scripts/lib/__tests__/` 5）であることを確認する
    - 記録値は以降の P2 検証の基準値として本 spec ディレクトリ外の作業メモに残さず、タスク実行結果として報告する
    - _要件: 4.7, 12.1_

  - [x] 1.3 `Baseline_Dist_Hashes` を記録する
    - `npm run build` を実行し、終了コード 0 を確認する
    - `find dist -type f | wc -l` でファイル数を記録する
    - `find dist -type f -exec shasum -a 256 {} \; | sort -k2 > /tmp/dist-node.sha256` を実行して基準ハッシュを保存する
    - _要件: 3.1, 12.1_

- [x] 2. Phase 0: `motion` 依存の削除
  - [x] 2.1 `motion` の参照が 0 箇所であることを再確認する
    - `src/` と `scripts/` に対する `motion` の grep が 0 件であることを確認する
    - `dist/` バンドルに含まれないことを確認する
    - _要件: 8.1_

  - [x] 2.2 `package.json` から `motion` を削除する
    - `dependencies.motion` を削除する
    - 維持対象依存（`astro` / `vitest` / `fast-check` / `fast-xml-parser` / `tailwindcss` / `daisyui` / `astro-icon`）の
      パッケージ名とバージョン指定文字列が 1 文字も変わっていないことを確認する
    - _要件: 8.1, 8.4_

  - [x] 2.3 `package-lock.json` の同期方針をユーザーに確認して適用する
    - **要件間の競合がある**: 要件 8.1 は `package.json` からの `motion` 削除を求めるが、
      要件 5.1 は Phase 0〜3 のいずれのコミットでも `package-lock.json` の内容変更を 0 件とすることを求める。
      `motion` を削除したまま lockfile を同期しないと `npm ci`（要件 5.2 / 12.2）が
      `package.json` と lockfile の不整合で失敗する可能性がある
    - 実際に `npm ci` が失敗するかを検証し、結果を提示したうえで方針をユーザーに確認する
      （A: lockfile を同期して要件 5.1 を緩める / B: `motion` 削除を Phase 1 の `bun.lock` 生成と同時に行う）
    - 決定した方針を適用し、`npm ci` が終了コード 0 で完了することを確認する
    - _要件: 5.1, 5.2, 8.1, 12.2_

- [x] 3. Phase 0: `npx tsx` の除去
  - [x] 3.1 `scripts/refresh-ogp-cache.ts` の構造を確認して実装方式を決定する
    - 対象は `scripts/update-aws-blog.ts` の 58 行目
      `execSync('npx tsx scripts/refresh-ogp-cache.ts', { encoding: 'utf-8', stdio: 'inherit' })`
    - `refresh-ogp-cache.ts` が副作用 top-level スクリプトか、関数として export 可能な構造かを読んで判定する
    - 設計の 3 案（`process.execPath` の再利用 / Bun 判定分岐 / 関数を直接 import）から方式を選ぶ。
      設計は**代替 B（関数を直接 import）を推奨**しており、成立する場合はこれを採用する
    - 選択した方式と根拠を記録する（Open Question 4 の確定）
    - _要件: 7.1, 7.2, 7.3_

  - [x] 3.2 `scripts/refresh-ogp-cache.ts` を関数エクスポート可能な構造に整える
    - 代替 B を採用した場合、OGP キャッシュ更新処理を named export の関数として切り出す
    - スクリプト単体実行（`bun scripts/refresh-ogp-cache.ts` / `npx tsx scripts/refresh-ogp-cache.ts`）でも
      従来どおり全件取得が動作する形を保つ
    - 代替 A / `process.execPath` 方式を採用した場合は本サブタスクをスキップする
    - _要件: 7.7_

  - [x] 3.3 `scripts/update-aws-blog.ts` から `npx tsx` 起動を除去する
    - 58 行目の `execSync('npx tsx ...')` を 3.1 で決定した方式に置き換える
    - `npx` / `tsx` のいずれも子プロセスとして起動しないことを確認する
    - 失敗時は警告を出して記事更新処理を継続する現行の振る舞いを維持する
    - _要件: 7.1, 7.2, 7.3, 7.6, 8.2_

  - [x] 3.4 OGP キャッシュ更新のログ出力を検証する
    - Node 環境で `scripts/update-aws-blog.ts` の OGP 更新経路を実行し、
      実行ログに「OGPキャッシュの更新に失敗しました」が含まれないことを確認する
    - 取得成功件数・取得失敗件数が数値でログに出ることを確認する
    - _要件: 7.3, 7.4, 7.7_

  - [x] 3.5 既存テストへの影響を確認する
    - `scripts/lib/__tests__/` 配下 5 ファイルと `src/tests/` 配下 4 ファイルが未変更であることを確認する
    - `npm run test` を実行し、件数が `Baseline_Test_Count` と一致し失敗 0 件であることを確認する
    - _要件: 4.4_

- [x] 4. Phase 0 完了ゲート
  - [x] 4.1 成果物同一性とテストを検証する
    - `npm run build` を実行し、`find dist -type f -exec shasum -a 256 {} \; | sort -k2 > /tmp/dist-phase0.sha256`
    - `diff /tmp/dist-node.sha256 /tmp/dist-phase0.sha256` が差分なしであることを確認する
    - `npm run test` が全パスし、件数が `Baseline_Test_Count` と一致することを確認する
    - 不一致があれば Phase 0 の変更をロールバックし、不一致の相対パスと種別を報告する
    - _要件: 3.4, 3.5, 3.6, 8.3, 8.6, 12.2_

  - [x] 4.2 Phase 0 を単独コミットする
    - Bun 関連ファイル（`bun.lock` / `packageManager` / `.bun-version`）を含めないことを確認する
    - コミット前にユーザープロファイル（Individual / AWS）を確認し `git config` を設定する
    - Phase 0 単独で `master` にマージ可能な状態であることを確認する
    - _要件: 5.7, 12.2, 12.3_

- [x] 5. チェックポイント - Phase 0 完了
  - すべてのテストがパスしていることを確認し、疑問があればユーザーに確認する。

- [x] 6. Phase 1: ローカル Bun 化
  - [x] 6.1 `bun install` で `bun.lock` を生成する
    - `bun install` を実行し、`package-lock.json` からの自動マイグレートで `bun.lock` が生成されることを確認する
    - `package-lock.json` の内容が変化していないことを確認する
    - `bun.lock` を Git 追跡対象に追加し、`.gitignore` の除外対象でないことを確認する
    - _要件: 1.1, 1.2, 1.9_

  - [x]* 6.2 `bun pm untrusted` の出力を記録する
    - **`bun install` の完了直後に実行する**（`node_modules` 未生成状態の 0 件報告は無効）
    - 標準出力の全文を記録項目として保存する。合否ゲートではない
    - _要件: 10.4, 10.5_

  - [x] 6.3 `.bun-version` を新規作成する
    - 内容は `1.3.14`（接頭辞 `v` なし、前後空白なし、末尾改行あり、1 行のみ）
    - _要件: 9.1_

  - [x] 6.4 `package.json` を Bun 運用向けに更新する
    - `packageManager: "bun@1.3.14"` を追加し、`.bun-version` の値と完全一致することを確認する
    - `scripts.ogp:refresh` を `"bun scripts/refresh-ogp-cache.ts"` に変更する
    - `scripts.blog:update` に `"bun scripts/update-aws-blog.ts"` を追加する
    - `devDependencies.tsx` を削除する
    - `scripts.test` は `"vitest --run"` を完全一致で維持する
    - `@types/bun` を追加しない。`trustedDependencies` フィールドも追加しない
    - 変更後に `bun install` を実行して `bun.lock` を更新する
    - _要件: 1.3, 1.6, 1.7, 2.4, 2.5, 8.2, 9.2, 10.1_

  - [x] 6.5 Bun ランタイム化の混入がないことを検証する
    - リポジトリルートおよび全サブディレクトリ（`node_modules` を除く）に `bunfig.toml` が 0 個であることを確認する
    - `package.json` の `scripts` および今後変更する workflow に `--bun` が 0 個であることを確認する
    - `package.json` に `trustedDependencies` キーが存在しないことを確認する（空配列も不可）
    - _要件: 2.2, 2.3, 10.1, 10.2_

  - [x] 6.6 ローカル Bun バージョンの整合を確認する
    - `bun --version` の出力が `.bun-version` の値と一致することを確認する
    - 不一致の場合は `bun upgrade --to 1.3.14` を実行し、再確認する
    - _要件: 9.6_

- [x] 7. Phase 1 完了ゲート
  - [x] 7.1 成果物の同一性を検証する（P1）
    - `bun run build` を実行する
    - `find dist -type f | wc -l` が Phase 0 と同数であることを確認する
    - `find dist -type f -exec shasum -a 256 {} \; | sort -k2 > /tmp/dist-bun.sha256`
    - `diff /tmp/dist-node.sha256 /tmp/dist-bun.sha256` が差分なしであることを確認する
    - _要件: 3.2, 3.3, 3.5, 3.6, 12.4_

  - [x] 7.2 テストの完全パスと実行ランタイムを検証する（P2 / P3）
    - `bun run test` が失敗 0 件・エラー 0 件で終了コード 0 を返すことを確認する
    - 報告件数が `Baseline_Test_Count` と完全一致することを確認する
    - テストプロセス内で `process.versions.bun` が `undefined`、`process.versions.node` のメジャーが `24` であることを確認する
    - `vi.stubGlobal` / `vi.mock` / `vi.unstubAllGlobals` が動作し、日本語テスト名が文字化けしないことを確認する
    - _要件: 2.1, 4.1, 4.2, 4.3, 4.6, 4.8, 12.4_

  - [x] 7.3 開発サーバの起動を検証する
    - `bun run dev` を実行し、astro の ready ログが出力されることを確認する
    - 表示された URL のトップページ（`/`）への HTTP GET が 200 を返すことを確認する
    - 確認後に開発サーバを停止する
    - _要件: 12.5_

  - [x] 7.4 OGP キャッシュ更新スクリプトを Bun で検証する
    - `bun scripts/refresh-ogp-cache.ts` を実行し、対象記事が全件成功することを確認する
    - 取得成功件数・取得失敗件数が出力されることを確認する
    - _要件: 7.2, 7.7_

  - [x] 7.5 クリーン環境で `--frozen-lockfile` を再検証する
    - `rm -rf node_modules dist` の後に `bun install --frozen-lockfile` を実行し、終了コード 0 を確認する
    - 実行前後で `bun.lock` の SHA-256 が一致することを確認する
    - 続けて `bun run test` / `bun run build` を実行し、`diff /tmp/dist-node.sha256 /tmp/dist-bun.sha256` が差分なしであることを確認する
    - _要件: 1.5, 1.8_

  - [x] 7.6 macOS ARM64 での展開プラットフォームを記録する
    - 対象 5 系統（`@tailwindcss/oxide` / `lightningcss` / `@rollup/rollup-*` / `@img/*` / `@esbuild/*`）について
      `node_modules` に展開されたパッケージが darwin-arm64 系のみであることを記録する
    - 他プラットフォーム向けディレクトリが 0 個であることを確認する
    - _要件: 13.2, 13.3_

  - [x] 7.7 切り戻し可能性を検証する（P5）
    - `test -f package-lock.json` が成功することを確認する
    - `npm ci --dry-run` が終了コード 0 で完了することを確認する
    - 失敗する場合は切り戻し不能と判定し、失敗した依存関係名と理由を記録する
    - _要件: 5.1, 5.2, 5.3_

  - [x] 7.8 Phase 1 を単独コミットする
    - `bun.lock` / `.bun-version` / `package.json` を対象に含める
    - `package-lock.json` を削除・リネームしないことを確認する
    - コミット前にユーザープロファイル（Individual / AWS）を確認し `git config` を設定する
    - _要件: 5.1, 5.6, 12.4_

- [x] 8. チェックポイント - Phase 1 完了
  - すべてのテストがパスしていることを確認し、疑問があればユーザーに確認する。

- [x] 9. Phase 2: CI の Bun 化
  - [x] 9.1 `.github/workflows/deploy.yml` を Bun 化する
    - `actions/setup-node@v5`（`node-version-file: .nvmrc` + `cache: npm` を含む）ステップを丸ごと削除し、
      `oven-sh/setup-bun@v2`（`bun-version-file: .bun-version`）に置換する
    - `npm ci` を `bun install --frozen-lockfile` に変更する
    - `npm run test` を `bun run test` に変更する
    - `withastro/action@v6` に `package-manager: bun` と `node-version: '24'` を明示する
    - `cache: npm` の指定と `--bun` 文字列が 0 個であることを確認する
    - _要件: 2.3, 6.1, 6.2, 6.3, 6.4, 6.8, 6.10, 6.11, 9.4_

  - [x] 9.2 `.github/workflows/update-aws-blog.yml` を Bun 化する
    - 現状は `actions/checkout@v4` / `actions/setup-node@v4`（`deploy.yml` の v5 とは異なる）
    - `setup-node@v4` は `node-version-file: .nvmrc` 付きで残し、`cache: npm` のみ削除する
    - `oven-sh/setup-bun@v2`（`bun-version-file: .bun-version`）を追加する
    - `npm ci` を `bun install --frozen-lockfile` に変更する
    - `npx tsx scripts/update-aws-blog.ts` を `bun scripts/update-aws-blog.ts` に変更する
    - _要件: 6.5, 6.6, 6.7, 6.9_

  - [x] 9.3 Phase 2 を単独コミットする
    - 対象は 2 つの workflow ファイルのみ。Phase 2 のみの revert で npm 経路に戻せる粒度を保つ
    - コミット前にユーザープロファイル（Individual / AWS）を確認し `git config` を設定する
    - _要件: 5.4, 5.5_

- [x] 10. Phase 2 完了ゲート
  - [x] 10.1 feature branch への push をユーザーに確認して実行する
    - **`git push` は自律実行しない。** CI 検証には push が必要なため、対象ブランチと内容を提示して
      ユーザーの明示的な承認を得る
    - 承認後に `git push -u origin <feature-branch>` を実行する（`master` へは push しない）
    - _要件: 12.6_

  - [x] 10.2 `deploy.yml` の build job の実行結果を確認する
    - feature branch 上で build job が成功することを確認する
    - Actions ログに `Setup Bun` と `Setup Node (Bun)` の完了が記録されていることを確認する
    - 全ステップのログを通じて `npm install` / `npm ci` の実行が 0 件であることを確認する
    - 1 件以上記録されている場合は `withastro/action` の `package-manager: bun` 指定を修正して再実行する
    - _要件: 6.12, 6.13, 12.6_

  - [x] 10.3 lockfile のプラットフォーム非依存性を確認する（移行の主目的）
    - macOS ARM64 で生成した `bun.lock` を使って Linux x64 CI の `bun install --frozen-lockfile` が
      終了コード 0 で完了することを確認する
    - 実行後に `bun.lock` に差分が 0 行であることを確認する
    - 失敗または差分がある場合は後続タスクを開始せず、不足・不一致となったパッケージ名と該当プラットフォームを記録する
    - _要件: 1.5, 13.1, 13.5, 6.14_

  - [x] 10.4 Linux x64 CI での展開プラットフォームを記録する
    - 対象 5 系統について展開されたパッケージが linux-x64 系のみであることを CI ログで記録する
    - 実行プラットフォーム対応パッケージが未展開の系統があれば後続タスクを開始せず記録する
    - _要件: 13.4, 13.6_

  - [x] 10.5 Pages artifact のファイル数を確認する（P1）
    - build job がアップロードした artifact のファイル数が `Baseline_Dist_Hashes` のエントリ数と一致することを確認する
    - _要件: 3.7_

  - [x] 10.6 `update-aws-blog.yml` を手動実行して OGP のサイレント劣化を検出する（P4）
    - `workflow_dispatch` で手動実行する
    - 実行ログに「OGPキャッシュの更新に失敗しました」が含まれないことを確認する
    - 取得成功件数・取得失敗件数が出力されていることを確認する
    - _要件: 7.4, 7.5_

- [x] 11. チェックポイント - Phase 2 完了
  - CI が成功していることを確認し、疑問があればユーザーに確認する。

- [x] 12. Phase 3: ドキュメント / steering の更新
  - [x] 12.1 `doc/blueprint.md` を更新する
    - 技術スタック表: パッケージ管理を Bun（ランタイムは Node を維持）に、
      Node バージョン管理を nvm（`.nvmrc`）/ Bun は `.bun-version` に更新する
    - アニメーション行を Tailwind `animate-*` + CSS + Astro CSS View Transitions の 3 要素を含む記述に更新する
      （`motion` の記載を除去）
    - ディレクトリ構成図に `bun.lock` / `package-lock.json`（切り戻し用に残置の注記付き）/ `.bun-version` / `.nvmrc`
      の 4 エントリを記載する
    - _要件: 11.1, 11.2, 11.3_

  - [x] 12.2 `.kiro/steering/tech.md` を更新する
    - テスト実行節: `bun run test` / `bunx vitest run <path>` に更新し、
      `bun test` が `vi.*` API 非対応のため使用不可である旨を明記する
    - デプロイ節: `oven-sh/setup-bun@v2` + `withastro/action@v6`（`package-manager: bun`）+ `actions/deploy-pages@v4`
      の 3 要素を記載する。**既存の `withastro/action@v5` という誤記も v6 に修正する**
    - 開発コマンド節: `bun install` / `bun run dev` / `bun run build` / `bun run preview` の 4 コマンドを記載する
    - 「Node バージョン」節を「ランタイムとパッケージマネージャ」節に置き換え、
      `bunfig.toml` の `[run] bun = true` を設定しない方針と `--bun` を付与しない方針の 2 点を記載する
    - _要件: 11.4, 11.5, 11.6, 11.7_

  - [x] 12.3 `.kiro/steering/development-standard.md` の rule-1 を更新する
    - 既存の Node 確認手順（`cat ./.nvmrc` / `node --version` / `nvm use`）に続けて、
      `cat ./.bun-version` / `bun --version` / 不一致時の `bun upgrade --to <version>` の手順を追加する
    - _要件: 9.6, 11.8_

  - [x] 12.4 lockfile 乖離の運用ルールを記載する
    - `bun update` 実行時に `bun.lock` のみが更新され `package-lock.json` と乖離することを明記する
    - 乖離の扱い（同期する / 乖離を許容しロールバック時に再生成する）の運用ルールを記載する
    - 記載先は 12.2 で更新した `.kiro/steering/tech.md` のランタイム節とする
    - _要件: 11.10_

  - [x] 12.5 `.kiro/specs/` に差分がないことを確認する
    - `.kiro/specs/` 配下の既存 spec 群（履歴文書）が本作業で変更されていないこと（差分 0 ファイル）を確認する
    - 本 spec の `.kiro/specs/bun-migration/` 配下は対象外
    - _要件: 11.9_

  - [x] 12.6 Phase 3 をコミットして push をユーザー確認する
    - コミット前にユーザープロファイル（Individual / AWS）を確認し `git config` を設定する
    - push はユーザーの明示的な承認を得てから実行する
    - _要件: 5.6, 12.7_

- [x] 13. 最終チェックポイント
  - すべてのテストがパスし、P1〜P5 の検証結果が揃っていることを確認し、疑問があればユーザーに確認する。

## Notes

- `*` 付きのサブタスクは任意。設計で「記録項目（合否ゲートではない）」と位置づけられている
  `bun pm untrusted` の記録・プラットフォーム別展開の記録・Phase 0 の既存テスト影響確認が該当する
- 本移行では新規のプロパティベーステストを追加しない（設計の Testing Strategy）。
  Correctness Properties P1〜P5 は該当タスク内のコマンド実行と CI ログ確認で検証する
- Phase 0 → 1 → 2 → 3 の順序は要件 12.7 の制約であり、Task Dependency Graph の wave 順序に反映している
- タスク 2.3 は要件 5.1 と 8.1 の競合を解消するためのユーザー確認を含む。
  ここで方針が決まるまで Phase 0 のコミット（4.2）に進まない
- `git push` を伴うタスク（10.1 / 12.6）は必ずユーザー承認を取る
- コミットを伴うタスク（4.2 / 7.8 / 9.3 / 12.6）は必ずユーザープロファイルを確認する
- タスク 6.4 で `package.json` の `devDependencies.tsx` は削除したが、`bun.lock` の `packages`
  セクションに `tsx@4.21.0` が残る。原因は `vite` の optional peer dependency
  （`peerDependenciesMeta.tsx.optional: true`）を、`package-lock.json` から移行した既存 lockfile の
  増分解決で Bun 1.3.14 が保持し続けるため。`bun install --force` / `bun remove tsx` では解消しない
- 要件 8.2（`package.json` の `devDependencies` / `scripts` に tsx を 0 件）は充足済みであり、
  tsx は直接依存から推移的な optional peer に格下げされた状態
- **将来対応**: `bun.lock` を削除して完全再解決すれば tsx は消えるが、`configVersion` が 0→1 に変わり
  約 250 パッケージが一斉更新され P1（`dist/` の SHA-256 完全一致）を壊す。したがって本 spec の範囲では
  実施しない。`package-lock.json` を削除する将来 PR（Open Question 6）で lockfile を再生成する際に
  合わせて解消する
- **Baseline_Test_Count = 86 tests / 9 test files**（Open Question 5 の確定値）。
  Phase 0 の `npm run test` と Phase 1 の `bun run test` の双方で同値を確認
- **Baseline_Dist_Hashes = dist 配下 25 ファイル**。`/tmp/dist-node.sha256` に保存。
  Phase 1 の `bun run build` 成果物（`/tmp/dist-bun.sha256`）と `diff` 差分 0 件（P1 合格）
- 7.5 のクリーン環境検証: `rm -rf node_modules dist` → `bun install --frozen-lockfile` で
  451 packages・終了コード 0、`bun.lock` の SHA-256 は実行前後一致。
  `bun pm untrusted` はクリーン環境でも 0 件
- 7.6 の記録（macOS ARM64）: `@tailwindcss/oxide` / `lightningcss` / `@rollup/rollup-*` / `@img/*` /
  `@esbuild/*` の 5 系統いずれも展開は darwin-arm64 系のみ（6 ディレクトリ）。他プラットフォーム向けは 0 個。
  lockfile は全プラットフォームを保持しつつ展開は実行プラットフォーム分のみという Bun の想定挙動を確認
- 7.7 の切り戻し検証（P5）: `npm ci --dry-run` が終了コード 0。
  `package-lock.json` / `bun.lock` / `node_modules` はいずれも無変更で、npm 経路への切り戻しが成立
- **Task 10（Phase 2 完了ゲート）の CI 検証 run**: `workflow_dispatch` / ref `feat/bun-migration`
  （HEAD `a4c0d4d`）/ run ID `31960256018`
  - build job は**成功**。ログは `/tmp/deploy-run-31960256018-build.log` に保存
  - deploy job は失敗。理由は
    `Branch "feat/bun-migration" is not allowed to deploy to github-pages due to environment protection rules.`
    → 環境保護ルールによるブロックであり**本番 Pages デプロイは実行されていない**。build job の検証結果には影響なし
- 10.2 の記録（要件 6.12 / 6.13）: `withastro/action@v6` 内部の `Setup Bun`（success, 1482ms）と
  `Setup Node (Bun)`（success, 3024ms）が両方記録。`Setup Node` / `Setup PNPM` / `Setup Deno` は skipped。
  内部で `node-version: 24` が渡り `node: v24.19.0` で起動。`npm install` / `npm ci` の実行は **0 件**
  （ログ中の `npm` 文字列は action の未実行分岐・ツール情報出力・ステップ表示名のみ）。
  `bun run test` は 9 files / **86 tests** 全パスで `Baseline_Test_Count` と一致
- 10.3 の記録（要件 1.5 / 13.1 / 13.5 / 6.14。移行の主目的）: macOS ARM64 生成の `bun.lock` で
  Linux x64（ubuntu-24.04 / bun-linux-x64 1.3.14）の `bun install --frozen-lockfile` が成功
  （455 packages / 1347ms、`bash -e` で後続ステップ実行＝終了コード 0）。lockfile 不整合エラー 0 件。
  `bun.lock` の blob SHA は `95bf95860b105bb63d32282da30a0e23fe4dbc2a` でローカル / リモート
  `feat/bun-migration` / CI checkout commit が一致し差分 0 行。withastro/action 内部の再 install は
  `Checked 463 installs across 571 packages (no changes)` を報告
- 10.5 の記録（要件 3.7 / P1）: Pages artifact（`github-pages`、Artifact ID 9267042675、1083254 bytes）の
  `Archive artifact` tar 一覧からディレクトリエントリを除いたファイル数は **25 件**で
  `Baseline_Dist_Hashes`（25 ファイル）と一致。相対パスの突き合わせも欠落 0 / 余剰 0
- **10.4 はユーザー判断でスキップ（未検証）**: 現行の `deploy.yml` のログには 5 系統
  （`@tailwindcss/oxide` / `lightningcss` / `@rollup/rollup-*` / `@img/*` / `@esbuild/*`）の
  個別パッケージ名が出力されない（Bun は直接依存のみ `+ pkg@ver` 形式で列挙し、サマリは
  `455 packages installed` のみ）。CI ログで linux-x64 のみの展開を記録するには
  `ls node_modules/...` を出力する一時ステップの追加が必要で、そのための workflow 変更と追加 push を
  避ける判断となった。**要件 13.4 / 13.6 は未充足のまま残る**。
  なお macOS ARM64 側の同等記録（7.6）は取得済みで、Linux x64 での `--frozen-lockfile` 成功（10.3）により
  移行の主目的自体は検証済み
- **10.6 はユーザー判断でスキップ（未検証）**: `update-aws-blog.yml` の `workflow_dispatch` は
  新着記事があるとブランチ作成 + PR 作成の副作用を伴うため実行しない判断となった。
  **要件 7.5（CI 実行ログでの P4 検証）は未充足**。OGP キャッシュ更新のログ検証自体は
  Phase 0 の 3.4（Node 環境）と Phase 1 の 7.4（`bun scripts/refresh-ogp-cache.ts`）で合格済みであり、
  P4 はローカル検証のみで担保している状態
- **`deploy.yml` の deploy job にブランチガードを追加（Task 10 の副産物対応）**:
  Task 10.2 の `workflow_dispatch`（ref `feat/bun-migration`）で deploy job の `environment: github-pages`
  により deployment レコードが作られ、`github-pages` 環境のブランチ保護（`master` のみ許可）で
  `waiting` → `failure` となり、PR #68 に「This branch had an error being deployed」が表示された
  - 対処 1: 失敗した deployment レコード（id `5933295392` / sha `a4c0d4df`）を
    `gh api -X DELETE repos/.../deployments/5933295392` で削除
    （削除後 `?ref=feat/bun-migration` の件数 0 を確認）
  - 対処 2: deploy job に `if: github.ref == 'refs/heads/master'` を追加。
    `master` への push および `master` 上の `workflow_dispatch` では従来どおり deploy が実行され、
    feature branch での `workflow_dispatch` では deploy job が skipped となり
    deployment レコードが作られない
  - Phase 2 の検証結果（10.2 / 10.3 / 10.5）は build job のみを根拠としているため再検証は不要。
    `design.md` の `deploy.yml` 構成記述にはこの `if` 条件が含まれていない点を差分として記録しておく
- **Phase 3 の実施記録（ブランチ `docs/bun-migration-phase3`、master `65069c7` から分岐）**
  - 12.1 `doc/blueprint.md`: 技術スタック表を「アニメーション = Tailwind `animate-*` + CSS transition +
    Astro CSS View Transitions」「パッケージ管理 = Bun（ランタイムは Node を維持）」
    「バージョン管理 = Node は nvm（`.nvmrc`）、Bun は `.bun-version`」に更新。
    ディレクトリ構成のツリー末尾に `bun.lock` / `package-lock.json`（切り戻し用に残置の注記付き）/
    `.bun-version` / `.nvmrc` の 4 エントリを記載し、`└──` の重複記法も修正
  - 12.2 `.kiro/steering/tech.md`: テスト実行を `bun run test` / `bunx vitest run <path>` に更新し
    `bun test` が `vi.*` API 非対応で使用不可である旨を明記。デプロイ節の `withastro/action@v5` の誤記を
    **v6 に修正**し、`oven-sh/setup-bun@v2` + `withastro/action@v6`（`package-manager: bun`）+
    `actions/deploy-pages@v4` の 3 要素と deploy job のブランチガードを記載。
    開発コマンドを `bun install` / `bun run dev` / `bun run build` / `bun run preview` に更新。
    「Node バージョン」節を「ランタイムとパッケージマネージャ」節に置き換え、
    `bunfig.toml` の `[run] bun = true` を設定しない方針と `--bun` を付けない方針を記載
  - 12.3 `.kiro/steering/development-standard.md`: rule-1 を「Node と Bun のバージョン確認」に拡張し、
    `### Node`（既存 3 ステップ）+ `### Bun`（`cat ./.bun-version` / `bun --version` /
    不一致時 `bun upgrade --to <version>`）の構成に更新
  - 12.4 lockfile 乖離の運用ルール: `tech.md` の「ランタイムとパッケージマネージャ」節に
    `### lockfile の運用` サブ節を新設。`bun update` で `bun.lock` のみ更新され `package-lock.json` と
    乖離すること、**乖離は許容し npm ロールバック時に `package-lock.json` を再生成する**運用を明記
  - 12.5 `.kiro/specs/` 配下の差分は本 spec の `design.md` のみで、既存 spec 群（履歴文書）の差分は **0 件**
  - 追随修正: `design.md` の Phase 2 セクションに deploy job の
    `if: github.ref == 'refs/heads/master'` を反映し、追加理由を注記（design と実装の差分を解消）
- **最終チェックポイント（Task 13）の結果: ユーザー承認により完了**
  - P1（成果物同一性）: **合格**。ローカル `bun run build` の `dist/` 25 ファイルが Node ベースラインと
    SHA-256 完全一致（7.1）。CI の Pages artifact も 25 ファイルで一致（10.5）
  - P2（テスト件数）: **合格**。9 files / 86 tests がローカル（7.2）と CI（10.2）の双方で
    `Baseline_Test_Count` と一致
  - P3（実行ランタイム）: **合格**。テストプロセス内で `process.versions.bun` は `undefined`、
    `process.versions.node` は 24 系（7.2）
  - P4（OGP のサイレント劣化検出）: **ローカルのみ合格**。3.4（Node 環境）と
    7.4（`bun scripts/refresh-ogp-cache.ts`）で検証済みだが、CI 実行ログでの検証（10.6 / 要件 7.5）は未充足
  - P5（切り戻し可能性）: **合格**。`npm ci --dry-run` が終了コード 0、`package-lock.json` は残置（7.7）
  - **未充足のまま残す要件**: 13.4 / 13.6（Linux x64 CI での 5 系統の展開プラットフォーム記録 = 10.4）と
    7.5（CI 実行ログでの P4 検証 = 10.6）。いずれも記録項目であり、移行の主目的
    （macOS ARM64 生成の `bun.lock` が Linux x64 CI の `--frozen-lockfile` を通る）は 10.3 で検証済み
  - 本番デプロイの実績: `master` へのマージ（merge commit `9479c2c`）で走った run `31961683874` が
    build / deploy ともに成功し、`/` `/gallery/` `/history/` が HTTP 200、`/catalog/` が 404 であることを確認。
    Bun 経路での本番デプロイが成立
  - Phase 3 の PR: #70（ブランチ `docs/bun-migration-phase3`、コミット `9348ca8`）
- **後続対応: `bun.lock` の完全再生成と `package-lock.json` の削除（別 PR / ブランチ `chore/regenerate-bun-lock`）**
  - 上記 Notes に「将来対応」として残していた `tsx@4.21.0` の残置解消を、ユーザー承認のうえ実施した
  - `package-lock.json` を残したまま `bun.lock` だけ削除すると Bun が再マイグレートして同じ状態に戻るため、
    両方の削除が必要だった
  - 結果: `tsx` はパッケージとして消滅（`node_modules/tsx` なし。`bun.lock` に残る 1 箇所は `vite` の
    `peerDependencies` 宣言文字列のみでインストール対象ではない）。`configVersion` は 0 → 1、
    パッケージ数 579 → 586
  - 副作用: 直接依存 11 個が `^` 範囲内で更新（daisyui 5.5.19 → 5.7.17、tailwindcss と `@tailwindcss/vite`
    4.2.0 → 4.3.3、vitest 4.0.18 → 4.1.10、astro 5.18.1 → 5.18.2、fast-check 4.5.3 → 4.9.0、
    fast-xml-parser 5.5.8 → 5.11.0、`@astrojs/check` 0.9.8 → 0.9.10、`@astrojs/sitemap` 3.7.0 → 3.7.3、
    `@iconify-json/devicon` 1.2.59 → 1.2.62、`@iconify-json/simple-icons` 1.2.71 → 1.2.93）
  - 検証: テスト 9 files / 86 tests 全パス。ビルド成功、`dist/` は 25 ファイルで構成同一。
    **P1（SHA-256 完全一致）は意図的に破棄**した。差分は `gallery.*.css`（53,865 → 60,432 バイト、
    daisyUI / Tailwind の内部再構成）と、それを参照する HTML 3 枚（Astro バージョン meta と
    CSS ファイル名ハッシュのみ）。見た目はユーザーが目視確認済み
  - **P5（`npm ci` による切り戻し）はユーザー判断で放棄**。ロールバックは Git revert に一本化し、
    npm へ戻す場合は `package-lock.json` の再生成が必要になる

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "3.1"] },
    { "id": 3, "tasks": ["2.2", "3.2"] },
    { "id": 4, "tasks": ["2.3", "3.3"] },
    { "id": 5, "tasks": ["3.4", "3.5"] },
    { "id": 6, "tasks": ["4.1"] },
    { "id": 7, "tasks": ["4.2"] },
    { "id": 8, "tasks": ["6.1"] },
    { "id": 9, "tasks": ["6.2", "6.3"] },
    { "id": 10, "tasks": ["6.4"] },
    { "id": 11, "tasks": ["6.5", "6.6"] },
    { "id": 12, "tasks": ["7.1", "7.2"] },
    { "id": 13, "tasks": ["7.3", "7.4"] },
    { "id": 14, "tasks": ["7.5"] },
    { "id": 15, "tasks": ["7.6", "7.7"] },
    { "id": 16, "tasks": ["7.8"] },
    { "id": 17, "tasks": ["9.1", "9.2"] },
    { "id": 18, "tasks": ["9.3"] },
    { "id": 19, "tasks": ["10.1"] },
    { "id": 20, "tasks": ["10.2", "10.3", "10.5"] },
    { "id": 21, "tasks": ["10.4", "10.6"] },
    { "id": 22, "tasks": ["12.1", "12.2", "12.3"] },
    { "id": 23, "tasks": ["12.4"] },
    { "id": 24, "tasks": ["12.5"] },
    { "id": 25, "tasks": ["12.6"] }
  ]
}
```
