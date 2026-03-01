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

## テキスト表記規約（和欧混植）

日本語テキスト中で英数字と日本語が隣接する場合、**間に半角スペースを1つ入れる**。

```
✅ AWS の Solutions Architect として活動
✅ 2023 年 4 月
❌ AWSのSolutions Architectとして活動
❌ 2023年4月
```

**例外**: カッコ（「」『』（））や句読点（、。）の直後に英数字が来る場合はスペース不要。

```
✅ 「abc あいう、kari だった。qwer」abc
```

適用範囲: ユーザーに表示される日本語テキスト全般（`description`・UI ラベル・日付フォーマット等）。
クラス名・属性値・コードは対象外。

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

## スタイル変更規約

視覚的な変更（文字サイズ・余白・色など）を行う際は、以下のフローに従う。

### 1. カタログページで Before/After を確認してから適用する

`src/pages/catalog.astro` に Before/After を横並びで追加し、ユーザーが実際の見た目を確認・承認してから対象コンポーネントに適用する。
直接コンポーネントを書き換えない。

```astro
<!-- catalog.astro に追加する Before/After の例 -->
<div class="border rounded-2xl p-4 space-y-4" style="border-color: oklch(0.88 0.008 150);">
  <p class="text-xs font-mono uppercase tracking-wider" style="color: oklch(0.55 0.15 145);">
    X: コンポーネント名 / 変更箇所の説明
  </p>
  <div class="grid grid-cols-2 gap-6">
    <div class="space-y-2">
      <p class="text-xs font-mono" style="color: oklch(0.55 0.010 250);">Before: text-xs</p>
      <div class="rounded-xl p-4" style="background: oklch(0.96 0.006 120);">
        <!-- Before の見た目 -->
      </div>
    </div>
    <div class="space-y-2">
      <p class="text-xs font-mono" style="color: oklch(0.55 0.010 250);">After: text-sm</p>
      <div class="rounded-xl p-4" style="background: oklch(0.96 0.006 120);">
        <!-- After の見た目 -->
      </div>
    </div>
  </div>
</div>
```

### 2. 変更候補はテーブルで整理する

変更前に影響箇所を洗い出し、以下の形式でまとめてユーザーに提示する。

| # | コンポーネント / 箇所 | Before | After（候補） |
|---|---|---|---|
| A | `ComponentName` 該当テキスト | `text-xs` | `text-sm` |

### 3. 承認後にコンポーネントへ適用・コミット

ユーザーの承認を得た変更のみ対象コンポーネントに適用し、コミットメッセージには必ずイシュー番号を含める。

```
fix: #N 変更内容の説明
```
