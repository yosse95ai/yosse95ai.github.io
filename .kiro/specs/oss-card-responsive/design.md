# OSSカードレスポンシブ対応 Bugfix Design

## Overview

`OssItemSimple.astro` は `flex-row` 固定レイアウトのため、スマートフォン幅（`sm` ブレークポイント未満）で OGP 画像（幅 200px 固定）とテキストが横並びのまま潰れてしまう。

修正方針は **E パターン**を採用:
- スマホ時（`sm` 未満）: 画像を `hidden sm:block` で非表示、org/repo 名を縦並び表示
- デスクトップ時（`sm` 以上）: 現状維持（画像表示・`org / repo` 横並び）

変更対象は `src/components/molecules/OssItemSimple.astro` のみ。

## Glossary

- **Bug_Condition (C)**: スマートフォン幅（`sm` ブレークポイント未満）で OssItemSimple カードが表示される条件
- **Property (P)**: バグ条件が成立するとき、OGP 画像が非表示になりテキストが十分な幅で読みやすく表示されること
- **Preservation**: デスクトップ幅での横並びレイアウト・ホバーエフェクト・フォールバック表示・リンク動作が変更後も維持されること
- **OssItemSimple**: `src/components/molecules/OssItemSimple.astro` — OSS コントリビューションカードを描画するコンポーネント
- **sm ブレークポイント**: Tailwind CSS v4 のデフォルト `640px`。これ未満がスマートフォン幅と定義する

## Bug Details

### Fault Condition

バグは `sm` ブレークポイント未満の幅でカードが表示されるときに発生する。
`flex-row` 固定かつ画像幅 `200px` 固定のため、テキストエリアが極端に狭くなって潰れる。

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { viewportWidth: number }
  OUTPUT: boolean

  RETURN input.viewportWidth < SM_BREAKPOINT  -- 640px
END FUNCTION
```

### Examples

- ビューポート幅 375px（iPhone SE）: 画像 200px + テキスト 175px → テキストが潰れて読めない（バグあり）
- ビューポート幅 390px（iPhone 14）: 同様にテキストエリアが極端に狭い（バグあり）
- ビューポート幅 640px（sm 境界）: 横並びレイアウトが正常に表示される（バグなし）
- ビューポート幅 1280px（デスクトップ）: 画像 + テキスト横並び、正常表示（バグなし）

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- デスクトップ幅（`sm` 以上）では OGP 画像とテキストを横並びで表示する
- デスクトップ幅（`sm` 以上）では org / repo 名を横並びで表示する
- ホバー時のシャドウ強調・画像ズームエフェクトが引き続き動作する
- OGP 画像が取得できない場合の GitHub アイコンフォールバック表示が維持される
- カードクリックで対象 URL を新しいタブで開く動作が維持される

**Scope:**
`sm` ブレークポイント以上のビューポート幅、およびクリック・ホバー動作は今回の修正で一切変更しない。

## Hypothesized Root Cause

1. **レスポンシブクラスの未設定**: `flex-row` が固定で `sm:flex-row` のようなブレークポイント付きクラスが使われていない
   - 修正: `flex-col sm:flex-row` に変更

2. **画像の表示制御なし**: 画像コンテナに `hidden sm:block` が付いていないため、スマホでも 200px 幅の画像エリアが確保される
   - 修正: 画像コンテナに `hidden sm:block` を追加

3. **テキストレイアウトの未調整**: org/repo の横並び表示がスマホ幅で truncate されすぎる
   - 修正: スマホ時のみ `flex-col` で縦並びに変更（`sm` 以上は `flex-row` 横並び維持）、org 名を `text-xs` に縮小、スラッシュはスマホ時非表示（`hidden sm:inline`）

4. **description のフォントサイズ**: E パターン仕様では `text-xs` に変更
   - 修正: `text-xs leading-relaxed line-clamp-3` に変更

## Correctness Properties

Property 1: Fault Condition - スマホ幅でテキストが読みやすく表示される

_For any_ ビューポート幅が `sm` ブレークポイント（640px）未満の入力において、修正後の OssItemSimple コンポーネント SHALL OGP 画像を非表示にし、org 名・repo 名・description が十分な幅で読みやすく表示される。

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - デスクトップ幅での既存動作が維持される

_For any_ ビューポート幅が `sm` ブレークポイント（640px）以上の入力において、修正後のコンポーネント SHALL 修正前と同一の横並びレイアウト・ホバーエフェクト・フォールバック表示・リンク動作を維持する。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

**File**: `src/components/molecules/OssItemSimple.astro`

**Specific Changes**:

1. **ルート `<a>` のフレックス方向**: `flex flex-row` → `flex flex-col sm:flex-row`

2. **画像コンテナの表示制御**: `shrink-0 overflow-hidden ...` → `hidden sm:block shrink-0 overflow-hidden ...`

3. **org/repo テキストレイアウト**: `flex items-center gap-1.5` → `flex flex-col sm:flex-row sm:items-center sm:gap-1.5 gap-0.5 min-w-0`
   - org 表示: `text-sm font-mono truncate` + `{org} /` → `text-xs font-mono sm:truncate` + `{org}<span class="hidden sm:inline"> /</span>`
   - repo 表示: 変更なし（`text-base font-semibold truncate`）

4. **description フォントサイズ**: `text-sm leading-relaxed line-clamp-3` → `text-xs leading-relaxed line-clamp-3`

### 変更後コード（参考）

```astro
<a
  href={url}
  target="_blank"
  rel="noopener noreferrer"
  class="group flex flex-col sm:flex-row rounded-2xl overflow-hidden border transition-shadow hover:shadow-lg no-underline"
  style="background: var(--color-surface); border-color: var(--color-border); box-shadow: 0 1px 4px var(--color-shadow-sm);"
>
  <!-- 左: OGP 画像（スマホ非表示） -->
  <div class="hidden sm:block shrink-0 overflow-hidden bg-[var(--color-surface-subtle)]" style="width: 200px; aspect-ratio: 1200/630;">
    ...
  </div>

  <!-- 右: テキスト -->
  <div class="flex flex-col gap-2 p-4 flex-1 min-w-0">
    <div class="flex flex-col sm:flex-row sm:items-center sm:gap-1.5 gap-0.5 min-w-0">
      <span class="text-xs font-mono sm:truncate" style="color: var(--color-text-muted);">{org}<span class="hidden sm:inline"> /</span></span>
      <span class="text-base font-semibold truncate" style="color: var(--color-text);">{name}</span>
    </div>
    <p class="text-xs leading-relaxed line-clamp-3" style="color: var(--color-text-body);">{description}</p>
  </div>
</a>
```

## Testing Strategy

### Validation Approach

視覚的なレイアウトバグのため、カタログページ（`/catalog`）での目視確認を主な検証手段とする。

### Fix Checking（目視確認）

- スマホ幅（375px 相当）: 画像が非表示、org/repo が縦並び、テキストが全幅で読みやすく表示される
- デスクトップ幅（1280px 相当）: 画像表示・`org / repo` 横並び・ホバーエフェクトが修正前と同一

### Preservation Checking（目視確認）

- デスクトップ幅でホバー時のシャドウ強調・画像ズームが正常動作する
- カードクリックで対象 URL が新しいタブで開く
- OGP 画像なし時の GitHub アイコンフォールバックが表示される
