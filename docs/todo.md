# Jarvis System — 開発 TODO リスト

> ステータス凡例: `[ ]` 未着手 / `[~]` 進行中 / `[x]` 完了 / `[-]` 不要・スキップ

---

## Phase 0: プロジェクト基盤セットアップ

**この Phase で使うインフラ: PostgreSQL のみ（Redis / Chroma は Phase 2 で追加）**

### 0.1 リポジトリ・環境構築
- [x] Git リポジトリ初期化 (`git init`)
- [x] `.gitignore` 作成（Ruby / Node.js / `.env` 除外）
- [ ] `infra/docker-compose.yml` 作成（**PostgreSQL のみ**）
- [x] `.env.example` 作成（全環境変数を列挙）
- [x] `Procfile.dev` 作成（rails / next の一括起動）
- [x] `README.md` にローカルセットアップ手順を記載

### 0.2 フロントエンド初期化（最新 Node.js + Next.js）
- [x] Node.js バージョン確認・設定（`.node-version` 追加、nodebrew v25.6.1）
- [x] Next.js 最新版プロジェクト作成（Next.js 16.1.6）
- [x] shadcn/ui 初期化（`npx shadcn@latest init`）
- [x] 基本コンポーネントを追加（button / card / badge / dialog / table / tabs / skeleton / sonner / command / navigation-menu / avatar / input / textarea / select / form / sheet / separator / tooltip）
- [x] 環境変数（`NEXT_PUBLIC_API_URL=http://localhost:3001`）設定
- [x] グローバルレイアウト（サイドバー + ヘッダー）を shadcn/ui で作成

### 0.3 Workspace / Project / Task 作成 UI（フロントのみ・モックデータ）
- [x] `zustand` でクライアントステート管理セットアップ（`persist` で localStorage 永続化）
- [x] Workspace 一覧・作成・編集・削除 UI（左サイドパネル、インライン編集）
- [x] Project 一覧・作成・編集 UI（Notion ライク、インライン編集、折りたたみ）
- [x] Task 一覧・作成・編集 UI（チェックボックス + インライン編集 + ホバー削除）
- [x] Workspace / Project / Task を一画面に統合
- [x] 「今週」フラグ付きタスクのフィルタリング（今週ボタン）
- [-] カンバンボード（不要）
- [x] ローディング・エラー状態（`Skeleton` / `Sonner` Toast）

### 0.3a スケジュール UI（フロントのみ・モックデータ）
- [x] `zustand` でスケジュールステート管理セットアップ（`persist` で localStorage 永続化）
- [x] 週間カレンダービュー（7日グリッド、時刻スロット）
- [x] 週ナビゲーション（前後週への移動・今日に戻るボタン）
- [x] イベント作成・編集・削除（`EventDialog`、クリック/ドラッグで作成）
- [x] イベントのドラッグ移動・リサイズ（ピクセル精度）
- [x] タスクパネル（今週フラグ付きタスク一覧、進捗サマリー、プロジェクトグループ表示）
- [x] タスク → カレンダーへのドラッグ＆ドロップでイベント追加
- [x] ローディング・エラー状態（`Skeleton` / `Sonner` Toast）

### 0.4 バックエンド初期化（Rails）
- [x] Rails 最新版 API アプリ作成（`rails new backend --api --database=postgresql`）
- [x] `Gemfile` に最小構成の gem を追加（下記参照）
- [x] `database.yml` のローカル DB 接続設定
- [x] `rails db:create` でデータベース作成確認
- [x] `dotenv-rails` で `.env` 読み込み設定
- [x] CORS 設定（`rack-cors` gem、フロントエンドのポートを許可）
- [x] ヘルスチェックエンドポイント（`GET /up`）確認

**Phase 0.4 の gem（最小構成）:**
```ruby
# Gemfile
gem 'dotenv-rails'
gem 'rack-cors'
```

### 0.5 バックエンド開発 + フロントエンド繋ぎこみ

#### 0.5a モデル・マイグレーション・API 実装

**Workspace**
- [ ] `workspaces` テーブル作成（`name:string`）
- [ ] `Workspace` モデル（バリデーション: name 必須）
- [ ] `Api::V1::WorkspacesController` CRUD（`GET /`, `POST /`, `PATCH /:id`, `DELETE /:id`）

