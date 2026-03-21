# Implementation Plan: career-detail-history

## Overview

History ページの経歴タイムラインに description 表示機能を追加し、タイムライン縦線のモバイル表示不具合を修正する。career.json へのデータ追加、TimelineItem のレスポンシブレイアウト変更、CareerTimeline の条件付き description 渡しを実装する。

## Tasks

- [x] 1. career.json に大学エントリの description を追加
  - `kyutech-undergrad` に仮想ドラムシステム開発に関する description を追加
  - `kyutech-master` に UKF を用いたスティック軌跡補間に関する description を追加
  - 既存の `aws` エントリの description は変更しない
  - 和欧混植ルール（日本語と英数字の間に半角スペース）を遵守
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 2. TimelineItem.astro を更新
  - [x] 2.1 Props に `description` を追加し、条件付き表示ロジックを実装
    - `description?: string | null` を Props interface に追加
    - frontmatter で description を destructure
    - description が truthy な場合のみ `<p>` 要素を出力
    - description が null / undefined / 空文字列の場合は DOM 要素を出力しない
    - _Requirements: 1.2, 1.3, 6.1_

  - [x] 2.2 レスポンシブ 2 カラムレイアウトを実装
    - CareerTimeline 側: `showAll=true` のとき CSS Grid コンテナ（`md:grid`、`grid-template-columns: auto 1px 1fr`）を適用
    - CareerTimeline 側: `showAll=false` のとき Grid を適用しない（従来の flex レイアウト維持）
    - TimelineItem 側: description ありのとき 3 つの grid セル（左カラム / セパレーター / 右カラム）を出力
    - セパレーターは独立した grid セル（`1px` 幅、`var(--color-border)`）として描画
    - モバイル（`md` 未満）: 縦積み表示（Grid 非適用）
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 2.3 タイムライン縦線を `absolute` 配置に修正
    - 縦線を `flex-1` から `absolute` 配置に変更
    - `top-4 bottom-0` で親要素の高さに追従させる
    - ドットに `z-10` を追加して縦線の上に表示
    - `isLast === true` のとき縦線を非表示
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 3. CareerTimeline.astro を更新
  - `showAll === true` のとき `item.data.description` を TimelineItem に渡す
  - `showAll === false` のとき `undefined` を渡す（Home ページの表示を変えない）
  - 既存の startDate 降順ソート・件数制御ロジックは変更しない
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 6.2, 6.3_

- [x] 4. Checkpoint - ビルド検証
  - `npm run build` が成功することを確認
  - career.json が content.config.ts のスキーマバリデーションを通過することを確認
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 5.1, 5.4_

## Notes

- content.config.ts のスキーマは既に `description: z.string().nullable().optional()` を定義済みのため変更不要
- スタイルガイドに従い、カラーは `var(--color-*)` カスタムプロパティを使用
- テキストサイズはモバイルファーストのレスポンシブ規約に準拠
- Checkpoints ensure incremental validation
