# プロジェクト構成

## ディレクトリ構造

```
src/
├── components/
│   ├── atoms/       # Button, Badge, Icon, Tag など最小単位
│   ├── molecules/   # OgpCard, SkillItem, SocialLink, TimelineItem など
│   ├── organisms/   # Header, HeroSection, CareerTimeline, SkillsGrid, BlogList, PhotoGrid など
│   └── templates/   # BaseLayout など
├── data/
│   ├── blog/articles.json      # externalUrl, type, tags, draft
│   ├── gallery/img.json        # id, src, alt, width, height, takenAt
│   ├── skills/skills.json      # id, name, category, icon, url
│   └── career/career.json      # id, organization, role, startDate, endDate, description
├── lib/
│   └── fetchOgp.ts             # ビルド時OGP取得ユーティリティ
├── pages/
│   ├── index.astro             # トップページ（Bento Grid）
│   ├── gallery.astro           # 猫写真ギャラリー
│   └── history.astro           # 全経歴タイムライン
├── styles/
│   └── global.css              # Tailwind import, DaisyUI plugin, テーマ変数
├── icons/                      # カスタムSVGアイコン
└── content.config.ts           # Content Collections スキーマ定義

public/
├── favicon.svg
└── images/
    ├── icon.jpg                # プロフィール写真
    └── gallery/                # 猫写真（JPG/PNG）
```

## コンポーネント設計原則（Atomic Design）
- `atoms`: 単一責務の最小UIパーツ。外部依存なし
- `molecules`: atoms を組み合わせた複合コンポーネント
- `organisms`: ページセクション単位の大きなコンポーネント
- `templates`: ページ全体のレイアウト（BaseLayout など）

## Content Collections スキーマ
| コレクション | ファイル | 主なフィールド |
|---|---|---|
| `blog` | `data/blog/articles.json` | id, externalUrl, type（translation/original）, source（aws/other）|
| `gallery` | `data/gallery/img.json` | id, src, alt |
| `skills` | `data/skills/skills.json` | id, name, category, icon, url |
| `career` | `data/career/career.json` | id, organization, role, startDate, endDate（nullable）|

## スタイリング規約
- Tailwind CSS v4 ユーティリティクラスを基本とする
- カスタムカラーは `global.css` の `@theme` ブロックで `--color-*` として定義
- DaisyUI コンポーネントクラス（`btn`, `badge`, `card` など）を積極活用
- レスポンシブはモバイルファースト（Tailwind ブレークポイント）

## Bento Grid レイアウト（トップページ）
デスクトップ: 12カラムグリッド
- Hero: `col-span-8`、SNSリンク: `col-span-4`
- CareerTimeline: `col-span-4`、Skills: `col-span-8`
- Blog一覧: `col-span-12`（横スクロール）

モバイル: 全カード縦積み
