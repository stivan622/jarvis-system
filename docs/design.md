# Jarvis System — システム設計書

## 概要

Jarvis System は、個人専用のエージェント管理プラットフォームです。
Slack・メール・会議録画から情報を自動収集し、プロジェクト状況をダッシュボードで可視化しながら、Claude Code / Codex などの AI エージェントを並列実行・管理できます。

**動作環境: ローカルマシン（macOS）** — クラウドデプロイ不要

---

## 1. システム全体構成

```
┌─────────────────────────────────────────────────────────────────┐
│                        Jarvis System                            │
│                                                                 │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────┐  │
│  │  Collector   │   │   Core Engine    │   │  Agent Runner  │  │
│  │  (収集層)     │──▶│  (処理・分析層)   │◀──│  (実行層)      │  │
│  └──────────────┘   └────────┬─────────┘   └────────────────┘  │
│                              │                                  │
│                    ┌─────────▼──────────┐                       │
│                    │    Dashboard UI    │                       │
│                    │   (可視化・管理層)  │                       │
│                    └────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. モジュール設計

### 2.1 Collector（収集モジュール）

情報源から非同期にデータを収集し、正規化して Core Engine へ渡す。
Rails の **Sidekiq Worker** として実装し、定期実行は **Sidekiq-Cron** で管理する。

| コンポーネント | 説明 |
|---|---|
| `Collectors::SlackCollector` | Slack API (Events API / Web API) でメッセージ・スレッドを取得 |
| `Collectors::EmailCollector` | Gmail API / IMAP でメールを取得・解析 |
| `Collectors::MeetingCollector` | Zoom / Google Meet の録画・文字起こしを取得 (Whisper で音声→テキスト変換) |
| `Collectors::NormalizerService` | 収集データを共通スキーマ (ActiveRecord モデル) へ正規化 |

**収集データの共通スキーマ（`RawEvent` モデル）:**
```ruby
# == Schema
# id           :uuid
# source       :string   # slack | email | meeting
# project_id   :uuid
# content      :text
# metadata     :jsonb
# embedding_id :string   # Chroma のドキュメント ID
# collected_at :datetime
# created_at   :datetime
```

---

### 2.2 Core Engine（処理・分析エンジン）

収集データを分析し、プロジェクト状況・タスク・リスクを抽出する。
LLM 呼び出しは **Sidekiq Worker** で非同期処理する。

| コンポーネント | 説明 |
|---|---|
| `Analysis::ProjectAnalyzerService` | LLM を使ってプロジェクト状況を要約・分類 |
| `Analysis::TaskExtractorService` | メッセージ・メールからタスクとデッドラインを自動抽出 |
| `Analysis::RiskDetectorService` | 遅延・ブロッカーのシグナルを検知 |
| `Analysis::EmbeddingService` | ベクトル生成と Chroma へのインデックス保存 |

---

### 2.3 Dashboard UI（可視化・管理 UI）

**技術スタック:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + **shadcn/ui**

shadcn/ui を採用することでデザインの一貫性を保つ。
Radix UI プリミティブをベースとした headless コンポーネントにより、
アクセシビリティ・キーボード操作・アニメーションが標準で担保される。

**shadcn/ui で使用する主要コンポーネント:**
| コンポーネント | 用途 |
|---|---|
| `Card`, `Badge`, `Avatar` | タスクカード・ステータス表示 |
| `Dialog`, `Sheet` | タスク詳細・フォームモーダル |
| `Command`, `Popover` | プロジェクト検索・フィルタリング |
| `Table`, `DataTable` | リソース一覧・ジョブ一覧 |
| `Progress`, `Skeleton` | 進捗バー・ローディング状態 |
| `Toast` / `Sonner` | 通知・エラー表示 |
| `Tabs`, `NavigationMenu` | ページ内タブ・グローバルナビ |
| `ScrollArea` | エージェントコンソール出力 |

#### 2.3.1 タスク管理ビュー
- カンバンボード形式（ToDo / In Progress / Done / Blocked）
- タスクの優先度・担当者・期日を表示
- タスクのソース（どのメッセージ・メールから抽出されたか）へのリンク
- ドラッグ＆ドロップでステータス変更（`@dnd-kit/core`）

#### 2.3.2 WBS（Work Breakdown Structure）ビュー
- ガントチャート形式でマイルストーン・タスクを表示
- 依存関係の可視化
- 実績 vs 計画の進捗比較
- ライブラリ: `react-gantt-chart` または `@dhtmlx/trial-react-gantt`

#### 2.3.3 リソース管理ビュー
- メンバーごとのタスク割り当て状況
- 稼働率・空き状況のヒートマップ（Recharts）
- AI エージェントのキャパシティ表示（並列実行スロット数）

---

### 2.4 Agent Runner（エージェント実行モジュール）

Claude Code・Codex を並列実行し、進捗とアウトプットを管理する。
Rails の **Sidekiq Worker** としてジョブを実行し、**Action Cable** でリアルタイムにブロードキャストする。

| コンポーネント | 説明 |
|---|---|
| `AgentJobs::DispatcherService` | ジョブキューを管理し、並列スロットへ割り当て |
| `AgentJobs::ClaudeCodeWorker` | Claude Code CLI を `Open3.popen3` で実行・出力ストリーミング |
| `AgentJobs::CodexWorker` | OpenAI Codex API を呼び出し・出力ストリーミング |
| `AgentJobs::OutputParserService` | エージェント出力からコード差分・要約・アクションを抽出 |
| `AgentChannel` | Action Cable チャンネル（リアルタイム進捗ブロードキャスト） |

**エージェントジョブのライフサイクル:**
```
QUEUED → RUNNING → STREAMING_OUTPUT → COMPLETED
                                    → FAILED
                                    → CANCELLED
