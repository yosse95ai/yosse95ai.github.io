# 実装タスクリスト: aws-blog-auto-update

## 概要

RSSフィードを定期取得してAWSブログ記事リストを自動更新するGitHub Actionsワークフローの実装計画。
各タスクは前のタスクの成果物を前提として積み上げ式に進める。

## タスク

- [x] 1. プロジェクト依存関係のセットアップ
  - `package.json` の `devDependencies` に `fast-xml-parser` と `tsx` を追加する
  - `npm install` 後に既存テストが通ることを確認する
  - _Requirements: 1.4_

- [x] 2. コアデータ型とインターフェースの定義
  - [x] 2.1 共有型定義ファイルを作成する
    - `scripts/lib/types.ts` に `FeedArticle`・`ArticleEntry`・`DiffResult` インターフェースを定義する
    - _Requirements: 2.1, 4.1, 5.1_

- [x] 3. RSSフィードパーサーの実装
  - [x] 3.1 `scripts/lib/feedParser.ts` を実装する
    - `parseFeed(feedUrl: string): Promise<FeedArticle[]>` を実装する
    - `fast-xml-parser` でXMLをパースし `<item>` から `<link>` と `<pubDate>` を抽出する
    - RFC 2822形式の `pubDate` を `YYYY-MM-DD` 形式に変換する
    - URLの末尾パスセグメントからIDスラッグを生成する `extractIdFromUrl(url: string): string` を実装する
    - 異なるURLが同じスラッグを生成する場合はURLハッシュを付与して一意性を保証する
    - `externalUrl` のバリデーション（`https://aws.amazon.com/jp/blogs/news/` プレフィックス）を実装する
    - `publishedAt` の `YYYY-MM-DD` 形式バリデーションを実装する
    - IDスラッグの英数字・ハイフンのみ形式バリデーションを実装する
    - パース結果を `publishedAt` 降順でソートして返す
    - フィード取得失敗・XMLパースエラー時はエラーログを出力して例外をスローする
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 8.1, 8.2, 8.3, 8.4_

  - [x] 3.2 `feedParser` のプロパティテストを書く（`scripts/lib/__tests__/feedParser.test.ts`）
    - **Property 1: RSSフィードのパース結果ソート順**
    - **Validates: Requirements 2.5**

  - [x] 3.3 `feedParser` のプロパティテストを書く（`scripts/lib/__tests__/feedParser.test.ts`）
    - **Property 2: 日付変換の正確性**
    - **Validates: Requirements 2.3, 8.2**

  - [x] 3.4 `feedParser` のプロパティテストを書く（`scripts/lib/__tests__/feedParser.test.ts`）
    - **Property 3: IDスラッグの形式保証**
    - **Validates: Requirements 2.4, 8.3**

  - [x] 3.5 `feedParser` のプロパティテストを書く（`scripts/lib/__tests__/feedParser.test.ts`）
    - **Property 10: URLバリデーションの網羅性**
    - **Validates: Requirements 8.1**

  - [x] 3.6 `feedParser` のユニットテストを書く（`scripts/lib/__tests__/feedParser.test.ts`）
    - 正常パース、`pubDate` 変換、不正XML、空フィード、非200レスポンスのケースをテストする
    - _Requirements: 2.1, 2.2, 2.6, 2.7_

- [x] 4. チェックポイント — 全テストが通ることを確認する
  - 全テストが通ることを確認し、疑問点があればユーザーに確認する。

- [x] 5. RSSキャッシュ管理の実装
  - [x] 5.1 `scripts/lib/feedCache.ts` を実装する
    - `loadCache(cachePath: string): string | null` を実装する
    - キャッシュファイルが存在しない場合は `null` を返す
    - キャッシュファイルが破損・空・読み取り不能な場合は `null` を返して警告ログを出力する
    - `saveCache(cachePath: string, xmlContent: string): void` を実装する
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 5.2 `feedCache` のプロパティテストを書く（`scripts/lib/__tests__/feedCache.test.ts`）
    - **Property 4: キャッシュのラウンドトリップ**
    - **Validates: Requirements 3.1, 3.4**

  - [x] 5.3 `feedCache` のユニットテストを書く（`scripts/lib/__tests__/feedCache.test.ts`）
    - 正常読み込み、ファイル未存在時の `null` 返却、破損ファイル時の `null` 返却、正常保存のケースをテストする
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 6. 差分検出の実装
  - [x] 6.1 `scripts/lib/detectDiff.ts` を実装する
    - `detectDiff(currentFeedXml: string, previousFeedXml: string | null): DiffResult` を実装する
    - 両XMLの `<link>` 要素セットを比較し、今回XMLにのみ存在するURLを `newUrls` として返す
    - `previousFeedXml` が `null`（初回実行）の場合は今回XMLの全 `<link>` を新規として扱う
    - `hasChanges` フラグで差分有無を通知する
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 6.2 `detectDiff` のプロパティテストを書く（`scripts/lib/__tests__/detectDiff.test.ts`）
    - **Property 5: 差分検出の正確性**
    - **Validates: Requirements 4.1, 4.4**

  - [x] 6.3 `detectDiff` のプロパティテストを書く（`scripts/lib/__tests__/detectDiff.test.ts`）
    - **Property 6: 初回実行時の全件新規扱い**
    - **Validates: Requirements 4.2**

  - [x] 6.4 `detectDiff` のプロパティテストを書く（`scripts/lib/__tests__/detectDiff.test.ts`）
    - **Property 7: 差分なし時の冪等性**
    - **Validates: Requirements 4.3**

  - [x] 6.5 `detectDiff` のユニットテストを書く（`scripts/lib/__tests__/detectDiff.test.ts`）
    - 新規記事あり、差分なし、初回実行（全件新規）、空フィードのケースをテストする
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 7. チェックポイント — 全テストが通ることを確認する
  - 全テストが通ることを確認し、疑問点があればユーザーに確認する。

