# Implementation Plan

- [x] 1. OssItemSimple.astro のレスポンシブ対応修正
  - ルート `<a>` のフレックス方向: `flex flex-row` → `flex flex-col sm:flex-row`
  - 画像コンテナの表示制御: `shrink-0 overflow-hidden ...` → `hidden sm:block shrink-0 overflow-hidden ...`
  - org/repo テキストレイアウト: スマホ時のみ縦並び（`flex-col`）、`sm` 以上は横並び（`sm:flex-row`）維持
    - org 表示: `text-xs font-mono`、スラッシュはスマホ時非表示（`hidden sm:inline`）
  - description フォントサイズ: `text-sm` → `text-xs`
  - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4_

- [ ] 2. カタログ（`/catalog`）で目視確認する
  - スマホ幅（375px 相当）: 画像非表示・org/repo 縦並び・テキスト全幅表示を確認
  - デスクトップ幅（1280px 相当）: 画像表示・`org / repo` 横並び・ホバーエフェクトが修正前と同一であることを確認

- [ ] 3. カタログの比較セクションを削除してクリーンアップする
  - `src/pages/catalog.astro` の `#19: OssItemSimple` 比較ブロックを通常の単一表示に戻す
