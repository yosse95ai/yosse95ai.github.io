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
- コレクション: `blogAws` / `blogOther` / `gallery` / `skills` / `career`

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
npx vitest run          # 全テスト（ワンショット）
npx vitest run <path>   # 特定ファイルのみ
```
- `cd` コマンドは使用不可
- `npm run test -- --run` は `--run` が二重になるため**使わない**

## デプロイ
- GitHub Pages（`https://yosse95ai.github.io`）
- GitHub Actions: `withastro/action@v5` + `actions/deploy-pages@v4`
- `master` ブランチへの push でトリガー
- **`git push` は自律的に実行しない**（必ずユーザー確認を取る）

## 開発コマンド
```bash
npm run dev      # 開発サーバー起動
npm run build    # 本番ビルド
npm run preview  # ビルド結果プレビュー
```

## Node バージョン
`.nvmrc` で管理。`nvm use` で切り替え。
