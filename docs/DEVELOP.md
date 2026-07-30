# DEVELOP（開発・運用手順）

開発環境のセットアップから、デプロイ・運用・保守までの実務手順を定義する。

## 目次

1. [本ドキュメントについて](#1-本ドキュメントについて)
2. [開発環境セットアップ](#2-開発環境セットアップ)
3. [開発フロー](#3-開発フロー)
4. [デプロイ手順](#4-デプロイ手順)
5. [テスト方針](#5-テスト方針)
6. [運用・保守](#6-運用保守)

## 1. 本ドキュメントについて

- 対象範囲：開発環境構築、デプロイ、運用に関する実務手順
- 対象外：仕様・設計内容（→ 他ドキュメントを参照）

## 2. 開発環境セットアップ

- 必要なツール：Node.js、npm、`clasp`（`@google/clasp`）。`clasp`はグローバルインストールせず`devDependencies`で管理し、`npx clasp <command>`で実行する
- GASプロジェクトとの紐付け：`.clasp.json`（`scriptId`・`rootDir: "src"`）をリポジトリにコミットして共有する。認証情報（`~/.clasprc.json`）は各開発者のマシンに個別に保存し、コミットしない（`.gitignore`対象）

### 初回セットアップ手順（このリポジトリを初めてGASプロジェクトと紐付ける場合）

1. `npm install` — `clasp`等の依存関係をインストール
2. `npx clasp login` — Googleアカウントでログイン（ブラウザでOAuth認証。表示される権限は「すべて選択」でよい）
3. 初回のみ：https://script.google.com/home/usersettings で「Apps Script API」を有効化（反映まで数分かかる場合がある）
4. `npx clasp create --type standalone --title "pos-app" --rootDir ./src` — GASプロジェクトを新規作成（`.clasp.json`が生成される）

### 2台目以降の開発環境（`.clasp.json`が既にリポジトリにある場合）

1. `npm install`
2. `npx clasp login` — 自分のGoogleアカウントでログイン（Apps Script APIへの編集権限が必要）
3. 必要に応じて`npx clasp pull` — GASエディタ側で行われた変更をローカルに同期

## 3. 開発フロー

- ブランチ運用
- コーディング〜pushまでの流れ

## 4. デプロイ手順

> ここでは実際の公開作業の手順のみを記述する。公開設定に関する設計判断は [ARCHITECTURE.md](./ARCHITECTURE.md) の「GAS特有の設計方針」を参照

- Webアプリとしての公開手順
- バージョン管理

## 5. テスト方針

- テスト対象・範囲
- テスト実行方法

## 6. 運用・保守

> ここでは実際の作業手順のみを記述する。満たすべき水準は [SPEC.md](./SPEC.md) の「非機能要件」、技術的なエラー処理方式は [ARCHITECTURE.md](./ARCHITECTURE.md) の「エラーハンドリング方針」を参照

- バックアップの実施手順
- 障害発生時の対応手順
