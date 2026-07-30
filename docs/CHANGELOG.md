# CHANGELOG（変更履歴）

仕様・実装の変更履歴を記録する。[Keep a Changelog](https://keepachangelog.com/) の形式を参考にする。

## 目次

- [記載ルール](#記載ルール)
- [Unreleased](#unreleased)

## 記載ルール

- 日付ベースで記録する（例：`## [2026-07-30]`）
- 変更種別：`Added` / `Changed` / `Fixed` / `Removed`
- 変更に関連するIDがあれば併記する：要件ID（REQ-XXX）／非機能要件ID（NFR-XXX）／画面ID（SCR-XXX）／シート名（DATABASE.md記載のシート名）

## [Unreleased]

### Added

- 座席管理（SCR-005）を実装：店内レイアウト（テーブルTB/TA・カウンターC1〜C8）に基づく配置図での一覧と、切替メニュー内の「無効にする」「有効にする」ボタンによる使用可否切替（誤操作防止のため座席クリックでは切り替わらない）。座席番号・種別・定員は固定のため編集・新規追加は対象外（画面：SCR-005、シート：Seat）
- `setupDatabase()`を拡張し、Seatシートの作成と初期データ（C1〜C8、TA、TB）の投入に対応。未作成のシートだけを追加する形にリファクタリングし、再実行可能にした（シート：Seat）
- 顧客管理（SCR-004）を実装：一覧表示（ニックネーム・来店回数・最終来店日・初回来店日）、ニックネームのみの新規登録、一覧のニックネームクリックで開く詳細ポップアップ（電話番号・過去注文の多いメニュー・メモの表示、電話番号・メモの編集）。新規登録時は来店回数0・初回/最終来店日を登録日時で初期化し、伝票入力の実装後に会計登録で加算・更新される想定（画面：SCR-004、要件：REQ-012, REQ-014、シート：Customer）
- Customerに自由記述の`Memo`列を追加（シート：Customer）
- マスタ系ID（`{頭文字}-{4桁連番}`）の採番規則を`SequentialIdRule`として共通化し、Menu・Customerで共用（旧`MenuIdRule`を統合）（ARCHITECTURE.md準拠）
- `setupDatabase()`にCustomerシートの作成を追加（データは投入せず、実際の登録画面から入力する運用）（シート：Customer）

### Changed

### Fixed

- 顧客管理（SCR-004）で一覧が表示されない不具合を修正：`getCustomerList()`の失敗が画面に表示されず無言で終わっていたためエラー表示を追加。あわせて`FirstVisitDate`/`LastVisitDate`を`Date`型のまま`google.script.run`で返していたのをやめ、サーバー側で文字列（`yyyy/MM/dd`）に整形してから返すよう変更（画面：SCR-004）

- メニュー管理画面（SCR-003）が白紙表示になる不具合を修正：`include()`に渡すファイル名を`shared/stylesheet`から`client/shared/stylesheet`に訂正（GAS上のファイル名は`rootDir`からの相対パスであり、画面ファイルからの相対パスではないため）。ARCHITECTURE.mdの記載例も合わせて訂正（画面：SCR-003）

### Removed

## [2026-07-30]

### Added

- 売上管理のデータ構造を新規設計（シート：Menu, Sales, SalesDetail）
- 新規／リピート判別のためCustomerシートを新設（シート：Customer）
- 曜日・天候を分析するためBusinessDayシートを新設（シート：BusinessDay）
- 客単価・席稼働分析のためSeatシートを新設し、Salesに`PartySize`・`SeatId`を追加（シート：Seat, Sales）
- SalesDetailに`CustomerId`を追加し、顧客ごとのメニュー傾向を集計できるようにした（シート：SalesDetail）
- Menuに2階層カテゴリ`CategoryLarge`/`CategoryMedium`を追加（シート：Menu）
- SPEC.mdの非機能要件にID（NFR-XXX）と優先度区分を付与
- UI.mdの画面別仕様テンプレートに「使用データ」項目を追加、顧客選択UXのメモを追加
- ホーム画面（SCR-001）に、直近営業日の売上サマリーと実績ベースの一言アドバイス機能を追加（画面：SCR-001、要件：REQ-036, REQ-037）
- UI.mdにSCR-001〜SCR-011の全11画面（ホーム〜月次推移・比較）の詳細仕様（目的・表示項目・使用データ・操作・画面遷移）を記載（UI.md）
- ARCHITECTURE.mdにレイヤー構成（UI層／アプリケーション層／ドメイン層／データアクセス層）・ディレクトリ構成・層間の依存ルールを追加（ARCHITECTURE.md）
- 天候に基づく事前アドバイスの実現方式（店主の朝入力運用／外部天気API）をTODOとしてDATABASE.mdに追加（シート：BusinessDay）
- 開発環境を構築：`clasp`導入、GASプロジェクト新規作成（standalone、`rootDir: src`）、DEVELOP.mdにセットアップ手順を記載
- ARCHITECTURE.mdのディレクトリ構成に沿って`src/client/`（11画面分のHTMLひな形＋`shared/`）・`src/server/`（`main.gs`、`application/`・`domain/`・`repository/`）を作成（中身は未実装）
- Webアプリの公開設定を決定：アクセス可能なユーザーは「全員（Googleアカウントでのログイン必須）」、実行ユーザーは「自分（デプロイしたアカウント）」（ARCHITECTURE.md, `src/appsscript.json`のwebapp設定）
- `main.gs`に疎通確認用の暫定`doGet`を実装し、Webアプリとして初回デプロイ（DEVELOP.mdにデプロイ手順・バージョン管理方針を記載）
- メニュー管理（SCR-003）を実装：一覧表示・新規登録・編集・販売終了（論理削除）（画面：SCR-003、要件：REQ-001, REQ-002, REQ-003, REQ-004, REQ-026、シート：Menu）
- 全リポジトリ共通のデータアクセス基盤を追加：スプレッドシートID保持（Script Properties）、初回セットアップ用`setupDatabase()`、シート⇔オブジェクト変換の共通処理（`SheetUtil`）、ページルーティング（`main.gs`の`page`パラメータ）をARCHITECTURE.mdに追記

### Changed

- `Sales.SalesDateTime`を`SalesDate`に変更し、時刻を持たない仕様にした（シート：Sales）
- 顧客の識別方式を「店主が入力するニックネーム」に変更し、電話番号は識別に使わず連絡先情報として扱う方針にした（シート：Customer）
- 「会計入力」の表記を「伝票入力」に統一（SPEC.md, UI.md）
- アプリケーション名を「pos-app」から「店長のノート」に変更（Webアプリのタイトル、ホーム画面表示、GASプロジェクト名、スプレッドシート名）

### Removed

- `Sales.PaymentMethod`を削除（支払いは現金固定のため）（シート：Sales）
