# docs 索引

各ドキュメントの役割・責務分担をまとめた索引。Claude Codeの役割分担・意思決定の原則は [../CLAUDE.md](../CLAUDE.md) を参照。

## 目次

- [各ドキュメントの役割](#各ドキュメントの役割)
- [読む順番の目安](#読む順番の目安)
- [更新ルール](#更新ルール)

## 各ドキュメントの役割

| ドキュメント | 扱う内容 | 扱わない内容 |
|---|---|---|
| [SPEC.md](./SPEC.md) | 何を実現するか（機能要件・非機能要件） | 画面仕様、データ構造、実装方法 |
| [DATABASE.md](./DATABASE.md) | データの構造（シート・カラム定義） | 画面からの入力仕様、実装方法 |
| [UI.md](./UI.md) | 画面構成・操作仕様 | 機能の背景・理由、データ構造 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 実装方法（レイヤー構成、GAS特有の制約対応） | 仕様そのもの |
| [DEVELOP.md](./DEVELOP.md) | 開発環境・デプロイ・運用の実務手順 | 設計・仕様の内容 |
| [CHANGELOG.md](./CHANGELOG.md) | 変更履歴（時系列の記録） | 現在の仕様（現在の正は各ドキュメント本体） |

## 読む順番の目安

1. [../CLAUDE.md](../CLAUDE.md) — 役割分担・意思決定の原則
2. [SPEC.md](./SPEC.md) — 何を作るか
3. [UI.md](./UI.md) / [DATABASE.md](./DATABASE.md) — 画面・データ
4. [ARCHITECTURE.md](./ARCHITECTURE.md) — 実装方法
5. [DEVELOP.md](./DEVELOP.md) — 動かし方
6. [CHANGELOG.md](./CHANGELOG.md) — 変更の履歴

## 更新ルール

- Decisionを反映する際は、責務に対応する1ファイルのみを更新する。複数ファイルにまたがる場合は影響範囲を明記する
- 要件ID（REQ-XXX）・画面ID（SCR-XXX）は各ファイル冒頭の採番台帳（次の空きID）で管理し、重複・欠番を防ぐ
