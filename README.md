# Jarvis System

個人専用のエージェント管理プラットフォーム。**ローカルマシンで完結して動作します。**
Slack・メール・会議録画から情報を自動収集し、プロジェクト状況をダッシュボードで可視化しながら、Claude Code / Codex などの AI エージェントを並列実行・管理します。

## 主な機能

| 機能 | 説明 |
|---|---|
| **情報収集** | Slack / Gmail / 会議録画 (Whisper) から自動収集・プロジェクト紐付け |
| **ダッシュボード** | カンバンボード・WBS ガントチャート・リソースヒートマップ |
| **エージェント管理** | Claude Code / Codex を並列実行し、進捗・出力をリアルタイム表示 |

## 技術スタック

| レイヤー | 技術 |
|---|---|
| **バックエンド** | Ruby on Rails 7.2 (API mode) + Action Cable + Sidekiq |
| **フロントエンド** | Next.js 15 + TypeScript + Tailwind CSS v4 |
| **デザインシステム** | **shadcn/ui** (Radix UI + Tailwind) |
| **データベース** | PostgreSQL + Redis + Chroma (ベクトル DB) |
| **AI** | Claude 3.5 Sonnet / OpenAI Whisper / OpenAI Codex |
| **インフラ** | Docker Compose（DB層のみ）+ foreman（アプリ層） |

## セットアップ（初回）

```bash
# 1. 依存パッケージのインストール
cd backend && bundle install && cd ..
cd frontend && npm install && cd ..

# 2. 環境変数の設定
cp .env.example backend/.env
# backend/.env を編集して DB 接続情報・API キーを記入

# 3. フロントエンド環境変数の設定
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > frontend/.env.local

# 4. データベースの作成 & マイグレーション
cd backend
bundle exec rails db:create
bundle exec rails db:migrate
cd ..
```

## 開発時

```bash
foreman start -f Procfile.dev
```

| サービス | URL |
|---|---|
| Dashboard | http://localhost:4000 |
| Rails API | http://localhost:3001 |
| Sidekiq Web UI | http://localhost:3001/sidekiq |

## 使用時（本番モード）

```bash
# 1. フロントエンド環境変数の設定（初回のみ）
echo "NEXT_PUBLIC_API_URL=http://localhost:3101" > frontend/.env.production.local

# 2. 本番用 DB のマイグレーション（初回・スキーマ変更時）
cd backend
RAILS_ENV=production bundle exec rails db:create db:migrate
cd ..

# 3. フロントエンドビルド（初回・コード変更時）
cd frontend && npm run build && cd ..

# 4. 起動
foreman start
```

| サービス | URL |
|---|---|
| Dashboard | http://localhost:4100 |
| Rails API | http://localhost:3101 |

## マイグレーション

```bash
# マイグレーションファイルの作成
cd backend && bundle exec rails generate migration <MigrationName>

# 開発環境への適用
bundle exec rails db:migrate

# 本番環境への適用
RAILS_ENV=production bundle exec rails db:migrate

# ロールバック
bundle exec rails db:rollback          # 開発環境
RAILS_ENV=production bundle exec rails db:rollback  # 本番環境
```

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [設計書](docs/design.md) | システム全体設計・モジュール説明・技術スタック |
| [アーキテクチャ](docs/architecture.md) | 詳細アーキテクチャ図・DB スキーマ・API 設計 |
| [TODO リスト](docs/todo.md) | フェーズ別の開発タスク一覧・ロードマップ |
