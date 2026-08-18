# src/icons

astro-icon がローカル SVG を読み込むディレクトリ。`foo.svg` を置くと `local:foo` で参照できる
（リモートのレジストリから取得するのではなく、このディレクトリのファイルを読む）。

アイコンセットに存在しないブランドロゴはここに置く。現在は Kiro と Dify の 2 つ。

## 純黒（`black` / `#000`）は使わない

astro-icon（Iconify）はローカル SVG を取り込むときに **純黒の塗りを `currentColor` に置換する**。
多色ロゴで黒を使うと、テーマの文字色に追従して意図しない色になる。

そのため `kiro.svg` の目は `black` ではなく **`#010101`** を指定している。
実測（Astro 7.2.2 / astro-icon 1.2.0）:

| 元の SVG | 取り込み後 |
|-|-|
| `fill="black"` | `fill="currentColor"` ← テーマの文字色に追従してしまう |
| `fill="#010101"` | `fill="#010101"` ← そのまま保持される |
| `fill="#0033FF"` | `fill="#03f"`（短縮表記のみ） |

## 非正方形のロゴも扱える

`Icon.astro` は高さのみを指定し、幅は viewBox の比率から自動計算させている
（`height:{size}px; width:auto`）。そのため `dify.svg`（48×21.335）のような
横長ロゴでも潰れない。

astro-icon は幅を `em` で補完する（例: `width="2.25em"`）が、`em` はフォントサイズ基準なので
px 指定の height と組み合わせると比率が崩れる。`Icon.astro` 側で CSS の `width:auto` に
上書きしているのはこのため。
