# ARCHITECTURE（実装方針）

GASでの実装方法・レイヤードアーキテクチャの構成を定義する。他ドキュメントが「何を」作るかを定義するのに対し、本ドキュメントのみ「どう作るか」を扱う。

## 目次

1. [本ドキュメントについて](#1-本ドキュメントについて)
2. [レイヤー構成](#2-レイヤー構成)
3. [ディレクトリ構成](#3-ディレクトリ構成)
4. [層間の依存ルール](#4-層間の依存ルール)
5. [GAS特有の設計方針](#5-gas特有の設計方針)
6. [エラーハンドリング方針](#6-エラーハンドリング方針)
7. [拡張・変更時の指針](#7-拡張変更時の指針)

## 1. 本ドキュメントについて

- 対象範囲：内部実装の構造・方針
- 対象外：機能仕様（→ [SPEC.md](./SPEC.md)）、画面仕様（→ [UI.md](./UI.md)）、データ構造の詳細（→ [DATABASE.md](./DATABASE.md)）

## 2. レイヤー構成

GASのWebアプリは「クライアント（ブラウザ側）」と「サーバー（Apps Script側）」に物理的に分かれる。これを4層に対応させる。

| 層 | 実行場所 | 役割 |
|---|---|---|
| UI層 | クライアント（HTML Service） | 画面描画、ユーザー操作の受付。`google.script.run`でアプリケーション層を呼び出す。業務ロジックは持たない |
| アプリケーション層 | サーバー（.gs） | `doGet`等のエントリーポイントと、クライアントから呼ばれるユースケース関数群。ドメイン層・データアクセス層を組み合わせて処理を完結させる。`google.script.run`はトップレベル関数のみ呼び出せる制約があるため、クライアント公開分（例：`getMenuList()`）はオブジェクトリテラルのメソッドではなくトップレベル関数として定義する |
| ドメイン層 | サーバー（.gs） | Spreadsheetに依存しない業務ロジック（例：合計金額の計算、新規/リピート判定、IDの採番規則） |
| データアクセス層 | サーバー（.gs） | Spreadsheetの読み書きに特化。シートの行とドメイン層で使うプレーンオブジェクトを相互変換する |

## 3. ディレクトリ構成

```
src/
├── client/                          # UI層（HTML Service）
│   ├── sales-entry.html             # 会計処理（SCR-002、会計管理／清算タブ）
│   ├── menu.html                    # 商品管理（SCR-003）
│   ├── customer.html
│   ├── seat.html
│   ├── dashboard.html               # ダッシュボード（SCR-006）。トップURLのデフォルト遷移先
│   ├── sales-stats.html             # 売上統計（SCR-007, SCR-011を統合）
│   ├── analysis-product.html        # 商品統計（SCR-008）
│   ├── data-analysis.html           # データ分析（SCR-009, SCR-010を統合）
│   └── shared/                      # 共通CSS/JS（includeスクリプトレットで各画面に差し込む）
│       ├── stylesheet.html
│       ├── sidebar.html
│       ├── icons.html
│       └── javascript.html
├── server/
│   ├── main.gs                      # doGet等のエントリーポイント（アプリケーション層）
│   ├── application/                 # ユースケース関数（例：SalesService, MenuService）
│   ├── domain/                      # 業務ロジック（例：SalesCalculator, VisitPolicy）
│   └── repository/                  # シート別のデータアクセス（例：SalesRepository）
└── appsscript.json
```

- `client/`はUI.mdの画面（SCR-XXX）に対応させる
- `server/repository/`はDATABASE.mdのシート単位（Menu, Sales, SalesDetail等）に対応させる
- サーバー側のファイルは全て`.gs`で統一する

## 4. 層間の依存ルール

- 依存方向は一方向のみ：UI層 → アプリケーション層 → （ドメイン層・データアクセス層）
- ドメイン層はデータアクセス層に依存しない（Spreadsheet APIを直接呼ばない。プレーンオブジェクトのみを扱う）
- データアクセス層はドメイン層が使うプレーンオブジェクトの形で返す（シートの生の行を上位層に渡さない）
- 依存性逆転（リポジトリのインターフェース分離・DI）は採用しない。小規模プロジェクトでの導入は過剰設計と判断（[CLAUDE.md](../CLAUDE.md)の原則を参照）
- 禁止：UI層からデータアクセス層への直接アクセス、ドメイン層からアプリケーション層・データアクセス層への依存

## 5. GAS特有の設計方針

> ここでは設定・実装の設計判断のみを記述する。実際の公開作業の手順は [DEVELOP.md](./DEVELOP.md) の「デプロイ手順」を参照

- 実行時間・同時実行の制限への対応
- トリガー設計
- サーバー側の全`.gs`ファイルは単一のグローバル名前空間を共有し、`import`/`export`が使えない。レイヤー・シート単位の境界は、オブジェクトリテラル（例：`SalesRepository.save()`）などの命名規則で表現し、実行時には強制されないことを踏まえて実装する
- HTML Serviceは通常のWebと異なり`<link>`/`<script src>`で外部の`.css`/`.js`ファイルを読み込めない。共通CSS/JSも`.html`ファイルとして作成し、`<?!= include('client/shared/stylesheet') ?>`のようなスクリプトレットで各画面に差し込む。`include()`に渡すファイル名は、GAS上のファイル名（`rootDir`である`src`からの相対パス。例：`src/client/shared/stylesheet.html`→`client/shared/stylesheet`）そのものを指定する必要があり、画面ファイルからの相対パスではない点に注意する
- Webアプリ公開設定：アクセス可能なユーザーは「全員（Googleアカウントでのログインが必要）」、実行ユーザーは「自分（デプロイしたアカウント）」とする。店主の代理としてスタッフが利用することを許容する前提（[SPEC.md](./SPEC.md#1-本ドキュメントについて)参照）のもと、スタッフ個別にスプレッドシートへの編集権限を付与せずに済むよう、スクリプトは店主のアカウント権限で実行する（`src/appsscript.json`の`webapp.access: "ANYONE"` / `webapp.executeAs: "USER_DEPLOYING"`）
- スプレッドシートへの直接アクセスを防ぐ実装（方針の根拠は [DATABASE.md](./DATABASE.md) の「データ管理方針」参照）
- ページルーティング：GASのWebアプリは`doGet`を1つしか持てないため、`e.parameter.page`（例：`?page=menu`）でHTMLファイルを出し分ける（`server/main.gs`の`PAGE_FILES`）。画面内の遷移リンクは相対パス（`href="?page=xxx"`）ではなく絶対URLで書く必要がある。Webアプリの`/exec` URLはアクセス時に`googleusercontent.com`のURLへリダイレクトされ、相対リンクはリダイレクト後のURLを基準に解決されて壊れるため。`doGet`で`template.baseUrl = ScriptApp.getService().getUrl()`をセットし、各画面で`<a href="<?= baseUrl ?>?page=xxx">`のように使う
- スプレッドシートIDの保持：`PropertiesService.getScriptProperties()`に`SPREADSHEET_ID`として保存する。ハードコードしない（コード変更・再デプロイなしにDB切り替えができるようにするため）。初回のみ`server/setup.gs`の`setupDatabase()`をApps Scriptエディタから手動実行し、スプレッドシートの新規作成とID保存を行う（`clasp run`によるコマンド実行はAPI Executableデプロイ等の追加設定が必要になるため、現状の規模では採用しない）
- TODO：AI分析機能で外部APIを呼び出す場合の技術的な制約（タイムアウト・リトライ等）への対応方針（実装着手前に決定）

## 6. エラーハンドリング方針

> ここでは技術的なエラー処理の実装方式のみを記述する。満たすべき可用性の水準は [SPEC.md](./SPEC.md) の「非機能要件」、障害発生時の対応手順は [DEVELOP.md](./DEVELOP.md) の「運用・保守」を参照

- エラーの分類
- ログ・通知方針

## 7. 拡張・変更時の指針

- 新しい画面（SCR-XXX）の追加：`client/`にHTMLを1つ追加し、対応するアプリケーション層の関数を呼び出す
- 新しいシート（DATABASE.md）の追加：`server/repository/`に対応するリポジトリを1つ追加する。他レイヤーはドメインオブジェクトの形しか知らないため影響範囲が閉じる
- 新しい業務ルールの追加：まずドメイン層に置けないか検討する（Spreadsheetに依存しないロジックはドメイン層に集約し、テストしやすくする）
- 既存レイヤーをまたぐ変更が必要になった場合は、層の役割分担（本ドキュメント2章）を見直す前に、まず本当に層の境界が誤っていないか疑う
