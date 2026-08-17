---
inclusion: always
---

# 技術スタック

## コア技術
- **Astro 5.x**（SSG）+ **TypeScript**（strict mode）
- **Tailwind CSS v4**（`@tailwindcss/vite` 経由）+ **DaisyUI v5**（Tailwind v4ネイティブ）
- カラー定義: OKLCH（`global.css` の `@theme` ブロックで `--color-*` カスタムプロパティ）

## TypeScript ルール
- `any` 型禁止。不必要な `unknown` 型も避ける
- strict mode 準拠。TypeScript ベストプラクティスに従う

## スタイリング規約
- Tailwind ユーティリティクラスを基本とする
- DaisyUI コンポーネントクラス（`btn`, `badge`, `card` 等）を積極活用
- レスポンシブはモバイルファースト（Tailwind ブレークポイント）

## アイコン
- 通常: `astro-icon` + `@iconify-json/devicon` / `@iconify-json/simple-icons`
- ブランドカラーが必要なカスタムアイコン（Kiro・Dify 等）: `src/components/atoms/` に専用 `.astro` コンポーネントとして SVG をインライン展開
  - `astro-icon` は fill 色を正規化するためブランドカラーが失われる場合にこの方式を採用
  - `src/icons/` ディレクトリは**使用しない**

## アニメーション
- CSS transition + `astro:page-load` イベントでページロード時フェードイン
- `inView()` は View Transitions との互換性問題のため**使用しない**
- Astro `<ClientRouter />` による CSS View Transitions

## コンテンツ管理
- Astro Content Collections（Content Layer API）、ローダー: `file()`（JSON）
- コレクション: `blogAws` / `blogOther` / `gallery` / `skills` / `career` / `oss` / `speaking`

## OGP 取得
- ビルド時に `src/lib/fetchOgp.ts` で外部 URL から OGP メタタグを fetch・静的埋め込み
- `blog` コレクションは `externalUrl` のみ保持。title / description / ogpImage / publishedAt は自動取得
- `article:published_time` メタタグから投稿日を取得。取得不可の場合は `null`

## テスト
- フレームワーク: **Vitest**
- テストファイル配置: `src/tests/*.test.ts`
- `src/lib/` の TypeScript ユーティリティには対応するテストを必ず作成する
- TDD（Red → Green → Refactor）を採用

### テスト実行（プロジェクトルートから）
```bash
bun run test            # 全テスト（ワンショット）
bunx vitest run <path>  # 特定ファイルのみ
```
- `cd` コマンドは使用不可
- **`bun test` は使用不可**。Bun ネイティブランナーは Vitest の `vi.*` API（`vi.mock` / `vi.stubGlobal` 等）に非対応のため、テストは必ず Vitest 経由で実行する
- `bun run test -- --run` は `--run` が二重になるため**使わない**（`scripts.test` が既に `vitest --run`）

## デプロイ
- GitHub Pages（`https://yosse95ai.github.io`）
- GitHub Actions: `oven-sh/setup-bun@v2`（`bun-version-file: .bun-version`）+ `withastro/action@v6`（`package-manager: bun` / `node-version: '24'`）+ `actions/deploy-pages@v4`
- `master` ブランチへの push でトリガー
- deploy job は `if: github.ref == 'refs/heads/master'` でガードしており、feature branch からは実行されない
- `withastro/action@v6` の `package-manager: bun` は、`package-lock.json` が無くなった後も**明示を維持する**（lockfile による自動検出に依存しない）
- **`git push` は自律的に実行しない**（必ずユーザー確認を取る）

## 開発コマンド
```bash
bun install      # 依存インストール
bun run dev      # 開発サーバー起動
bun run build    # 本番ビルド
bun run preview  # ビルド結果プレビュー
```

## ランタイムとパッケージマネージャ
- ランタイムは **Node 24**。`.nvmrc` で管理し `nvm use` で切り替える
- パッケージマネージャは **Bun 1.3.14**。`.bun-version` で管理し、`package.json` の `packageManager` と一致させる
- `bunfig.toml` の `[run] bun = true` は**設定しない**
- スクリプト実行時に `--bun` フラグは**付けない**
- 上記 2 点はいずれも Astro / Vitest を Node ランタイムで動かし続けるための方針

### lockfile の運用
- lockfile は **`bun.lock` のみ**。`package-lock.json` は削除済みで、リポジトリに存在しない
- 更新は `bun install` / `bun update` で行う。他のパッケージマネージャの lockfile は生成・コミットしない
- CI は `bun install --frozen-lockfile` を使うため、依存を変更したら `bun.lock` を必ず同じコミットに含める
- ロールバックは **Git の revert** で行う（`bun.lock` と `package.json` をセットで戻す）
- npm へ切り戻す必要が生じた場合は `package-lock.json` の再生成（`npm install --package-lock-only` 相当）が必要になる
