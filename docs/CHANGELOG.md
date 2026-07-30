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

### Changed

### Fixed

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

### Changed

- `Sales.SalesDateTime`を`SalesDate`に変更し、時刻を持たない仕様にした（シート：Sales）
- 顧客の識別方式を「店主が入力するニックネーム」に変更し、電話番号は識別に使わず連絡先情報として扱う方針にした（シート：Customer）
- 「会計入力」の表記を「伝票入力」に統一（SPEC.md, UI.md）

### Removed

- `Sales.PaymentMethod`を削除（支払いは現金固定のため）（シート：Sales）
