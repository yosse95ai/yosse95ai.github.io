# 要件定義書

**プロジェクト:** 個人ホームページ — yosse95ai.github.io
**URL:** https://yosse95ai.github.io
**作成日:** 2026-02-23
**ステータス:** ドラフト

---

## 1. 概要

AWSに勤務するソフトウェアエンジニアの個人紹介サイト。主にKiroのブログ記事の翻訳・執筆に携わっており、その活動を含む自己紹介を目的とする。特定のターゲットを設けず、インターネット上の全ての人に公開する。

---

## 2. 目的

- オーナーの職歴・現在のAWSでの役割を紹介する
- 翻訳・執筆したブログ記事（Kiro関連およびその他）をOGPカード形式で一覧表示する
- 経歴をタイムライン形式で提示する
- 技術スキルを一覧表示する
- SNS・開発者プラットフォームへのリンクを提供する
- 飼い猫の写真ギャラリーを掲載する

---

## 3. 対象ユーザー

特定の想定なし。全ての人。

---

## 4. ページ構成・コンテンツ

### 4.1 トップページ (`/`)

レイアウト: Bento Grid（モジュラーカード型レイアウト）

| セクション | 内容 |
|---|---|
| ヒーロー / 自己紹介 | 名前・役職（AWSエンジニア）・短い自己紹介・Kiroブログへの関与 |
| 経歴タイムライン | 大学 → 大学院 → AWS（現在） |
| スキル | カテゴリ別技術スキル一覧 |
| ブログ記事一覧 | 翻訳・執筆記事のOGPカード一覧 |
| SNSリンク | GitHub、LinkedIn、Qiita、Zenn |

### 4.2 ギャラリーページ (`/gallery`)

- `img/` フォルダの猫の写真をグリッド表示
- ダウンロード不可（CSS/JSによる右クリック・長押し防止）
- ライトボックス不要（MVP）

---

## 5. コンテンツ詳細

### 5.1 ブログ記事

- 表示形式: OGPカード（サムネイル・タイトル・説明・日付・記事種別バッジ）
- 記事種別: `translation`（翻訳） / `original`（執筆）
- 各カードは外部記事URLへリンク
- Astro Content Collections（Markdownファイル）で管理

### 5.2 経歴タイムライン

- エントリー: 大学 → 大学院 → AWS（現在）
- 具体的な学校名・学部・在籍期間はオーナーから提供

### 5.3 スキル

- カテゴリ: `cloud`、`language`、`framework`、`tool`、`other`
- Astro Content Collections（JSONファイル）で管理
- 具体的なスキル一覧はオーナーから提供

### 5.4 SNSリンク

| プラットフォーム | 表示 |
|---|---|
| GitHub | アイコン + リンク |
| LinkedIn | アイコン + リンク |
| Qiita | アイコン + リンク |
| Zenn | アイコン + リンク |

---

## 6. デザイン要件

### 6.1 スタイル

- モダン・クリーンな雰囲気
- Bento Gridレイアウト（カード型・非対称グリッド）
- 余白を広めに取る

### 6.2 カラーパレット

| 役割 | 方針 |
|---|---|
| 背景 | オフホワイト基調（真っ白は避ける）例: `oklch(0.98 0.005 120)` |
| テキスト | ダークグレー（真っ黒は避ける）例: `oklch(0.20 0.010 250)` |
| Primary | 緑系アクセント（ボタン・リンク・強調） |
| Secondary | くすんだグリーングレー（バッジ・サブ要素） |
| ボーダー | ソフトなニュートラル |

カラー空間: OKLCH（P3ディスプレイ対応・知覚的均一性のため）

### 6.3 タイポグラフィ

- 日本語: Noto Sans JP
- 欧文 / UI: Inter
- 等幅: JetBrains Mono

### 6.4 アニメーション

- スクロールトリガーによるフェードイン・スライドイン（Motion `inView()`）
- ページ遷移アニメーション（Astro `<ClientRouter />` によるCSS View Transitions）
- ホバー時のマイクロインタラクション（DaisyUI + Tailwindトランジション）

### 6.5 レスポンシブ対応