- [x] 8. `DiffResult` 型リファクタリング
  - [x] 8.1 `scripts/lib/types.ts` の `DiffResult` を修正する
    - `newArticles: ArticleEntry[]` を `newUrls: string[]` に変更する
    - `ArticleEntry` の不完全な値（`id: ''`・`publishedAt: undefined`）を返す設計を廃止し、URLの集合として意味的に正確な型にする
    - _Requirements: 4.1, 4.4_

  - [x] 8.2 `scripts/lib/detectDiff.ts` を修正する
    - `DiffResult` の変更に合わせて `newUrls: string[]` を返すよう実装を更新する
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 8.3 `scripts/lib/__tests__/detectDiff.test.ts` を修正する
    - `newArticles` → `newUrls` の参照を更新する
    - テストの意図・カバレッジは変更しない
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 8.4 全テストが通ることを確認する
    - リファクタリング後も既存テストが全パスすることを確認する

- [x] 9. 記事リストJSONアップデーターの実装
  - [x] 9.1 `scripts/lib/updateArticles.ts` を実装する
    - `mergeAndSort(existing: ArticleEntry[], newArticles: ArticleEntry[]): ArticleEntry[]` を実装する
    - `externalUrl` をキーとして重複排除を行う
    - `publishedAt` 降順でソートし、`publishedAt` がない記事はリスト末尾に配置する
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 9.2 `updateArticles` のプロパティテストを書く（`scripts/lib/__tests__/updateArticles.test.ts`）
    - **Property 8: マージ後のソート安定性**
    - **Validates: Requirements 5.1, 5.3**

  - [x] 9.3 `updateArticles` のプロパティテストを書く（`scripts/lib/__tests__/updateArticles.test.ts`）
    - **Property 9: 重複排除の保証**
    - **Validates: Requirements 5.2**

  - [x] 9.4 `updateArticles` のユニットテストを書く（`scripts/lib/__tests__/updateArticles.test.ts`）
    - ソート順、重複排除、`publishedAt` なし記事の末尾配置のケースをテストする
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 10. エントリーポイントスクリプトの実装
  - [ ] 10.1 `scripts/update-aws-blog.ts` を実装する
    - `parseFeed` → `feedCache` → `detectDiff` → `ArticleEntry` 補完 → `updateArticles` の一連の処理を実行する
    - `detectDiff` が返す `newUrls` を `parseFeed` の結果（`FeedArticle[]`）と突き合わせて `id`・`publishedAt` を補完し完全な `ArticleEntry[]` を生成する
    - `parseFeed` の結果に存在しないURLは `extractIdFromUrl` でスラッグを生成し `publishedAt` は省略する
    - 差分なしの場合は終了コード `0` で早期終了する
    - 差分ありの場合はキャッシュXMLを上書き保存し、`aws-articles.json` を更新する
    - `chore/update-aws-blog-{YYYY-MM-DD}` 形式のブランチ名を生成する
    - `chore/update-aws-blog-` プレフィックスを持つオープンなPRを `gh` CLIで検索する
    - 既存PRがない場合は新規ブランチを作成してコミットし、`gh` CLIでPRを作成する
    - 既存PRがある場合は既存ブランチへforce pushしてPRを更新する
    - エラー時はエラーログを出力して非ゼロ終了コードで終了する
    - _Requirements: 1.4, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4_

- [ ] 11. GitHub Actionsワークフローの実装
  - [ ] 11.1 `.github/workflows/update-aws-blog.yml` を作成する
    - `schedule` で毎日 00:00 UTC（09:00 JST）にcron実行するよう設定する
    - `workflow_dispatch` による手動実行をサポートする
    - `contents: write` と `pull-requests: write` の最小権限を付与する
    - `actions/setup-node@v4` と `.nvmrc` でNode.jsバージョンを統一する
    - `npm ci` で依存関係をインストールする
    - `tsx scripts/update-aws-blog.ts` でスクリプトを実行する
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.4, 6.5_

- [ ] 12. 最終チェックポイント — 全テストが通ることを確認する
  - 全テストが通ることを確認し、疑問点があればユーザーに確認する。

## 注意事項

- `*` が付いたサブタスクはオプションであり、MVP優先の場合はスキップ可能
- 各タスクは対応する要件番号を参照しているためトレーサビリティを確保
- チェックポイントで段階的な動作確認を行う
- プロパティテストは普遍的な正確性プロパティを検証し、ユニットテストは具体的なケースを検証する
- テストファイルは `scripts/lib/__tests__/` に配置する（GitHub Actions用スクリプトは `scripts/` 配下で管理するため、対応するテストも同ディレクトリ内に集約する）
