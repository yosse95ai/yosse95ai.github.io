---
inclusion: always
---
# 開発標準
以下のルールを必ず遵守すること。

## rule-1
会話セッションの最初に、必ず、Node と Bun のバージョンを確認し、一致していなければ切り替えること。

### Node
1. NVMのバージョンを確認　`cat ./.nvmrc`
2. LocalのNodeバージョン確認 `node --version`
3. 整合していなければ、NVMのバージョンに変更する `nvm use`

### Bun
4. 期待する Bun のバージョンを確認 `cat ./.bun-version`
5. Local の Bun バージョン確認 `bun --version`
6. 整合していなければ、`.bun-version` の値に合わせる `bun upgrade --to <version>`
