# 要件定義書

**プロジェクト:** 個人ホームページ — yosse95ai.github.io
**URL:** https://yosse95ai.github.io
**作成日:** 2026-02-23
**ステータス:** 確定

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
| ヘッダー | サイト名・ナビゲーションリンク（トップ・ギャラリー・ヒストリー） |
| ヒーロー / 自己紹介 | 名前・役職（AWSエンジニア）・短い自己紹介・Kiroブログへの関与 |
| 経歴タイムライン | 最新3件を縦タイムラインで表示。4件以上の場合は「全てを見る」ボタンを表示し `/history` へ遷移 |
| スキル | カテゴリ別技術スキル一覧 |
| ブログ記事一覧 | 翻訳・執筆記事のOGPカード一覧 |
| SNSリンク | GitHub、LinkedIn、Qiita、Zenn |

### 4.2 ギャラリーページ (`/gallery`)

- `img/` フォルダの猫の写真をグリッド表示
- ダウンロード不可（CSS/JSによる右クリック・長押し防止）
- ライトボックス不要（MVP）

### 4.3 ヒストリーページ (`/history`)

- 全経歴エントリーを縦タイムラインで表示
- エントリー数に関わらず常にヘッダーナビからアクセス可能
- トップページの「全てを見る」ボタンは4件以上の場合のみ表示

---

## 5. コンテンツ詳細

### 5.1 ブログ記事

- 表示形式: OGPカード（サムネイル・タイトル・説明・記事種別バッジ）
- 記事種別: `translation`（翻訳） / `original`（執筆）
- 各カードは外部記事URLへリンク
- Astro Content Collections（Markdownファイル）で管理
- OGPデータ（タイトル・説明・OGP画像URL）は**ビルド時にfetchして静的生成**する（SSG）
  - Markdownファイルには `externalUrl` と `type` のみ記載
  - ビルド時に各URLへNode.jsからfetchしてOGPメタタグを解析・埋め込む
  - `ogpUrl` フィールドは不要（自動取得のため）

### 5.2 経歴タイムライン

- エントリー: 大学 → 大学院 → AWS（現在）
- 確定情報:
  - 九州工業大学 情報工学部 知能情報工学科（2017年4月〜2021年3月）
  - 九州工業大学 大学院 先端情報工学修士・情報工学（2021年4月〜2023年3月）
  - Amazon Web Services（AWS） Solutions Architect・正社員（2023年4月〜現在）

### 5.3 スキル

- カテゴリ: `cloud`、`language`、`framework`、`tool`、`other`
- Astro Content Collections（JSONファイル）で管理
- 習熟度（level）は不要

| カテゴリ | スキル名 | URL | Iconify ID |
|---|---|---|---|
| cloud | AWS | https://aws.amazon.com | devicon:amazonwebservices-wordmark |
| language | TypeScript | https://www.typescriptlang.org | devicon:typescript |
| language | Python | https://www.python.org | devicon:python |
| language | C# | https://dotnet.microsoft.com/languages/csharp | devicon:csharp |
| language | C++ | https://isocpp.org | devicon:cplusplus |
| language | JavaScript | https://developer.mozilla.org/docs/Web/JavaScript | devicon:javascript |
| language | Ruby | https://www.ruby-lang.org | devicon:ruby |
| framework | React | https://react.dev | devicon:react |
| framework | React Native | https://reactnative.dev | devicon:react |
| framework | Angular | https://angular.dev | devicon:angular |
| framework | Flask | https://flask.palletsprojects.com | devicon:flask |
| framework | LangChain | https://www.langchain.com | simple-icons:langchain |
| framework | Ruby on Rails | https://rubyonrails.org | devicon:rails |
| framework | Unity | https://unity.com | devicon:unity |
| tool | AWS Amplify | https://aws.amazon.com/amplify | simple-icons:awsamplify |
| tool | Docker | https://www.docker.com | devicon:docker |
| tool | Amazon SageMaker | https://aws.amazon.com/sagemaker | simple-icons:amazonsagemaker |
| tool | OpenCV | https://opencv.org | devicon:opencv |
| tool | Dify | https://dify.ai | -（未収録） |
| other | 医療情報技師（資格） | https://www.jami.jp/jadite | - |
| other | 応用情報技術者（資格） | https://www.ipa.go.jp/shiken/kubun/ap.html | - |

