# Jarvis System — アーキテクチャ詳細

## 1. レイヤードアーキテクチャ全体図

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                                  │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │            Next.js 15 Dashboard (localhost:3000)                     │   │
│   │            デザインシステム: shadcn/ui + Tailwind CSS v4              │   │
│   │                                                                      │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │   │
│   │  │  Kanban      │  │  WBS/Gantt  │  │  Resource   │  │  Agent    │  │   │
│   │  │  Board       │  │  View       │  │  Heatmap    │  │  Console  │  │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                        │ REST API    │ Action Cable (WS)                     │
└────────────────────────┼─────────────┼──────────────────────────────────────┘
                         ▼             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           API / REALTIME LAYER                               │
│                                                                              │
│         Rails 7.2 API + Action Cable Server (localhost:3001)                │
│                                                                              │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Api::V1::       │  │ Api::V1::    │  │ Api::V1::    │  │ Agent        │  │
│  │ ProjectsCtrl   │  │ TasksCtrl    │  │ AgentJobsCtrl│  │ Channel      │  │
│  │ ResourcesCtrl  │  │ WbsCtrl      │  │              │  │ (ActionCable)│  │
│  └────────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────────┬───────────────────┬──────────────────┬───────────────────────────┘
           │                   │                  │
           ▼                   ▼                  ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────────────┐
│  COLLECTOR       │  │  CORE ENGINE     │  │  AGENT RUNNER                    │
│  LAYER           │  │  LAYER           │  │  LAYER                           │
│  (Sidekiq Worker)│  │  (Services)      │  │  (Sidekiq Worker)                │
│                  │  │                  │  │                                  │
│ ┌──────────────┐ │  │ ┌──────────────┐ │  │ ┌──────────┐  ┌──────────────┐  │
│ │SlackCollector│ │  │ │ProjectAnalyz │ │  │ │Dispatcher│  │ClaudeCode    │  │
│ │Worker        │ │  │ │erService     │ │  │ │Service   │  │Worker        │  │
│ └──────────────┘ │  │ └──────────────┘ │  │ └──────────┘  └──────────────┘  │
│ ┌──────────────┐ │  │ ┌──────────────┐ │  │                ┌──────────────┐  │
│ │EmailCollector│ │  │ │TaskExtractor │ │  │                │Codex         │  │
│ │Worker        │ │  │ │Service       │ │  │                │Worker        │  │
│ └──────────────┘ │  │ └──────────────┘ │  │                └──────────────┘  │
│ ┌──────────────┐ │  │ ┌──────────────┐ │  │ ┌──────────────────────────────┐ │
│ │MeetingCollect│ │  │ │RiskDetector  │ │  │ │  AgentChannel                │ │
│ │orWorker      │ │  │ │Service       │ │  │ │  (Action Cable ブロードキャスト)│ │
│ └──────────────┘ │  │ └──────────────┘ │  │ └──────────────────────────────┘ │
│ ┌──────────────┐ │  │ ┌──────────────┐ │  └──────────────────────────────────┘
│ │Sidekiq-Cron  │ │  │ │Embedding     │ │
│ │(定期スケジュー│ │  │ │Service       │ │
│ │ル)           │ │  │ │(Chroma HTTP) │ │
│ └──────────────┘ │  │ └──────────────┘ │
└──────────┬───────┘  └────────┬─────────┘
           │                   │
           ▼                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    DATA LAYER (Docker Compose で起動)                         │
│                                                                              │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────────────┐  │
│  │  PostgreSQL      │  │  Redis            │  │  Chroma                    │  │
│  │  (Port 5432)     │  │  (Port 6379)      │  │  (Port 8000)               │  │
│  │                  │  │                   │  │                            │  │
│  │ ActiveRecord     │  │ - Sidekiq Queue   │  │ - Document Embeddings      │  │
│  │ - projects       │  │ - Action Cable    │  │ - Semantic Search Index    │  │
│  │ - tasks          │  │   Pub/Sub         │  │                            │  │
│  │ - resources      │  │ - Cache Store     │  │                            │  │
│  │ - agent_jobs     │  │                   │  │                            │  │
│  │ - raw_events     │  │                   │  │                            │  │
│  └─────────────────┘  └──────────────────┘  └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. ローカル起動構成

```
Mac ローカルマシン
│
├── docker compose up -d          # データ層のみ
│     ├── postgres  :5432
│     ├── redis     :6379
│     └── chroma    :8000
│
└── foreman start -f Procfile.dev  # アプリ層をネイティブ起動
      ├── rails: bundle exec rails s -p 3001
      ├── next:  npm run dev (frontend/)
      ├── sidekiq: bundle exec sidekiq
      └── css:   (Tailwind watch, オプション)
```

