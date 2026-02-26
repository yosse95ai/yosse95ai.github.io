# 要件定義ドキュメント: aws-blog-auto-update

## はじめに

本ドキュメントは、AWSブログ記事リストの自動更新機能に関する要件を定義する。

GitHub Actionsワークフローが定期的にAWS BlogのRSSフィードを取得し、前回保存したキャッシュXMLとの差分を検出して、新規記事があればPRを自動作成・更新する。人間がPRをレビュー・マージすることで、ポートフォリオサイトのブログリストが更新される。

## 用語集

- **Workflow**: GitHub Actionsワークフロー（`.github/workflows/update-aws-blog.yml`）
- **FeedParser**: RSSフィード取得・パース・正規化モジュール（`scripts/lib/feedParser.ts`）
- **DiffDetector**: RSSフィードXML間の差分検出モジュール（`scripts/lib/detectDiff.ts`）
- **CacheManager**: RSSキャッシュXMLの読み書き管理モジュール（`scripts/lib/feedCache.ts`）
- **ArticleUpdater**: JSONマージ・ソートモジュール（`scripts/lib/updateArticles.ts`）
- **EntryScript**: ワークフロー全体を実行するエントリーポイント（`scripts/update-aws-blog.ts`）
- **RSSキャッシュ**: 前回取得したRSSフィードXMLを保存したファイル（`src/data/blog/rss-cache.xml`）
- **記事リストJSON**: AWSブログ記事データを管理するJSONファイル（`src/data/blog/aws-articles.json`）
- **ArticleEntry**: 記事リストJSONの1エントリー（`id`, `externalUrl`, `publishedAt`）
- **FeedArticle**: RSSフィードから正規化した記事データ（`id`, `externalUrl`, `publishedAt`）
- **DiffResult**: 差分検出結果（`newArticles`, `hasChanges`）
- **PRブランチ**: PR作成に使用するブランチ（命名規則: `chore/update-aws-blog-{YYYY-MM-DD}`）

## 要件

### 要件 1: スケジュール実行とトリガー

**ユーザーストーリー:** 開発者として、AWSブログの新規記事を自動的に検知したい。そのため、ワークフローが定期的かつ手動でも実行できるようにしたい。

#### 受け入れ基準

1. THE Workflow SHALL 毎日 00:00 UTC（09:00 JST）にcronスケジュールで自動実行される
2. THE Workflow SHALL `workflow_dispatch` イベントによる手動実行をサポートする
3. THE Workflow SHALL `actions/setup-node@v4` と `.nvmrc` を使用してNode.jsバージョンを統一する
4. THE Workflow SHALL `npm ci` で依存関係をインストールしてから `tsx scripts/update-aws-blog.ts` を実行する

---

### 要件 2: RSSフィード取得とパース

**ユーザーストーリー:** 開発者として、AWS BlogのRSSフィードから記事情報を取得したい。そのため、フィードを正しくパースして正規化されたデータを得られるようにしたい。

#### 受け入れ基準

1. WHEN フィードURLが指定された場合、THE FeedParser SHALL `https://aws.amazon.com/jp/blogs/news/author/yhiroaky/feed/` からRSSフィードXMLをfetchする
2. WHEN 有効なRSSフィードXMLが取得できた場合、THE FeedParser SHALL `fast-xml-parser` を使用してXMLをパースし、`<item>` 要素から `<link>` と `<pubDate>` を抽出する
3. WHEN `<pubDate>` が存在する場合、THE FeedParser SHALL RFC 2822形式の日付を `YYYY-MM-DD` 形式のISO 8601日付文字列に変換する
4. WHEN 記事URLが与えられた場合、THE FeedParser SHALL URLの末尾パスセグメントを抽出してIDスラッグを生成する
5. THE FeedParser SHALL パース結果を `publishedAt` 降順でソートして返す
6. IF RSSフィードの取得に失敗した場合（ネットワークエラー、タイムアウト、非200レスポンス）、THEN THE FeedParser SHALL エラーログを出力し、処理を中断する
7. IF RSSフィードのXMLが不正または予期しない構造の場合、THEN THE FeedParser SHALL エラーログに詳細を出力し、処理を中断する

---

### 要件 3: RSSキャッシュ管理

**ユーザーストーリー:** 開発者として、前回取得したRSSフィードXMLをキャッシュとして保持したい。そのため、キャッシュの読み書きを安全に管理できるようにしたい。

#### 受け入れ基準

1. WHEN キャッシュファイルが存在する場合、THE CacheManager SHALL `src/data/blog/rss-cache.xml` からXML文字列を読み込んで返す
2. IF キャッシュファイルが存在しない場合（初回実行）、THEN THE CacheManager SHALL `null` を返す
3. IF キャッシュファイルが破損・空・読み取り不能な場合、THEN THE CacheManager SHALL `null` を返し、警告ログを出力する
4. WHEN 差分が検出された場合、THE CacheManager SHALL 今回取得したRSSフィードXMLでキャッシュファイルを上書き保存する
5. THE CacheManager SHALL キャッシュファイル（`src/data/blog/rss-cache.xml`）をGitで管理する（`.gitignore` に追加しない）

