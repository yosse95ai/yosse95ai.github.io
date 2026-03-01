---
inclusion: fileMatch
fileMatchPattern: ['**/*.astro', '**/*.css']
---

# スタイルガイド

## カラーパレット（OKLCH）

すべてのカラーは `src/styles/global.css` の `@theme` ブロックで定義されたカスタムプロパティを使用する。
**ハードコードされた色値（hex / rgb 等）は使わない。**

| トークン | 値 | 用途 |
|---|---|---|
| `--color-bg` | `oklch(0.15 0.008 150)` | ページ背景 |
| `--color-text` | `oklch(0.20 0.010 250)` | 本文テキスト |
| `--color-text-muted` | `oklch(0.45 0.010 250)` | サブテキスト・補足 |
| `--color-primary` | `oklch(0.55 0.15 145)` | アクセント・ボタン等 |
| `--color-primary-content` | `oklch(0.98 0.005 145)` | primary 上のテキスト |
| `--color-secondary` | `oklch(0.60 0.08 150)` | セカンダリアクセント |
| `--color-border` | `oklch(0.88 0.008 150)` | ボーダー・区切り線 |
| `--color-shadow` | `oklch(0.70 0.010 150 / 0.15)` | ボックスシャドウ |

### 使用例
```astro
<!-- ✅ Good -->
<div class="bg-[var(--color-surface)] text-[var(--color-text)]">

<!-- ❌ Bad -->
<div style="background: #f5f5f5; color: #333;">
```

## タイポグラフィ

| トークン | 値 | 用途 |
|---|---|---|
| `--font-sans` | `Inter`, `Noto Sans JP`, system-ui | 本文・UI全般 |
| `--font-mono` | `JetBrains Mono`, ui-monospace | コードブロック |

## Tailwind CSS v4 規約

- ユーティリティクラスを基本とする
- カスタムカラーは `var(--color-*)` で参照（`bg-[var(--color-bg)]` 等）
- レスポンシブはモバイルファースト（`sm:` `md:` `lg:` の順）
- 新しいカラーを追加する場合は `global.css` の `@theme` ブロックに OKLCH で定義する

## DaisyUI v5 規約

- DaisyUI コンポーネントクラス（`btn`, `badge`, `card`, `timeline` 等）を積極活用
- DaisyUI のテーマカラー（`primary`, `secondary` 等）と `--color-*` カスタムプロパティは併用可
- コンポーネントのカスタマイズは Tailwind ユーティリティで上書きする

## レイアウト（Bento Grid）

トップページのグリッドレイアウト（デスクトップ: 12カラム）:

| セクション | クラス |
|---|---|
| Hero | `col-span-12 md:col-span-8` |
| SNSリンク | `col-span-12 md:col-span-4` |
| CareerTimeline | `col-span-12 md:col-span-4` |
| Skills | `col-span-12 md:col-span-8` |
| Blog一覧 | `col-span-12`（横スクロール） |

モバイルは全カード縦積み（`col-span-12`）。