- モバイルファースト
- Bento Gridは小画面で縦積みに変換
- Tailwind CSS v4のブレークポイントを使用

---

## 7. 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Astro 5.x |
| 言語 | TypeScript（strict mode） |
| スタイリング | Tailwind CSS v4（`@tailwindcss/vite`） |
| UIコンポーネント | DaisyUI v5（Tailwind v4ネイティブ、React不要） |
| アニメーション | Motion（Vanilla JS API）+ Astro CSS View Transitions |
| パッケージ管理 | pnpm |
| コンテンツ管理 | Astro Content Collections（Content Layer API） |
| デプロイ | GitHub Actions（`withastro/action`）→ GitHub Pages |

### 7.1 コンポーネント設計

Atomic Designパターンを採用:

```
src/components/
├── atoms/       # Button, Badge, Icon, Tag など
├── molecules/   # OgpCard, SkillItem, SocialLink, TimelineItem など
├── organisms/   # HeroSection, CareerTimeline, SkillsGrid, BlogList, PhotoGrid など
└── templates/   # BaseLayout など
```

### 7.2 Content Collectionsスキーマ

| コレクション | ローダー | 主なフィールド |
|---|---|---|
| `blog` | `glob`（Markdown） | title, description, pubDate, externalUrl, ogpUrl, type（translation/original）, tags, draft |
| `gallery` | `file`（JSON） | id, title, src, alt, width, height, takenAt |
| `skills` | `file`（JSON） | id, name, category, level, icon, url |

### 7.3 ディレクトリ構成

```
yosse95ai.github.io/
├── .github/workflows/deploy.yml
├── public/
│   ├── favicon.svg
│   └── images/gallery/
├── src/
│   ├── content.config.ts
│   ├── data/
│   │   ├── blog/*.md
│   │   ├── gallery/cats.json
│   │   └── skills/skills.json
│   ├── components/
│   │   ├── atoms/
│   │   ├── molecules/
│   │   ├── organisms/
│   │   └── templates/
│   ├── pages/
│   │   ├── index.astro
│   │   └── gallery.astro
│   └── styles/global.css
├── astro.config.mjs
├── tsconfig.json
└── pnpm-lock.yaml
```

---

## 8. 非機能要件

| 項目 | 要件 |
|---|---|
| 言語 | 日本語のみ |
| 多言語対応 | 不要（MVP） |
| ダークモード | 不要（MVP） |
| ブログCMS | 不要（MVP）— 静的Markdownファイルのみ |
| 画像ダウンロード | ギャラリーページで無効化 |
| パフォーマンス目標 | Core Web Vitals: LCP < 2.5s、CLS < 0.1、INP < 200ms |
| 画像フォーマット | Astro Imageコンポーネントによる WebP 変換 |
| ブラウザサポート | モダンブラウザ（Chrome・Firefox・Safari・Edge 最新2バージョン） |

---

## 9. デプロイ

| 項目 | 詳細 |
|---|---|
| ホスティング | GitHub Pages |
| CI/CD | GitHub Actions（`withastro/action@v3` + `actions/deploy-pages@v4`） |
| トリガー | `main` ブランチへのプッシュ |
| サイトURL | https://yosse95ai.github.io |
| ベースパス | 不要（リポジトリ名がユーザー名と一致するため） |

---

## 10. MVPスコープ外

- ダークモード切り替え
- 多言語対応（i18n）
- ブログCMS・動的コンテンツ更新
- お問い合わせフォーム
- 検索機能
- アナリティクス連携
- ギャラリーのライトボックス表示

---

## 11. 未確定事項（実装前にオーナーから提供が必要）

| # | 項目 |
|---|---|
| 1 | ブログ記事URL一覧（翻訳・執筆）とOGP画像URL |
| 2 | 経歴詳細（学校名・学部・在籍期間） |
| 3 | スキル一覧（カテゴリ・習熟度） |
| 4 | 各SNSアカウントURL（GitHub・LinkedIn・Qiita・Zenn） |
| 5 | プロフィール写真（ヒーローセクションで使用する場合） |
| 6 | Bento Gridのレイアウト構成（カード配置・サイズ） |
| 7 | ファビコン・サイトアイコン |
