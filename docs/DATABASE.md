# DATABASE（データ設計）

Googleスプレッドシート（唯一のデータベース）の構造を定義する。

## 目次

1. [本ドキュメントについて](#1-本ドキュメントについて)
2. [シート一覧](#2-シート一覧)
3. [シート別定義](#3-シート別定義)
4. [命名規則](#4-命名規則)
5. [データ管理方針](#5-データ管理方針)

## 1. 本ドキュメントについて

- 対象範囲：スプレッドシートのシート構成、カラム定義、シート間の関連、データを「何から守るか」という方針
- 対象外：画面からの入力仕様（→ [UI.md](./UI.md)）、要件の背景（→ [SPEC.md](./SPEC.md)）、方針を「どう実装するか」（→ [ARCHITECTURE.md](./ARCHITECTURE.md)）

## 2. シート一覧

### 2.1 現行シート（詳細設計あり）

> シートが増えるたびに行を追加する

| シート名 | 概要 | 関連要件ID |
|---|---|---|
| Menu | 商品（メニュー）マスタ | REQ-001, REQ-002, REQ-003, REQ-004, REQ-026, REQ-029 |
| Sales | 会計ヘッダ（売上管理） | REQ-005, REQ-007, REQ-008, REQ-009, REQ-010, REQ-017, REQ-024, REQ-028, REQ-032, REQ-033, REQ-034, REQ-036 |
| SalesDetail | 売上明細（会計ごとの商品・数量） | REQ-006, REQ-007, REQ-018, REQ-023, REQ-025, REQ-029, REQ-030, REQ-031, REQ-034, REQ-036 |
| Customer | 顧客マスタ（新規／リピート判別） | REQ-012, REQ-013, REQ-014, REQ-015, REQ-020, REQ-023, REQ-032 |
| BusinessDay | 営業日実績（曜日・天候・準備金） | REQ-011, REQ-019, REQ-039, REQ-040 |
| Seat | 座席マスタ（客単価・席稼働の分析用） | REQ-009, REQ-016, REQ-021 |
| SalesTarget | 売上目標（予実管理用） | REQ-027, REQ-028 |
| RegisterCloseLog | レジクローズ実施履歴（清算タブ用） | REQ-041 |
| Category | 商品大分類マスタ（カテゴリー管理用） | REQ-001, REQ-042 |
| SubCategory | 商品中分類マスタ（カテゴリー管理用） | REQ-001, REQ-042 |
| DailyTarget | 日別目標売上（予算管理・日別予算設定用） | REQ-046 |
| ExpenseCategory | 経費区分マスタ（仕入れ／家賃／水道光熱費等） | REQ-047 |
| ExpenseTarget | 経費目標（区分ごとの月次予定額） | REQ-048 |
| Expense | 経費実績 | REQ-049 |
| ExpenseVendor | 取引先マスタ（経費の支払先） | REQ-050 |

### 2.2 将来追加予定のデータドメイン（詳細設計は未着手）

> ここでは対象ドメインの名称のみを記載する。カラム定義は着手時に3章へ追加する

| ドメイン | 概要 |
|---|---|
| Inventory / InventoryLog | 在庫管理（在庫品目マスタ・入出庫ログ） |
| Purchase / PurchaseDetail | 発注管理（仕入先への発注ヘッダ・明細） |
| Reservation | 予約管理 |

## 3. シート別定義

> シートごとに章（3.1, 3.2, ...）を追加していく
> TODO：シート数が増えた場合、機能ドメイン単位（売上系／在庫系／予約系など）でグルーピングした章構成へ再編するか、実装着手前に検討する

### 3.1 Menu（商品マスタ）

| カラム名 | 型 | 必須 | 説明 |
|---|---|---|---|
| MenuId | 文字列 | ○ | 主キー。形式：`M-0001` |
| MenuName | 文字列 | ○ | 商品名 |
| Price | 数値 | ○ | 現在の販売価格（円） |
| Cost | 数値 | - | 現在の原価（円、店主が入力する概算値）。粗利益・原価率の算出に使う。未入力の商品は利益計算の対象外とする |
| CategoryLarge | 文字列 | ○ | 大分類（例：ドリンク／フード） |
| CategoryMedium | 文字列 | ○ | 中分類（例：アルコール／おすすめ）。大分類配下の分類で、商品別・分類別の集計に使う |
| IsActive | 真偽値 | ○ | 販売中フラグ。`false`は販売終了（論理削除。行自体は削除しない） |

- 関連：`SalesDetail.MenuId` から参照される

### 3.2 Sales（会計ヘッダ）

> 会計は手書き伝票・手動計算・現金授受まで完了した後、営業終了後にまとめてデータ化する運用を前提とする。そのため本アプリは「確定済みの会計結果」のみを記録し、伝票段階での取消・返金の状態管理は行わない。ただし入力ミスの訂正のため、入力済みデータ自体はいつでも修正・削除できる（データ管理方針参照）

| カラム名 | 型 | 必須 | 説明 |
|---|---|---|---|
| SalesId | 文字列 | ○ | 主キー。形式：`S-YYYYMMDD-0001`（会計日ごとに連番リセット） |
| SalesDate | 日付 | ○ | 会計日（伝票に基づく実際の会計発生日。時刻は持たない） |
| CustomerId | 文字列 | - | 外部キー。`Customer.CustomerId`を参照（任意。伝票に顧客情報がない場合は空欄） |
| SeatId | 文字列 | - | 外部キー。`Seat.SeatId`を参照（任意。座席が特定できない場合は空欄） |
| PartySize | 数値 | ○ | 人数。客単価（`TotalAmount ÷ PartySize`）の算出に使う |
| TotalAmount | 数値 | ○ | 合計金額。登録時にSalesDetailの小計から計算して保存する（数式に依存しない） |
| Note | 文字列 | - | 備考 |
| RegisteredAt | 日時 | ○ | このアプリにデータ入力した日時（システムが自動記録。`SalesDate`との差分で入力の遅延を追跡できる） |

- 関連：`SalesDetail.SalesId` から参照される（Sales 1 : SalesDetail 多）、`Customer.CustomerId` を参照する（任意）、`Seat.SeatId` を参照する（任意）

### 3.3 SalesDetail（売上明細）

| カラム名 | 型 | 必須 | 説明 |
|---|---|---|---|
| SalesDetailId | 文字列 | ○ | 主キー。形式：`{SalesId}-明細行番号`（例：`S-20260730-0001-1`） |
| SalesId | 文字列 | ○ | 外部キー。`Sales.SalesId`を参照 |
| MenuId | 文字列 | - | 外部キー。`Menu.MenuId`を参照。登録外の商品（一時的な追加・個数の特別対応など）を入力する場合は空欄とし、`MenuName`/`UnitPrice`をその場で直接入力する |
| MenuName | 文字列 | ○ | 会計時点の商品名。`MenuId`がある場合はMenuのスナップショット（Menu改名の影響を受けない）、空欄の場合はその場で入力した名称 |
| UnitPrice | 数値 | ○ | 会計時点の単価。`MenuId`がある場合はMenuのスナップショット（`Menu.Price`変更の影響を受けない）、空欄の場合はその場で入力した金額 |
| UnitCost | 数値 | - | 会計時点の原価のスナップショット（`Menu.Cost`変更の影響を受けない）。`Menu.Cost`が未入力の場合は空欄 |
| Quantity | 数値 | ○ | 数量 |
| Subtotal | 数値 | ○ | 小計（`UnitPrice × Quantity`）。登録時に計算して保存する |
| CustomerId | 文字列 | - | `Sales.CustomerId`の複製（非正規化）。顧客ごとのメニュー傾向を、Salesと結合せずSalesDetail単独で集計できるようにするために持つ |
| CategoryLarge | 文字列 | - | 大分類（例：ドリンク／フード）。`MenuId`がある場合は`Menu.CategoryLarge`のスナップショット。登録外の場合も店主が選択した分類を保存し、カテゴリ別集計の対象にする（分類不明の場合のみ空欄） |
| CategoryMedium | 文字列 | - | 中分類。`MenuId`がある場合は`Menu.CategoryMedium`のスナップショット。登録外の場合は中分類を選択するUIがないため常に空欄（中分類別の集計では「その他」として扱う） |

- 関連：`Sales.SalesId`、`Menu.MenuId`（任意）、`Customer.CustomerId`（`Sales.CustomerId`経由の複製）を参照する

### 3.4 Customer（顧客マスタ）

| カラム名 | 型 | 必須 | 説明 |
|---|---|---|---|
| CustomerId | 文字列 | ○ | 主キー。形式：`C-0001` |
| CustomerName | 文字列 | ○ | 店主が識別のために付けるニックネーム（本名でなくてよい）。1ニックネーム1人のみ（重複登録不可）。顧客管理画面で登録後も変更できる |
| PhoneNumber | 文字列 | - | 電話番号（任意）。顧客の識別・新規/リピート判定には使用しない。将来、予約の電話対応をする際の連絡先として保持する |
| FirstVisitDate | 日付 | ○ | 初回来店日。`Sales.SalesDate`の実績から算出する（レコード作成時点の日時ではない）。会計データがまだ無い顧客は、登録した日時を暫定値として持つ |
| LastVisitDate | 日付 | ○ | 最終来店日。`Sales.SalesDate`の実績から算出する。この顧客の会計が登録・修正・削除されるたびに再計算する |
| VisitCount | 数値 | ○ | 来店回数。会計登録時にアプリケーションが加算する。`1`＝新規、`2以上`＝リピートとして判別する |
| IsActive | 真偽値 | ○ | 論理削除フラグ |
| Memo | 文字列 | - | 店主が自由に記録するメモ（好み・注意事項など）。任意項目 |

- 関連：`Sales.CustomerId` から参照される

### 3.5 BusinessDay（営業日実績）

> 曜日・天候は「会計1件」ではなく「営業日1日」に対して1つ定まる情報のため、SalesやSalesDetailに直接持たせず、営業日単位のシートとして独立させる

| カラム名 | 型 | 必須 | 説明 |
|---|---|---|---|
| BusinessDayId | 文字列 | ○ | 主キー。形式：`BD-YYYYMMDD`（1日1行のため連番は不要） |
| SalesDate | 日付 | ○ | 営業日。`Sales.SalesDate`との結合キー（IDではなく日付値で結合する） |
| DayOfWeek | 文字列 | ○ | 曜日。`SalesDate`から登録時にアプリケーションが計算して保存する |
| Weather | 文字列 | ○ | 天候（例：晴れ／曇り／雨／雪）。データ入力時に店主が選択・入力する |
| StartingCash | 数値 | - | 準備金（レジ内の釣り銭準備金）。清算タブでいつでも入力・修正できる。未入力は0として扱う |

- 関連：`Sales.SalesDate`と日付が一致する行から参照される（Sales 多 : BusinessDay 1）

### 3.6 Seat（座席マスタ）

> 店内レイアウト（カウンター8席・4人掛けテーブル2卓）に基づく固定マスタ。会計1件（Sales 1行）が、どの席／卓で発生したかを紐づけ、席種別ごとの稼働・客単価分析に使う

| カラム名 | 型 | 必須 | 説明 |
|---|---|---|---|
| SeatId | 文字列 | ○ | 主キー。形式：`C1`〜`C8`（カウンター）, `TA`, `TB`（テーブル） |
| SeatType | 文字列 | ○ | 席種別（カウンター／テーブル） |
| Capacity | 数値 | ○ | 定員（カウンター＝1、テーブル＝4） |
| IsActive | 真偽値 | ○ | 使用可否フラグ。一時的な利用停止や店内レイアウト変更時の使用終了に使う。Menu等の論理削除と異なり、店主の操作で再度`true`に戻せる（座席は在庫のように増減するものではなく、一時的な運用状況を表すため） |

- 関連：`Sales.SeatId` から参照される

### 3.7 SalesTarget（売上目標）

> 予実管理（実績÷目標）のための目標値マスタ。店主が月ごとに手入力する

| カラム名 | 型 | 必須 | 説明 |
|---|---|---|---|
| SalesTargetId | 文字列 | ○ | 主キー。形式：`TGT-YYYYMM`（1ヶ月1行のため連番は不要） |
| TargetMonth | 文字列 | ○ | 対象年月（例：`2026-07`）。`Sales.SalesDate`の年月と一致させて実績と比較する |
| TargetAmount | 数値 | ○ | 目標売上金額 |
| Note | 文字列 | - | 備考 |

- 関連：`Sales.SalesDate`の年月と一致する期間の実績と比較される（IDではなく年月の値で結合する）

### 3.8 RegisterCloseLog（レジクローズ実施履歴）

> 清算タブの「レジクローズ」操作を実施するたびに1行追記するログ。同じ営業日に対して何回でも実施でき、上書きせず履歴として全件残す（会計管理側の編集をロックする機能ではない）

| カラム名 | 型 | 必須 | 説明 |
|---|---|---|---|
| RegisterCloseLogId | 文字列 | ○ | 主キー。形式：`RC-YYYYMMDD-0001`（実施日ごとに連番リセット） |
| SalesDate | 日付 | ○ | 対象の営業日 |
| StartingCash | 数値 | ○ | 実施時点の準備金のスナップショット（`BusinessDay.StartingCash`は後から変更されうるため、実施時点の値を保持する） |
| CashSalesAmount | 数値 | ○ | 実施時点の現金売上額のスナップショット（支払いは現金固定のため、対象営業日の`Sales.TotalAmount`合計と同値） |
| ExpectedCashBalance | 数値 | ○ | 実施時点の予想現金残高のスナップショット（`StartingCash + CashSalesAmount`） |
| ClosedAt | 日時 | ○ | レジクローズを実施した日時（システムが自動記録） |

- 関連：`Sales.SalesDate`と日付が一致する行を集計した結果をスナップショットとして持つ（IDでの参照はしない）

### 3.9 Category（商品大分類マスタ）

> カテゴリー管理画面（SCR-003）で、商品登録に依存せず独立したカテゴリーを管理するためのマスタ。`Menu.CategoryLarge`はこのシートへの外部キーではなく、`CategoryName`と同じ文字列を保持する（3.1参照）。表示順はシート上の行順とする。分析軸を一定に保つため、カテゴリーの追加・削除機能は提供しない（初期構築時に定義した固定の分類とし、名称変更のみ可能）

| カラム名 | 型 | 必須 | 説明 |
|---|---|---|---|
| CategoryId | 文字列 | ○ | 主キー。形式：`CAT-0001` |
| CategoryName | 文字列 | ○ | カテゴリー名（例：ドリンク／フード）。シート内で一意 |

- 関連：`Menu.CategoryLarge`と`CategoryName`が一致する（IDでの参照はしない）。名称変更時は一致する`Menu.CategoryLarge`を新しい名称に一括更新する

### 3.10 SubCategory（商品中分類マスタ）

> カテゴリー管理画面・商品一覧の編集モードで、大分類配下の中分類を作成・名称変更・並び替え・削除できるマスタ。`Menu.CategoryMedium`はこのシートへの外部キーではなく、`SubCategoryName`と同じ文字列を保持する（3.1参照）。削除は物理削除とする（`IsActive`は持たない）。`Menu.CategoryMedium`は文字列スナップショットのため、削除しても該当商品自体は壊れず残る（分類マスタの管理対象から外れるのみ）

| カラム名 | 型 | 必須 | 説明 |
|---|---|---|---|
| SubCategoryId | 文字列 | ○ | 主キー。形式：`SCT-0001` |
| CategoryId | 文字列 | ○ | 外部キー。`Category.CategoryId`を参照 |
| SubCategoryName | 文字列 | ○ | サブカテゴリー名（例：アルコール／おすすめ）。同一`CategoryId`内で一意 |
| SortOrder | 数値 | ○ | 同一`CategoryId`内での表示順（商品一覧のグループ表示順）。カテゴリー管理画面で並び替え可能 |

- 関連：`Category.CategoryId`を参照する。`Menu.CategoryMedium`と`SubCategoryName`が一致する（IDでの参照はしない）。名称変更時は、対応する大分類名と一致する`Menu.CategoryLarge`/`CategoryMedium`の組を新しい名称に一括更新する

### 3.11 DailyTarget（日別目標売上）

> 予算管理画面（SCR-012）の日別予算設定で使う、日単位の明示的な目標売上。未設定の日はここに行を持たず、売上統計（SCR-007, SCR-011）の日別タブ・予算管理の日別予算設定タブでは月目標の日数按分にフォールバックする

| カラム名 | 型 | 必須 | 説明 |
|---|---|---|---|
| DailyTargetId | 文字列 | ○ | 主キー。形式：`DT-YYYYMMDD` |
| TargetDate | 日付 | ○ | 対象日 |
| TargetAmount | 数値 | ○ | その日の目標売上金額 |

- 関連：`SalesTarget.TargetMonth`と対象月が一致する（IDでの参照はしない）。日別予算設定タブの「保存」操作のたびに対象月の行を全削除して書き直す

> 2026-08-02：固定費から目標売上を逆算する機能（FixedCost, BudgetSettings）は実装後にUIの複雑さを理由に廃止した。両シート自体はスプレッドシート上に残っているが、現在は参照するコード・機能がない（詳細はCHANGELOG.md参照）

### 3.12 ExpenseCategory（経費区分マスタ）

> 経費管理画面（3.7参照）で、仕入れ・家賃・水道光熱費など経費の分類を管理するマスタ。Menu/Seatと同じく論理削除（IsActive）で管理し、並び替え・名称変更に対応する。初期状態で「仕入れ・家賃・水道光熱費・人件費・その他」の5件をあらかじめ登録する（店主が自由に追加・改名・無効化できる）

| カラム名 | 型 | 必須 | 説明 |
|---|---|---|---|
| ExpenseCategoryId | 文字列 | ○ | 主キー。形式：`EC-0001` |
| ExpenseCategoryName | 文字列 | ○ | 区分名（例：仕入れ／家賃） |
| SortOrder | 数値 | ○ | 表示順。編集モードでドラッグ並び替え可能 |
| IsActive | 真偽値 | ○ | 論理削除フラグ |

- 関連：`ExpenseTarget.ExpenseCategoryId`、`Expense.ExpenseCategoryId` から参照される

### 3.13 ExpenseTarget（経費目標）

> 区分ごとの月次予定額。SalesTargetの区分別版（1区分・1ヶ月につき1行）

| カラム名 | 型 | 必須 | 説明 |
|---|---|---|---|
| ExpenseTargetId | 文字列 | ○ | 主キー。形式：`EXT-YYYYMM-{ExpenseCategoryId}`（例：`EXT-202608-EC-0001`） |
| TargetMonth | 文字列 | ○ | 対象年月（例：`2026-08`） |
| ExpenseCategoryId | 文字列 | ○ | 外部キー。`ExpenseCategory.ExpenseCategoryId`を参照 |
| TargetAmount | 数値 | ○ | その区分・月の予定額 |
| Note | 文字列 | - | 備考 |

- 関連：`ExpenseCategory.ExpenseCategoryId`を参照する。`Expense`の同月・同区分の実績合計と比較される（IDではなく年月・区分の値で結合する）

### 3.14 Expense（経費実績）

> Salesと同じく、登録・修正・削除のたびに実データを直接更新する（論理削除ではない、入力ミスの訂正を随時許可する方針）

| カラム名 | 型 | 必須 | 説明 |
|---|---|---|---|
| ExpenseId | 文字列 | ○ | 主キー。形式：`EXP-YYYYMMDD-0001`（発生日ごとに連番リセット） |
| ExpenseDate | 日付 | ○ | 発生日 |
| ExpenseCategoryId | 文字列 | ○ | 外部キー。`ExpenseCategory.ExpenseCategoryId`を参照 |
| Amount | 数値 | ○ | 金額 |
| Note | 文字列 | - | 備考 |
| RegisteredAt | 日時 | ○ | このアプリにデータ入力した日時（システムが自動記録） |
| ExpenseVendorId | 文字列 | - | 外部キー。`ExpenseVendor.ExpenseVendorId`を参照（任意）。後から追加した列のため末尾に配置（命名規則参照） |

- 関連：`ExpenseCategory.ExpenseCategoryId`、`ExpenseVendor.ExpenseVendorId`（任意）を参照する

### 3.15 ExpenseVendor（取引先マスタ）

> 経費の支払先（仕入れ先・家賃の貸主等）。Customerと同じく論理削除（IsActive）で管理し、経費記録時にオートコンプリートで選択、または新規名称の入力でその場登録できる（`resolveExpenseVendorId_`、ExpenseService.gs）

| カラム名 | 型 | 必須 | 説明 |
|---|---|---|---|
| ExpenseVendorId | 文字列 | ○ | 主キー。形式：`EV-0001` |
| ExpenseVendorName | 文字列 | ○ | 取引先名。1名称1件のみ（重複登録不可、Customerと同じ方針） |
| IsActive | 真偽値 | ○ | 論理削除フラグ |

- 関連：`Expense.ExpenseVendorId` から参照される

## 4. 命名規則

- シート名（コード上の識別子）：英語PascalCase・単数形（例：`Menu`, `Sales`, `SalesDetail`）。本ドキュメント・各Repository.gsでの参照は常にこの識別子を使う
  - 実際のスプレッドシートのタブ表示名は、店主が閲覧してすぐ理解できるよう日本語に変換している（例：`Menu`→「商品」）。対応は`SpreadsheetConfig.gs`の`SHEET_DISPLAY_NAMES_`で一元管理し、コード上の参照名・カラム名（英語PascalCase）には影響しない
- カラム名：英語PascalCase（例：`MenuId`, `SalesDate`）
- 主キー列：`{シート名}Id`
- 外部キー列：参照先のシート名＋`Id`（例：`SalesDetail.SalesId`, `SalesDetail.MenuId`）
- ID値の形式はシートの性質に応じて使い分ける（詳細は各シート定義を参照）
  - マスタ系：`{頭文字}-{4桁連番}`（例：`M-0001`、`Category`は`CAT-0001`、`SubCategory`は`SCT-0001`）
  - 会計などの日次トランザクション：`{頭文字}-{発生日YYYYMMDD}-{4桁連番}`（例：`S-20260730-0001`）。日ごとに連番をリセットすることで採番上限を気にせず、日付も一目で分かるレシート番号として運用する
  - 明細系：`{親のID}-{明細行番号}`（例：`S-20260730-0001-1`）
  - 日付ディメンション（BusinessDay）：`{頭文字}-{YYYYMMDD}`（例：`BD-20260730`）。1日1行のみのため連番は不要
  - 固定の少数マスタ（Seat）：業務上の呼び方をそのままIDにする（例：`C1`〜`C8`, `TA`, `TB`）。件数が少なく変動しないため、意味を持たないIDより現場で使う呼称の方が分かりやすい
  - 月次ディメンション（SalesTarget）：`{頭文字}-{YYYYMM}`（例：`TGT-202607`）。1ヶ月1行のみのため連番は不要
- マスタ（Menu/Customer/Seat）の削除は論理削除とし、`IsActive`（真偽値）で管理する。物理削除は行わない（トランザクションデータからの参照が壊れるため）
- トランザクションデータ（Sales/SalesDetail）は他シートから参照される主体ではないため、入力ミスの訂正を目的とした物理的な修正・削除を随時許可する（マスタの論理削除ルールとは異なる）
- カラムは位置ではなくヘッダー名で参照する。将来カラムを追加する場合は末尾に追加し、既存カラムの位置・型は変更しない

## 5. データ管理方針

> ここでは「何を守るか」という方針のみを記述する。実装方法（GASの権限設定・アクセス制御の具体的な実現手段）は [ARCHITECTURE.md](./ARCHITECTURE.md) の「GAS特有の設計方針」に記載する

- Single Source of Truthとしての運用ルール
- 店主が直接編集しないという方針（実現方法はARCHITECTURE.md参照）
- トランザクションデータ（Sales/SalesDetail）は登録時点の情報をスナップショットとして保持し、マスタ（Menu）の現在値の変更による影響を受けない
- 集計値（`Sales.TotalAmount`、`SalesDetail.Subtotal`、`Customer.VisitCount`/`FirstVisitDate`/`LastVisitDate`）は登録時にアプリケーションが計算して保存し、スプレッドシートの数式には依存しない
- `Sales`の修正・削除により`CustomerId`の紐付けが変わる場合（修正・削除・顧客の変更）、影響を受ける`Customer.VisitCount`/`FirstVisitDate`/`LastVisitDate`は再計算して整合させる（`VisitStatsCalculator.gs`）
- `Customer.CustomerName`は重複登録できない（1ニックネーム1人）。会計処理画面でのその場新規登録時に既存顧客と同名を入力した場合は、新規作成せず既存顧客にそのまま紐付ける（`resolveCustomerId_`、SalesService.gs）
- `SalesDetail.MenuId`が空欄の行（登録外メニュー）は、入力時に店主が選択した`SalesDetail.CategoryLarge`により大分類の集計には反映される（伝票入力画面で「その他ドリンク」「その他フード」等から選ぶ）。ただし`CategoryMedium`（中分類）は持たないため、中分類別の集計では「その他」として扱う
- 分析の利便性のため、一部の関連キー（`SalesDetail.CustomerId`）はシート結合を省くために非正規化して重複保持する。正の値は常に`Sales.CustomerId`側とする
- `BusinessDay.DayOfWeek`は`SalesDate`から一意に定まる値であり、登録時にアプリケーションが計算して保存する（分析時に数式なしで参照できるようにするため）
- 客単価は`Sales.TotalAmount ÷ Sales.PartySize`で都度算出する値とし、列としては持たない（単純な四則演算であり、保存しても更新漏れのリスクが増えるだけのため）
- 座席の稼働は「日ごとの利用件数」までの分析粒度とする。会計時刻を持たない方針（[3.2 Sales](#32-sales会計ヘッダ)参照）のため、時間帯別の回転率までは算出できない
- `Menu.Cost`／`SalesDetail.UnitCost`は店主が入力する概算値とする。将来Inventory／Purchase機能を実装する際は、仕入実績から原価を自動算出する方式への切替を検討する（現時点ではデータ源が手入力のみのため）
- 「常連率」等、特定の過去時点における新規／リピート状態を分析する場合は`Customer.VisitCount`（現在時点の累計）をそのまま使わない。`VisitCount`は分析実行時点の値であり、過去のある会計がその顧客にとって何回目の来店だったかは表さないため、`Sales.CustomerId`と`Sales.SalesDate`から顧客ごとに来店順を並べ直して算出する
- `SalesTarget`は実績（Sales）と独立した目標値マスタであり、実績側の登録・修正に連動して自動更新されることはない
- `Category`/`SubCategory`は`Menu.CategoryLarge`/`CategoryMedium`へのIDによる外部キーを持たない（名称一致で参照する）設計とした。理由：`SalesDetail`が既に`CategoryLarge`/`CategoryMedium`を文字列スナップショットとして持つ既存設計と整合させ、`Menu`の外部キー化に伴うマスタ全体の移行を避けるため。この設計では名称変更時に一致する`Menu`行の一括更新（カスケード）が必須となる（CategoryService.gs参照）。件数の少ないマスタデータでの名称変更（まれな管理操作）を想定しており、対象行数が多くなる運用（多店舗展開等）になった場合はID参照方式への切替を再検討する
- `Category`は分析軸を一定に保つため追加・削除機能を提供せず、名称変更のみ対応する。`SubCategory`は作成・名称変更・並び替え・削除に対応するが、論理削除（`IsActive`）は持たず物理削除とする（`Menu`商品削除と同じ考え方。`Menu.CategoryMedium`が文字列スナップショットのため、削除しても既存商品のデータは壊れない）
- TODO：AI分析機能で外部にデータを送信する場合の可否・範囲のポリシーを実装着手前に決定する
- TODO：`BusinessDay.Weather`は営業終了後の事後入力のみであり、当日・翌日の予報天気を持つ手段がない。天候に基づく事前アドバイス（例：入荷準備の提案）を実現するには、店主が朝に予報を入力する運用にするか、外部天気APIから自動取得するかを実装着手前に決定する