**Procfile.dev:**
```
rails:   bundle exec rails server -p 3001 -e development
next:    cd frontend && npm run dev
sidekiq: bundle exec sidekiq -C config/sidekiq.yml
```

---

## 3. Collector モジュール詳細

```
                  ┌─────────────────────────────────┐
                  │    Sidekiq-Cron (schedule.rb)    │
                  │  定期実行スケジュール定義          │
                  └────────┬──────┬──────┬───────────┘
                           │      │      │
              ┌────────────┘      │      └──────────────┐
              ▼                   ▼                     ▼
   ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────────┐
   │  SlackCollector   │  │  EmailCollector  │  │   MeetingCollector   │
   │  Worker           │  │  Worker          │  │   Worker             │
   │                   │  │                  │  │                      │
   │ - Slack Web API   │  │ - Gmail API      │  │ - Zoom API           │
   │ - slack-ruby-     │  │ - google-api-    │  │ - OpenAI Whisper API │
   │   client gem      │  │   client gem     │  │   (音声→テキスト)     │
   └────────┬──────────┘  └────────┬─────────┘  └──────────┬───────────┘
            │                     │                        │
            └─────────────────────┼────────────────────────┘
                                  ▼
                  ┌─────────────────────────────┐
                  │   NormalizerService          │
                  │                             │
                  │ 1. テキスト正規化             │
                  │ 2. プロジェクト判定 (LLM)     │
                  │ 3. タグ付け                  │
                  │ 4. EmbeddingService 呼び出し │
                  └──────────────┬──────────────┘
                                 │
                  ┌──────────────▼──────────────┐
                  │  RawEvent.create!            │
                  │  (ActiveRecord → PostgreSQL) │
                  └─────────────────────────────┘
```

---

## 4. Agent Runner モジュール詳細

```
  Dashboard UI
      │
      │ POST /api/v1/agent_jobs
      ▼
┌───────────────────────────────────────────────────┐
│          AgentJobs::DispatcherService              │
│                                                   │
│  AgentJob.create!(status: :queued)                │
│  ClaudeCodeWorker.perform_async(job_id)  ─┐       │
│  CodexWorker.perform_async(job_id)       ─┘       │
│                                                   │
│  並列スロット管理 (Sidekiq concurrency 設定)        │
│  sidekiq.yml: concurrency: 4                      │
└───────────────────────────────────────────────────┘
      │
      ├──────────────────────┐
      ▼                      ▼
┌──────────────┐      ┌──────────────┐
│ ClaudeCode   │      │ Codex        │
│ Worker       │      │ Worker       │
│              │      │              │
│ Open3.popen3 │      │ OpenAI API   │
│ claude CLI   │      │ stream: true │
│ 出力を逐次   │      │ 出力を逐次   │
│ キャプチャ   │      │ キャプチャ   │
└──────┬───────┘      └──────┬───────┘
       │                     │
       └──────────┬──────────┘
                  │ ActionCable.server.broadcast
                  ▼
        ┌────────────────────┐
        │   AgentChannel     │
        │  (Action Cable)    │
        │                    │
        │ broadcast_to       │
        │  job, { output: }  │
        └─────────┬──────────┘
                  │ WebSocket push
                  ▼
          Dashboard UI
        (Agent Console ビュー)
        @rails/actioncable
```

---

## 5. shadcn/ui デザインシステム構成

```
frontend/
└── components/
    ├── ui/                    # shadcn/ui (npx shadcn add で自動生成)
    │   ├── button.tsx
    │   ├── card.tsx
    │   ├── dialog.tsx
    │   ├── badge.tsx
    │   ├── table.tsx
    │   ├── progress.tsx
    │   ├── scroll-area.tsx
    │   ├── toast.tsx
    │   ├── tabs.tsx
    │   ├── command.tsx
    │   └── ...
    └── features/              # 機能別コンポーネント (shadcn/ui を組み合わせ)
        ├── kanban/
        │   ├── KanbanBoard.tsx
        │   ├── KanbanColumn.tsx
        │   └── TaskCard.tsx    # Card + Badge + Avatar を使用
        ├── wbs/
        │   ├── GanttChart.tsx
        │   └── WbsTree.tsx
        ├── resources/
        │   └── ResourceHeatmap.tsx
        └── agents/
            ├── JobList.tsx     # Table + Badge + Progress を使用
            ├── JobForm.tsx     # Dialog + Form を使用
            └── AgentConsole.tsx # ScrollArea + Sonner を使用
```

**デザイントークン (CSS 変数 / Tailwind):**
```css
/* globals.css — shadcn/ui のテーマ変数 */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;   /* ブランドカラー */
  --secondary: 210 40% 96%;
  --muted: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  --destructive: 0 84.2% 60.2%;   /* エラー・キャンセル */
  --border: 214.3 31.8% 91.4%;
  --radius: 0.5rem;
}
```

