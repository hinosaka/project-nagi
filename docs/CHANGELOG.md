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

### Changed

- `Sales.SalesDateTime`を`SalesDate`に変更し、時刻を持たない仕様にした（シート：Sales）
- 顧客の識別方式を「店主が入力するニックネーム」に変更し、電話番号は識別に使わず連絡先情報として扱う方針にした（シート：Customer）

### Removed

- `Sales.PaymentMethod`を削除（支払いは現金固定のため）（シート：Sales）
