# 技術スタック

## フレームワーク・言語
- Astro 5.x（SSG）
- TypeScript（strict mode）

## スタイリング
- Tailwind CSS v4（`@tailwindcss/vite` プラグイン経由）
- DaisyUI v5（Tailwind v4ネイティブ）
- カラー空間: OKLCH（`--color-*` カスタムプロパティで定義）

## アニメーション
- Motion（Vanilla JS `inView()` によるスクロールトリガー）
- Astro `<ClientRouter />` によるCSS View Transitions

## アイコン
- `astro-icon` + `@iconify-json/devicon` + `@iconify-json/simple-icons`
- カスタムアイコンは `src/icons/` に配置

## コンテンツ管理
- Astro Content Collections（Content Layer API）
- ローダー: `file()`（JSONファイル）
- コレクション: `blog` / `gallery` / `skills` / `career`

## OGP取得
- ビルド時に `src/lib/fetchOgp.ts` で外部URLからOGPメタタグをfetch・静的埋め込み
- `blog` コレクションは `externalUrl` と `type` のみ管理、title/description/ogpImageは自動取得

## デプロイ
- GitHub Pages（`https://yosse95ai.github.io`）
- GitHub Actions（`withastro/action@v3` + `actions/deploy-pages@v4`）
- `main` ブランチへのプッシュでトリガー

## よく使うコマンド
```bash
npm run dev      # 開発サーバー起動
npm run build    # 本番ビルド
npm run preview  # ビルド結果のプレビュー
```

## Node バージョン
`.nvmrc` で管理。`nvm use` で切り替え。

## Gitルール
`git push` は勝手に行わない。