---

## 6. データベーススキーマ（Rails マイグレーション）

```ruby
# db/migrate/YYYYMMDD_create_projects.rb
create_table :projects, id: :uuid do |t|
  t.string  :name,        null: false
  t.text    :description
  t.string  :status,      default: 'active'  # active / archived / completed
  t.timestamps
end

# db/migrate/YYYYMMDD_create_tasks.rb
create_table :tasks, id: :uuid do |t|
  t.references :project,   null: false, foreign_key: true, type: :uuid
  t.string     :title,     null: false
  t.text       :description
  t.string     :status,    default: 'todo'   # todo / in_progress / done / blocked
  t.string     :priority,  default: 'medium' # high / medium / low
  t.string     :assignee
  t.date       :due_date
  t.references :source,    foreign_key: { to_table: :raw_events }, type: :uuid
  t.references :parent,    foreign_key: { to_table: :tasks },      type: :uuid
  t.integer    :order_index
  t.timestamps
end

# db/migrate/YYYYMMDD_create_raw_events.rb
create_table :raw_events, id: :uuid do |t|
  t.string     :source,       null: false  # slack / email / meeting
  t.references :project,      foreign_key: true, type: :uuid
  t.text       :content
  t.jsonb      :metadata,     default: {}
  t.string     :embedding_id
  t.datetime   :collected_at
  t.timestamps
end
add_index :raw_events, :metadata, using: :gin

# db/migrate/YYYYMMDD_create_agent_jobs.rb
create_table :agent_jobs, id: :uuid do |t|
  t.references :project,       foreign_key: true, type: :uuid
  t.references :task,          foreign_key: true, type: :uuid
  t.string     :agent_type,    null: false  # claude_code / codex
  t.text       :prompt
  t.string     :status,        default: 'queued'
  t.jsonb      :output,        default: {}
  t.jsonb      :artifacts,     default: []
  t.text       :error_message
  t.datetime   :started_at
  t.datetime   :completed_at
  t.timestamps
end

# db/migrate/YYYYMMDD_create_resources.rb
create_table :resources, id: :uuid do |t|
  t.string  :name,     null: false
  t.string  :type,     default: 'human'  # human / agent
  t.integer :capacity, default: 100
  t.timestamps
end

create_table :task_assignments, id: false do |t|
  t.references :task,          null: false, foreign_key: true, type: :uuid
  t.references :resource,      null: false, foreign_key: true, type: :uuid
  t.integer    :allocated_pct, default: 100
end
add_index :task_assignments, [:task_id, :resource_id], unique: true
```

---

## 7. API エンドポイント設計（Rails Routes）

```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :projects do
        resources :tasks, only: [:index]
        get :wbs, on: :member
      end
      resources :tasks, only: [:create, :update, :destroy]
      resources :resources
      resources :agent_jobs, only: [:index, :show, :create, :destroy]
      get 'search', to: 'search#index'
    end
  end

  mount ActionCable.server => '/cable'
end
```

| Method | Path | 説明 |
|---|---|---|
| GET | `/api/v1/projects` | プロジェクト一覧 |
| POST | `/api/v1/projects` | プロジェクト作成 |
| GET | `/api/v1/projects/:id/tasks` | タスク一覧（カンバン用） |
| GET | `/api/v1/projects/:id/wbs` | WBS ツリー取得 |
| PATCH | `/api/v1/tasks/:id` | タスク更新（ステータス変更等） |
| GET | `/api/v1/agent_jobs` | ジョブ一覧 |
| POST | `/api/v1/agent_jobs` | ジョブ作成・キュー投入 |
| DELETE | `/api/v1/agent_jobs/:id` | ジョブキャンセル |
| WS | `/cable` → `AgentChannel` | リアルタイム出力ストリーミング |

---

## 8. Docker Compose 構成（データ層のみ）

```yaml
# infra/docker-compose.yml
services:
  postgres:
    image: postgres:16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: jarvis_development
      POSTGRES_USER: jarvis
      POSTGRES_PASSWORD: jarvis
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  chroma:
    image: chromadb/chroma:latest
    ports: ["8000:8000"]
    volumes:
      - chroma_data:/chroma/chroma

volumes:
  postgres_data:
  chroma_data:
```

---

## 9. 今後の拡張ポイント

| 機能 | 説明 |
|---|---|
| Notification | 検知されたリスクを Slack / メールで通知（Action Mailer / slack-notifier gem） |
| MCP Integration | Model Context Protocol でエージェントにシステムコンテキストを注入 |
| Git Integration | GitHub / GitLab の PR・Issue も収集対象に追加（Octokit gem） |
| Voice Input | 音声コマンドでエージェントにジョブを投入 |
| Dark Mode | shadcn/ui の `ThemeProvider` で ダーク/ライトモード切り替え |