---

### 要件 4: 差分検出

**ユーザーストーリー:** 開発者として、今回取得したRSSフィードと前回のキャッシュを比較して新規記事を特定したい。そのため、XMLレベルで安定した差分検出ができるようにしたい。

#### 受け入れ基準

1. WHEN 今回のRSSフィードXMLと前回のキャッシュXMLが両方存在する場合、THE DiffDetector SHALL 両XMLの `<link>` 要素セットを比較し、今回XMLに存在して前回XMLに存在しないURLを新規記事として返す
2. IF 前回のキャッシュXMLが `null`（初回実行）の場合、THEN THE DiffDetector SHALL 今回XMLの全 `<link>` 要素を新規記事として扱う
3. WHEN 今回XMLと前回XMLの `<link>` セットが同一の場合、THE DiffDetector SHALL `hasChanges: false` を返す
4. WHEN 新規記事が1件以上検出された場合、THE DiffDetector SHALL `hasChanges: true` と `newArticles` リストを返す

---

### 要件 5: 記事リストJSONの更新

**ユーザーストーリー:** 開発者として、差分検出で得た新規記事を既存の記事リストJSONに追加したい。そのため、重複なく正しい順序でマージできるようにしたい。

#### 受け入れ基準

1. WHEN 新規記事リストと既存記事リストが与えられた場合、THE ArticleUpdater SHALL 新規記事を既存リストに追加し、`publishedAt` 降順でソートして返す
2. THE ArticleUpdater SHALL `externalUrl` をキーとして重複排除を行う
3. WHEN `publishedAt` が存在しない記事がある場合、THE ArticleUpdater SHALL その記事をリストの末尾に配置する
4. WHEN `detectDiff` が返す新規記事URLに対して、THE EntryScript SHALL `parseFeed` の結果（`FeedArticle[]`）から対応する `id` と `publishedAt` を補完してから `aws-articles.json` に追記する
5. IF `parseFeed` の結果に存在しない新規URLが含まれる場合、THEN THE EntryScript SHALL URLスラッグから `id` を生成し、`publishedAt` は省略した `ArticleEntry` として扱う

---

### 要件 6: PR作成・更新

**ユーザーストーリー:** 開発者として、新規記事の差分をPRとして自動作成・更新したい。そのため、既存PRがある場合は上書き更新し、ない場合は新規作成できるようにしたい。

#### 受け入れ基準

1. WHEN 差分が検出された場合、THE EntryScript SHALL `chore/update-aws-blog-{YYYY-MM-DD}` 形式のブランチ名を生成する
2. IF `chore/update-aws-blog-` プレフィックスを持つオープンなPRが存在しない場合、THEN THE EntryScript SHALL 新規ブランチを作成してコミットし、`gh` CLIでPRを作成する
3. IF `chore/update-aws-blog-` プレフィックスを持つオープンなPRが既に存在する場合、THEN THE EntryScript SHALL 既存ブランチへforce pushしてPRを更新する
4. THE Workflow SHALL `GITHUB_TOKEN`（GitHub Actionsが自動提供）を使用し、追加のシークレット設定を不要とする
5. THE Workflow SHALL `contents: write` と `pull-requests: write` の最小権限のみをワークフローに付与する

---

### 要件 7: エラーハンドリングと終了コード

**ユーザーストーリー:** 開発者として、処理の成否をGitHub Actionsで正しく把握したい。そのため、エラー時は適切な終了コードとログが出力されるようにしたい。

#### 受け入れ基準

1. WHEN 全処理が正常に完了した場合、THE EntryScript SHALL 終了コード `0` で終了する
2. WHEN 差分が検出されなかった場合、THE EntryScript SHALL 終了コード `0` で早期終了する
3. IF RSSフィード取得・XMLパース・GitHub API操作のいずれかでエラーが発生した場合、THEN THE EntryScript SHALL エラーログを出力し、非ゼロ終了コードで終了する
4. IF `GITHUB_TOKEN` の権限が不足している場合、THEN THE EntryScript SHALL エラーログを出力し、非ゼロ終了コードで終了する

---

### 要件 8: 入力データのバリデーション

**ユーザーストーリー:** 開発者として、外部フィードから取得したデータが正しい形式であることを保証したい。そのため、JSONに書き込む前にバリデーションが行われるようにしたい。

#### 受け入れ基準

1. WHEN RSSフィードから記事データを生成する場合、THE FeedParser SHALL `externalUrl` が `https://aws.amazon.com/jp/blogs/news/` プレフィックスを持つ有効なURLであることを検証する
2. WHEN `publishedAt` を生成する場合、THE FeedParser SHALL `YYYY-MM-DD` 形式の正しい日付文字列であることを検証する
3. WHEN 記事IDを生成する場合、THE FeedParser SHALL IDが英数字とハイフンのみで構成される非空文字列であることを検証する
4. IF 異なるURLが同じIDスラッグを生成する場合、THEN THE FeedParser SHALL URLハッシュを付与してIDの一意性を保証する
