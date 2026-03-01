# 技術スタック

## フレームワーク・言語
- Astro 5.x（SSG）
- TypeScript（strict mode）

## スタイリング
- Tailwind CSS v4（`@tailwindcss/vite` プラグイン経由）
- DaisyUI v5（Tailwind v4ネイティブ）
- カラー空間: OKLCH（`--color-*` カスタムプロパティで定義）

## アニメーション
- CSS transition + `astro:page-load` イベントによるページロード時フェードイン（`inView()` は View Transitions との互換性問題のため不使用）
- Astro `<ClientRouter />` によるCSS View Transitions

## アイコン
- `astro-icon` + `@iconify-json/devicon` + `@iconify-json/simple-icons`
- 固定カラーを持つカスタムアイコン（Kiro・Dify等）は `src/components/atoms/` に専用コンポーネント（`KiroIcon.astro`・`DifyIcon.astro`）としてSVGを直接インライン展開する
  - `astro-icon` はIconify形式でfill色を正規化するため、ブランドカラーが失われる場合はこの方式を採用する
  - `src/icons/` ディレクトリは使用しない

## コンテンツ管理
- Astro Content Collections（Content Layer API）
- ローダー: `file()`（JSONファイル）
- コレクション: `blogAws` / `blogOther` / `gallery` / `skills` / `career`

## OGP取得
- ビルド時に `src/lib/fetchOgp.ts` で外部URLからOGPメタタグをfetch・静的埋め込み
- `blog` コレクションは `externalUrl` のみ管理、title/description/ogpImage/publishedAtは自動取得
- `article:published_time` メタタグから投稿日を取得し、取得できない場合は `null`

## デプロイ
- GitHub Pages（`https://yosse95ai.github.io`）
- GitHub Actions（`withastro/action@v5` + `actions/deploy-pages@v4`）
- `master` ブランチへのプッシュでトリガー

## よく使うコマンド
```bash
npm run dev      # 開発サーバー起動
npm run build    # 本番ビルド
npm run preview  # ビルド結果のプレビュー
npm run test     # ユニットテスト実行（Vitest）
```

## Node バージョン
`.nvmrc` で管理。`nvm use` で切り替え。

## Gitルール
`git push` は勝手に行わない。

## テスト
- フレームワーク: Vitest
- テストファイルは `src/tests/` に配置（`*.test.ts`）
- `src/lib/` の TypeScript ユーティリティには対応するテストを作成する
- ユニットテストの必要性がある場合はTDDを行う。Red-Green-Refactorメソッドにのっとる。

### テスト実行コマンド
`cd` は使用不可。テストはプロジェクトルートから以下のコマンドで実行する。

```bash
npx vitest run          # 全テスト（ワンショット）
npx vitest run <path>   # 特定ファイルのみ
```

`npm run test -- --run` は `--run` が二重になりエラーになるため使わない。

## typescript
### DONOT's
- any型は使わない。
- 不必要にunknown方を使わない。
- TypeScriptのベストプラクティスに従うこと。