```

**ジョブスキーマ（`AgentJob` モデル）:**
```ruby
# == Schema
# id              :uuid
# project_id      :uuid
# task_id         :uuid
# agent_type      :string   # claude_code | codex
# prompt          :text
# status          :string   # queued | running | completed | failed | cancelled
# output          :jsonb
# artifacts       :jsonb
# error_message   :text
# started_at      :datetime
# completed_at    :datetime
# created_at      :datetime
```

---

## 3. データフロー

```
[Slack / Email / Meeting]
        │
        ▼
  [Sidekiq Workers]  ──→  NormalizerService
        │
        ▼
  [Core Engine (Services)]
    ├── TaskExtractorService  ──→  ActiveRecord (PostgreSQL)
    ├── ProjectAnalyzerService ──→  EmbeddingService (Chroma)
    └── RiskDetectorService   ──→  Action Cable ブロードキャスト
        │
        ▼
  [Dashboard UI]  ◀──Action Cable──  [Agent Runner]
    ├── Kanban View                      ├── ClaudeCodeWorker
    ├── WBS / Gantt View                 └── CodexWorker
    └── Resource View
```

---

## 4. 技術スタック

### バックエンド
| 用途 | 技術 |
|---|---|
| API サーバー | Ruby on Rails 7.2 (API mode) |
| リアルタイム通信 | Action Cable (WebSocket, Rails 組み込み) |
| バックグラウンドジョブ | Sidekiq |
| ジョブスケジューラー | Sidekiq-Cron |
| データベース | PostgreSQL |
| ベクトル DB | Chroma (HTTP API 経由) |
| 音声→テキスト | OpenAI Whisper API |
| LLM 分析 | Claude 3.5 Sonnet API (Anthropic Ruby gem) |
| HTTP クライアント | Faraday |

### フロントエンド
| 用途 | 技術 |
|---|---|
| フレームワーク | Next.js 15 (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 |
| デザインシステム | **shadcn/ui** (Radix UI + Tailwind) |
| 状態管理 | Zustand |
| リアルタイム通信 | Action Cable JS クライアント (`@rails/actioncable`) |
| チャート | Recharts |
| ガントチャート | react-gantt-chart |
| DnD | @dnd-kit/core |

### ローカルインフラ
| 用途 | 技術 |
|---|---|
| DB・Redis | Docker Compose（データ層のみ） |
| アプリ起動 | `rails s` + `next dev`（ネイティブ実行） |
| シークレット管理 | `dotenv-rails` + `.env.local` |
| プロセス管理 | Procfile + `foreman` (rails / next / sidekiq を一括起動) |

> **ローカル起動コマンド (1発):**
> ```bash
> foreman start -f Procfile.dev
> ```

---

## 5. 外部 API 連携

| サービス | 用途 | 認証方式 |
|---|---|---|
| Slack | メッセージ・チャンネル収集 | OAuth2 / Bot Token |
| Gmail | メール収集 | OAuth2 |
| Zoom / Google Meet | 録画・文字起こし取得 | OAuth2 |
| Anthropic API | Claude Code エージェント実行 | API Key |
| OpenAI API | Codex エージェント実行 / Whisper | API Key |

---

## 6. セキュリティ考慮事項

- API キー・トークンはすべて `.env.local` で管理（Git 管理外）
- 個人専用システムのため認証は最小限（Rails セッション + Basic Auth）
- 外部 API トークンのスコープは必要最小限に絞る
- ログにトークン・個人情報が含まれないようにマスキング

---

## 7. ディレクトリ構成（予定）

```
jarvis-system/
├── docs/
│   ├── design.md          # 本ファイル
│   ├── architecture.md    # アーキテクチャ詳細図
│   └── todo.md            # 開発 TODO リスト
├── backend/               # Rails アプリケーション
│   ├── app/
│   │   ├── channels/      # Action Cable チャンネル
│   │   ├── controllers/   # API コントローラー
│   │   ├── models/        # ActiveRecord モデル
│   │   ├── services/      # ビジネスロジック (Collector / Analysis / AgentJobs)
│   │   └── workers/       # Sidekiq ワーカー
│   ├── config/
│   │   ├── routes.rb
│   │   └── schedule.rb    # Sidekiq-Cron スケジュール定義
│   └── db/
│       └── migrate/       # Rails マイグレーション
├── frontend/              # Next.js アプリケーション
│   ├── app/               # App Router
│   ├── components/
│   │   ├── ui/            # shadcn/ui コンポーネント（自動生成）
│   │   └── features/      # 機能別コンポーネント
│   └── lib/               # API クライアント・ユーティリティ
├── infra/
│   ├── docker-compose.yml # PostgreSQL + Redis + Chroma のみ
│   └── .env.example
├── Procfile.dev           # foreman 定義
└── README.md
```