### 5.4 SNSリンク

| プラットフォーム | 表示 | URL |
|---|---|---|
| GitHub | アイコン + リンク | https://github.com/yosse95ai |
| LinkedIn | アイコン + リンク | https://www.linkedin.com/in/hiroaki-yoshimura/ |
| Qiita | アイコン + リンク | https://qiita.com/yosse95ai |
| Zenn | アイコン + リンク | https://zenn.dev/yosse95ai |

---

## 6. デザイン要件

### 6.1 スタイル

- モダン・クリーンな雰囲気
- Bento Gridレイアウト（カード型・非対称グリッド）、参考: [Bentofolio](https://astro.build/themes/details/bento-grid-portfolio/)
- 余白を広めに取る
- カードスタイル: 角丸・オフホワイト背景・ソフトシャドウ

**デスクトップ（12カラムグリッド）カード配置:**

```
┌───────────────────────────┬─────────────┐
│  Hero（名前・役職・自己紹介・写真）      │ SNSリンク   │
│  col-span-8               │ col-span-4  │
├─────────────┬─────────────┴─────────────┤
│  Career     │  Skills                   │
│  Timeline   │  （カテゴリ別バッジグリッド）│
│  col-span-4 │  col-span-8               │
├─────────────┴───────────────────────────┤
│  Blog 記事一覧（OGPカード横スクロール）  │
│  col-span-12                            │
└─────────────────────────────────────────┘
```

**モバイル:** 全カード縦積み（Hero → SNS → Timeline → Skills → Blog）

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
| パッケージ管理 | npm |
| Nodeバージョン管理 | nvm |
| コンテンツ管理 | Astro Content Collections（Content Layer API） |
| アイコン | `@iconify/astro` + `@iconify-json/devicon` + `@iconify-json/simple-icons` |
| デプロイ | GitHub Actions（`withastro/action`）→ GitHub Pages |

### 7.1 コンポーネント設計

Atomic Designパターンを採用:

```
src/components/
├── atoms/       # Button, Badge, Icon, Tag など
├── molecules/   # OgpCard, SkillItem, SocialLink, TimelineItem など
├── organisms/   # Header, HeroSection, CareerTimeline, SkillsGrid, BlogList, PhotoGrid など
└── templates/   # BaseLayout など
```

### 7.2 Content Collectionsスキーマ

| コレクション | ローダー | 主なフィールド |
|---|---|---|
| `blog` | `glob`（Markdown） | externalUrl, type（translation/original）, tags, draft ※title・description・ogpImageはビルド時OGP fetchで自動取得 |
| `gallery` | `file`（JSON） | id, title, src, alt, width, height, takenAt |
| `skills` | `file`（JSON） | id, name, category, icon, url |
| `career` | `file`（JSON） | id, organization, role, startDate, endDate（nullable）, description ※表示時は startDate 降順（最新が上）|

### 7.3 ディレクトリ構成

```
yosse95ai.github.io/
├── .github/workflows/deploy.yml
├── public/
│   ├── favicon.svg
│   ├── images/
│   │   ├── icon.jpg        # プロフィール写真
│   │   └── gallery/        # 猫写真
├── src/
│   ├── content.config.ts
│   ├── lib/
│   │   └── fetchOgp.ts     # ビルド時OGP取得ユーティリティ
│   ├── data/
│   │   ├── blog/*.md
│   │   ├── gallery/cats.json
│   │   ├── skills/skills.json
│   │   └── career/career.json
│   ├── components/
│   │   ├── atoms/
│   │   ├── molecules/
│   │   ├── organisms/
│   │   └── templates/
│   ├── pages/
│   │   ├── index.astro
│   │   ├── gallery.astro
│   │   └── history.astro
│   └── styles/global.css
├── astro.config.mjs
├── tsconfig.json
└── package-lock.json
└── .nvmrc
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

## 11. 未確定事項

全項目確定済み。実装を開始できる状態。