**Project**
- [ ] `projects` テーブル作成（`workspace_id:references`, `name:string`）
- [ ] `Project` モデル（`belongs_to :workspace`、`dependent: :destroy` で Task 連鎖削除）
- [ ] `Api::V1::ProjectsController` CRUD（`GET /?workspace_id=`, `POST /`, `PATCH /:id`, `DELETE /:id`）

**Task**
- [ ] `tasks` テーブル作成（`project_id:references`, `title:string`, `done:boolean`, `this_week:boolean`）
- [ ] `Task` モデル（`belongs_to :project`）
- [ ] `Api::V1::TasksController` CRUD（`GET /?project_id=&this_week=`, `POST /`, `PATCH /:id`, `DELETE /:id`）
  - `PATCH /:id` で `done` / `this_week` / `title` を個別更新
  - `DELETE` プロジェクト削除時の連鎖対応済みであること確認

**ScheduleEvent**
- [ ] `schedule_events` テーブル作成（`title:string`, `date:date`, `start_minutes:integer`, `duration_minutes:integer`, `project_id:references nullable`, `task_id:references nullable`）
- [ ] `ScheduleEvent` モデル（`belongs_to :project, optional: true`・`belongs_to :task, optional: true`）
- [ ] `Api::V1::ScheduleEventsController` CRUD（`GET /?date_from=&date_to=`, `POST /`, `PATCH /:id`, `DELETE /:id`）

#### 0.5b シード・API クライアント

- [ ] API クライアント（`frontend/lib/api.ts`）実装（fetch wrapper + エラーハンドリング + 型定義）
  - `workspaces` / `projects` / `tasks` / `scheduleEvents` 各リソースの CRUD 関数
  - `tasks` 用: `listByThisWeek()` フィルタ対応

#### 0.5c フロントエンド繋ぎこみ

- [ ] `/workspaces` ページを API 接続に切り替え
  - `workspace-store` → API 呼び出しに置き換え（初回ロード + 楽観的更新）
  - `project-store` → API 呼び出しに置き換え
  - `task-store` → API 呼び出しに置き換え（`done` / `this_week` PATCH を含む）
- [ ] `/schedule` ページを API 接続に切り替え
  - `schedule-store` → API 呼び出しに置き換え（週切り替え時に `date_from/to` で再取得）
  - タスクパネルの `thisWeek` タスクを API から取得
  - カレンダーへのドラッグ → `POST /api/v1/schedule_events`（`task_id` 付き）
  - イベントのドラッグ移動・リサイズ → `PATCH /api/v1/schedule_events/:id`

#### 0.5d 動作確認

- [ ] E2E 動作確認（Workspace 作成 → Project 作成 → Task 作成 → 今週フラグ → スケジュール登録）

---

## Phase 1: ダッシュボード + リソース管理 UI

**Phase 0 完了後、全体サマリーと高度な管理機能を追加する。**
**バックエンドは PostgreSQL のみ。Redis / Sidekiq 不要。**

### 1.1 ダッシュボード（サマリービュー）
- [ ] Workspace / Project の統計サマリーカード（`Card` + `Badge`）
- [ ] タスク進捗グラフ（Recharts `BarChart` / `PieChart`）
- [ ] 直近のアクティビティフィード
- [ ] プロジェクト選択コンポーネント（`Command` / `Popover`）

### 1.2 リソース管理 UI
- [ ] リソース一覧・登録 UI（`Table` + `Dialog`）
- [ ] タスク割り当てビュー
- [ ] 稼働率ヒートマップ（Recharts）

---

## Phase 2: Redis / Chroma 導入 + コアエンジン

**この Phase から非同期処理・ベクトル検索が使えるようになる。**

### 2.1 Redis / Sidekiq / Chroma の導入
- [ ] `infra/docker-compose.yml` に Redis・Chroma を追加
- [ ] `Gemfile` に `sidekiq` / `sidekiq-cron` / `faraday` を追加
- [ ] Action Cable の Redis アダプター設定 (`config/cable.yml`)
- [ ] Sidekiq の設定ファイル作成 (`config/sidekiq.yml`)
- [ ] `Procfile.dev` に `sidekiq` プロセスを追加
- [ ] Sidekiq Web UI 有効化 (`/sidekiq`)

### 2.2 ProjectAnalyzerService
- [ ] LLM プロンプト設計（プロジェクト状況の要約・分類）
- [ ] `Analysis::ProjectAnalyzerService` 実装（`ruby-openai` または `faraday` で Anthropic API 呼び出し）
- [ ] `Analysis::ProjectAnalyzerWorker` 実装（Sidekiq 非同期）
- [ ] 分析結果の `Project` モデル更新

