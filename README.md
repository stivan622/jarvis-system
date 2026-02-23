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

## ローカル起動

```bash
# 1. アプリ層を一括起動（Rails / Next.js ）
foreman start -f Procfile.dev
```

| サービス | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| Rails API | http://localhost:3001 |
| Sidekiq Web UI | http://localhost:3001/sidekiq |

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [設計書](docs/design.md) | システム全体設計・モジュール説明・技術スタック |
| [アーキテクチャ](docs/architecture.md) | 詳細アーキテクチャ図・DB スキーマ・API 設計 |
| [TODO リスト](docs/todo.md) | フェーズ別の開発タスク一覧・ロードマップ |
