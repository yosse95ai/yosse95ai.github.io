---
inclusion: always
---
# Git ワークフロー（GitHub Flow）

本リポジトリは **GitHub Flow** に従う。以下を必ず遵守すること。

## 原則
- `master` が唯一の長期ブランチであり、常にデプロイ可能な状態を保つ
- `master` への直接コミットは**禁止**。すべての変更は feature ブランチ経由
- `master` への反映は **Pull Request のマージのみ**
- ブランチは単一の目的に絞り、短命に保つ（長期間放置しない）

## 手順
1. 最新の `master` から分岐する
   ```bash
   git switch master && git pull origin master
   git switch -c <type>/<slug>
   ```
2. 小さく意味のある単位でコミットする
3. リモートへ push（**ユーザー確認を取ってから**実行）
   ```bash
   git push -u origin <type>/<slug>
   ```
4. `gh pr create` で PR を作成する
5. CI がグリーンであることを確認してからマージする

## ブランチ命名規則
`<type>/<slug>` 形式。`<type>` は既存の慣習に従う。

| type | 用途 | 例 |
|-|-|-|
| `feat` | 機能追加 | `feat/change-icon` |
| `fix` | バグ修正 | `fix/ogp-no-image-fallback` |
| `chore` | 依存更新・設定・雑務 | `chore/security-updates` |
| `docs` | ドキュメントのみ | `docs/readme-update` |
| `refactor` | 挙動を変えない内部改善 | `refactor/ogp-cache-lib` |

- `<slug>` は英小文字・数字・ハイフンのみ
- Issue に紐づく場合は `fix/issue-41-design-improvements` のように番号を含めてよい

## コミットメッセージ
- Conventional Commits 準拠: `<type>: <subject>`
- subject は日本語可。命令形で簡潔に書く
- 1 コミット 1 関心事。無関係な変更を混ぜない

## Pull Request
- タイトルは 70 文字以内。詳細は本文に書く
- 本文には「変更概要 / 検証内容 / 影響範囲」を記載する
- PR は 1 つの関心事に絞る。レビュー可能なサイズを保つ

## 禁止・要確認事項
- `git push` は**必ずユーザー確認を取ってから**実行する（自律実行しない）
- `master` への直接 push は行わない
- 破壊的操作（`push --force` / `reset --hard` / `clean -fd` / `branch -D`）はユーザーの明示的許可が必要
- `git add -A` / `git add .` は使わず、対象ファイルを個別指定する
- `--no-verify` によるフック回避は行わない
- コミット前にユーザープロファイル（Individual / AWS）を確認し `git config` を設定する

## デプロイとの関係
GitHub Actions は `master` への push でトリガーされ GitHub Pages へデプロイされる。
つまり **PR のマージがそのまま本番デプロイ**になるため、マージ前に CI グリーンを必ず確認する。