### 2.3 TaskExtractorService
- [ ] LLM プロンプト設計（タスク・期日・担当者の抽出）
- [ ] `Analysis::TaskExtractorService` 実装
- [ ] 重複タスクの検出・マージロジック
- [ ] 抽出タスクの `Task.create!` まで

### 2.4 RiskDetectorService
- [ ] リスクシグナルのパターン定義
- [ ] `Analysis::RiskDetectorService` 実装
- [ ] リスク検知時に Action Cable でブロードキャスト（フロントに通知）

### 2.5 EmbeddingService（Chroma）
- [ ] `Analysis::EmbeddingService` 実装（Chroma HTTP API クライアント、`Faraday` ベース）
- [ ] セマンティック検索エンドポイント (`GET /api/v1/search`) 実装

---

## Phase 3: データ収集モジュール（Collector）

### 3.1 共通基盤
- [ ] `RawEvent` マイグレーション・モデル作成
- [ ] `Collectors::BaseCollector` モジュール定義
- [ ] `Collectors::NormalizerService` 実装（`RawEvent.create!` + `EmbeddingService` 呼び出し）
- [ ] Sidekiq-Cron のスケジュール定義ファイル作成 (`config/schedule.rb`)
- [ ] `Gemfile` に収集用 gem を追加（`slack-ruby-client` / `google-api-client`）

### 3.2 Slack Collector
- [ ] Slack App 作成・Bot Token 取得
- [ ] `slack-ruby-client` gem の設定
- [ ] `Collectors::SlackCollectorWorker` 実装（チャンネル一覧 → メッセージ取得）
- [ ] Slack Events API 用 Webhook エンドポイント実装（リアルタイム受信）
- [ ] メッセージのプロジェクト自動判定ロジック

### 3.3 Email Collector
- [ ] Gmail API OAuth2 認証フロー実装
- [ ] `Collectors::EmailCollectorWorker` 実装（メール一覧取得・本文パース）
- [ ] 添付ファイル処理（PDF / Word から本文抽出）
- [ ] メールのプロジェクト自動判定ロジック

### 3.4 Meeting Collector
- [ ] Zoom API / Google Meet API 連携設定
- [ ] `Collectors::MeetingCollectorWorker` 実装（録画ダウンロード）
- [ ] `ruby-openai` gem の Whisper API による音声→テキスト変換
- [ ] 文字起こしのプロジェクト自動判定ロジック

### 3.5 スケジューラー設定
- [ ] Sidekiq-Cron で各 Worker の定期実行登録
- [ ] 収集エラー時のリトライ設定 (`sidekiq_options retry: 3`)
- [ ] 収集ログの構造化出力設定

---

## Phase 4: エージェント実行モジュール（Agent Runner）

**Redis（Phase 2 で導入済み）を使った Sidekiq + Action Cable 構成。**

### 4.1 AgentJobs 基盤
- [ ] `AgentJob` マイグレーション・モデル作成（status enum 定義）
- [ ] `AgentJobs::DispatcherService` 実装（Worker へのキュー投入）
- [ ] 並列スロット管理（`sidekiq.yml` の `concurrency` 設定）
- [ ] ジョブキャンセル処理（DB フラグ方式）

### 4.2 Claude Code Worker
- [ ] `AgentJobs::ClaudeCodeWorker` 実装
- [ ] `Open3.popen3` で `claude` CLI を実行
- [ ] 標準出力を逐次キャプチャし `AgentChannel.broadcast_to` でプッシュ
- [ ] 完了時に `AgentJob` を `completed` ステータスに更新・成果物保存

### 4.3 Codex Worker
- [ ] `AgentJobs::CodexWorker` 実装
- [ ] `ruby-openai` gem でストリーミング呼び出し
- [ ] 出力を逐次キャプチャし `AgentChannel.broadcast_to` でプッシュ
- [ ] 完了時に `AgentJob` を `completed` ステータスに更新・成果物保存

### 4.4 Action Cable チャンネル
- [ ] `AgentChannel` 実装 (`app/channels/agent_channel.rb`)
- [ ] `subscribed` で `stream_for` ジョブ登録
- [ ] `@rails/actioncable` フロントエンドにインストール
- [ ] `hooks/useAgentChannel.ts` Action Cable クライアントフック作成

