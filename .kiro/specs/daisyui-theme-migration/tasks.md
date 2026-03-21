# 実装計画: DaisyUI テーマカラー上書き方式の移行

## 概要

DaisyUI v5 の primary カラー上書きを `:root` 詳細度ハック方式から公式 `@plugin "daisyui/theme"` 方式に段階的に移行する。各フェーズでビルド検証とユーザー確認を挟み、問題発生時は即座にロールバック可能な状態を維持する。

## タスク

- [ ] 1. フェーズ 1: Theme Plugin 追加とカタログ検証
  - [x] 1.1 `src/pages/catalog.astro` に `data-theme="light"` ベースライン検証セクションを追加
    - CSS 変更なしの状態で、カタログページ末尾に `data-theme="light"` で囲んだコンポーネントセクションを追加
    - `btn-primary`, `badge-primary`, `text-primary`, `bg-primary` を表示
    - 既存のページ上のコンポーネントと見た目に差異がないことを確認（`data-theme="light"` を明示しても現状と同じ見た目であること）
    - `npm run build` でビルド成功を確認
    - _要件: 5.1_

  - [x] 1.2 `src/styles/global.css` に `@plugin "daisyui/theme"` ブロックを追加
    - `@plugin "daisyui"` の直後に以下を追加:
      ```css
      @plugin "daisyui/theme" {
        name: "night";
        default: true;
        --color-primary: oklch(0.55 0.15 145);
        --color-primary-content: oklch(0.98 0.005 145);
      }
      ```
    - `:root` ハックブロックは削除せず共存させる
    - `npm run build` でビルドエラーがないことを確認
    - _要件: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 5.2_

  - [x] 1.3 `src/pages/catalog.astro` に `data-theme="night"` の After セクションを追加
    - 1.1 で追加した light セクションの隣に `data-theme="night"` で囲んだ同じコンポーネントを追加
    - Before（`data-theme="light"`）と After（`data-theme="night"`）を横並びで比較できるようにする
    - After セクション内で DevTools を使い `--color-primary` の適用元が `@plugin "daisyui/theme"` 経由であることを確認できるようにする
    - `npm run build` でビルド成功を確認
    - _要件: 3.1, 3.2, 3.3, 3.4, 5.1_

- [x] 2. チェックポイント — フェーズ 1 検証
  - `npm run dev` でカタログページを開き、以下を目視確認するようユーザーに依頼:
    1. `data-theme="light"` セクションが既存ページの見た目と差異がないこと
    2. `data-theme="night"` セクション内で `--color-primary` がカスタム値（`oklch(0.55 0.15 145)`）になっていること
    3. Before/After で primary カラーが同じカスタム値であること
  - DevTools で `data-theme="night"` セクションの `--color-primary` の適用元を確認
  - 問題がある場合は `git checkout -- src/styles/global.css` でロールバック
  - ユーザーの確認が取れたら次のフェーズに進む

- [x] 3. フェーズ 2: 全体適用（重複定義の排除）
  - [x] 3.1 `src/styles/global.css` から `:root` ハックブロックを削除
    - `/* @layer 外に書くことで ... */` コメントと `:root, [data-theme=light]` ブロック全体を削除
    - _要件: 2.1, 2.4, 2.5_

  - [x] 3.2 `src/styles/global.css` の `@theme` ブロックから primary 関連定義を削除
    - `--color-primary: oklch(0.55 0.15 145);` を削除
    - `--color-primary-content: oklch(0.98 0.005 145);` を削除
    - 他のカスタムプロパティ（`--color-bg`, `--color-text` 等）は変更しない
    - `npm run build` でビルド成功を確認
    - _要件: 2.2, 2.3, 3.5, 4.1_

- [x] 4. チェックポイント — フェーズ 2 検証
  - `npm run dev` で全ページ（トップ、gallery、history、catalog）を目視確認するようユーザーに依頼
  - `btn-primary`, `badge-primary`, `text-primary`, `bg-primary` が正しいカスタム primary カラーで表示されていることを確認
  - 問題がある場合は `git checkout -- src/styles/global.css` でロールバック
  - ユーザーの確認が取れたら次のフェーズに進む

- [x] 5. フェーズ 3: クリーンアップとドキュメント更新
  - [x] 5.1 `src/pages/catalog.astro` から検証用 Before/After セクションを削除
    - フェーズ 1 で追加した DaisyUI テーマ移行検証セクションを削除
    - `npm run build` でビルド成功を確認
    - _要件: 5.4_

  - [x] 5.2 `.kiro/steering/style-guide.md` の「DaisyUI テーマカラーの上書き規約」セクションを更新
    - `@plugin "daisyui/theme"` を「✅ 正しい方法」として記載
    - `:root` ハック方式を「レガシー方式」として記載
    - ベーステーマとして `night` を使用する旨を記載
    - _要件: 6.1, 6.2, 6.3_

- [x] 6. 最終チェックポイント — 全体確認
  - `npm run build` で最終ビルド成功を確認
  - ユーザーに最終確認を依頼

## 備考

- CSS の変更はランタイムテストが困難なため、ビルド成功とカタログでの目視確認を主な検証手段とする
- プロパティベーステストは不要（CSS 変数の定義元変更のみ）
- 各フェーズでユーザー確認を挟み、問題発生時は `git checkout -- src/styles/global.css` で即座にロールバック可能
- 全タスクは要件ドキュメントの要件を網羅している
