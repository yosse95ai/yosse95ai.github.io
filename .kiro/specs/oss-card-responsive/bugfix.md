# Bugfix Requirements Document

## Introduction

`OssItemSimple.astro` は OSS コントリビューション一覧を表示するカードコンポーネントです。
現在、カードは `flex-row`（横並び）固定レイアウトで実装されており、スマートフォン表示時に左側の OGP 画像エリア（幅 200px 固定）とテキストエリアが横に並んだまま潰れてしまいます。
このバグにより、モバイルユーザーはカードのテキストが読みにくい、または画像とテキストが極端に圧縮された状態で表示されます。

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN スマートフォン幅（`sm` ブレークポイント未満）でページを表示する THEN the system は OGP 画像（幅 200px 固定）とテキストを横並びのまま表示し、テキストエリアが極端に狭くなって潰れる

1.2 WHEN スマートフォン幅で OssItemSimple カードを表示する THEN the system はレスポンシブ対応なしの固定幅レイアウトを維持し、コンテンツが読みにくい状態になる

### Expected Behavior (Correct)

2.1 WHEN スマートフォン幅（`sm` ブレークポイント未満）でページを表示する THEN the system SHALL OGP 画像を非表示にしてテキストのみの縦並びレイアウトで表示する、または横スクロール可能なカード列として表示する

2.2 WHEN スマートフォン幅で OssItemSimple カードを表示する THEN the system SHALL テキスト（リポジトリ名・説明文）が十分な幅で読みやすく表示される

### Unchanged Behavior (Regression Prevention)

3.1 WHEN デスクトップ幅（`sm` ブレークポイント以上）でページを表示する THEN the system SHALL CONTINUE TO OGP 画像とテキストを横並びで表示する

3.2 WHEN デスクトップ幅で OssItemSimple カードにホバーする THEN the system SHALL CONTINUE TO シャドウ強調・画像ズームのホバーエフェクトを適用する

3.3 WHEN OGP 画像が取得できない場合 THEN the system SHALL CONTINUE TO GitHub アイコンのフォールバック表示を行う

3.4 WHEN カードをクリックする THEN the system SHALL CONTINUE TO 対象 URL を新しいタブで開く