### 4.5 Agent Console UI
- [ ] `progress` / `scroll-area` shadcn/ui コンポーネントを追加
- [ ] ジョブ一覧ビュー（`DataTable` + `Badge` + `Progress`）
- [ ] ジョブ作成フォーム（`Dialog` + エージェント選択 + プロンプト `Textarea`）
- [ ] リアルタイム出力コンソール（`ScrollArea` + `useAgentChannel` フック）
- [ ] ジョブキャンセルボタン（`DELETE /api/v1/agent_jobs/:id`）
- [ ] 成果物ダウンロードリンク

---

## Phase 5: WBS + リソース管理 UI

### 5.1 WBS / ガントチャート
- [ ] WBS ツリー構造の API エンドポイント実装 (`GET /api/v1/projects/:id/wbs`)
- [ ] `Task` モデルに `parent_id` / `order_index` を追加（マイグレーション）
- [ ] ガントチャートライブラリ組み込み（`react-gantt-chart`）
- [ ] マイルストーン・タスクの表示
- [ ] 依存関係の矢印表示
- [ ] 計画 vs 実績の進捗比較

### 5.2 リソース管理 UI
- [ ] リソース一覧・登録 UI（`Table` + `Dialog`）
- [ ] タスク割り当てビュー
- [ ] 稼働率ヒートマップ（Recharts）
- [ ] AI エージェントのスロット状況表示（`Progress` バー）

---

## Phase 6: 統合・品質向上

### 6.1 テスト
- [ ] RSpec 導入 (`rspec-rails` gem)
- [ ] モデルのバリデーションテスト
- [ ] Service クラスの単体テスト（外部 API はモック）
- [ ] Request Spec（API エンドポイントテスト）
- [ ] フロントエンドコンポーネントテスト（Vitest + Testing Library）

### 6.2 観測性
- [ ] Rails ログのフォーマット設定（`lograge` gem で JSON ログ）
- [ ] Sidekiq の Web UI 動作確認 (`/sidekiq`)
- [ ] エラートラッキング（ローカルなので Rails ログで十分）

### 6.3 セキュリティ
- [ ] `.env.local` の全必須変数チェック（起動時バリデーション）
- [ ] ログのマスキング（`config/initializers/filter_parameter_logging.rb`）

### 6.4 ドキュメント
- [ ] `rails routes` で全エンドポイント一覧確認・README 反映
- [ ] shadcn/ui コンポーネント追加手順の記載

---

## ロードマップ

```
Phase 0  基盤セットアップ
    0.1  リポジトリ・環境構築
    0.2  フロントエンド初期化（最新 Node.js + Next.js）
    0.3  Workspace / Project / Task UI（フロントのみ・モックデータ）  ✅ 完了
    0.3a スケジュール UI（週間カレンダー・タスクパネル）  ✅ 完了
    0.4  バックエンド初期化（Rails）  ✅ 完了
    0.5  バックエンド開発 + フロントエンド繋ぎこみ  ← 今ここ
    ↓
Phase 1  ダッシュボード + リソース管理 UI
    ↓
Phase 2  Redis / Chroma 導入 + コアエンジン（LLM 分析）
    ↓
Phase 3  データ収集（Slack → Email → Meeting の順）
    ↓
Phase 4  エージェント実行（Claude Code / Codex）
    ↓
Phase 5  WBS + リソース管理 UI（高度な機能）
    ↓
Phase 6  テスト・品質向上
```

---

## 見積もり工数（概算）

| Phase | 工数目安 |
|---|---|
| Phase 0.1（リポジトリ・環境構築） | 0.5日 ✅ 大半完了 |
| Phase 0.2（フロントエンド初期化） | 0.5〜1日 |
| Phase 0.3（Workspace/Project/Task UI） | 2〜3日 ✅ 完了 |
| Phase 0.3a（スケジュール UI） | 1〜2日 ✅ 完了（ローディング・エラー状態のみ残） |
| Phase 0.4（バックエンド初期化） | 0.5〜1日 ✅ 完了 |
| Phase 0.5（BE 開発 + 繋ぎこみ） | 2〜3日 |
| Phase 1（ダッシュボード + リソース管理） | 2〜3日 |
| Phase 2（Redis/Chroma + コアエンジン） | 4〜6日 |
| Phase 3（収集） | 5〜7日 |
| Phase 4（エージェント実行） | 4〜6日 |
| Phase 5（WBS + リソース管理 高度機能） | 3〜5日 |
| Phase 6（統合・品質） | 2〜4日 |
| **合計** | **約 26〜40日** |
