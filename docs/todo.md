# Jarvis System — 開発 TODO リスト

> ステータス凡例: `[ ]` 未着手 / `[~]` 進行中 / `[x]` 完了

---

## Phase 0: プロジェクト基盤セットアップ

**この Phase で使うインフラ: PostgreSQL のみ（Redis / Chroma は Phase 2 で追加）**

### 0.1 リポジトリ・環境構築
- [ ] Git リポジトリ初期化 (`git init`)
- [ ] `.gitignore` 作成（Ruby / Node.js / `.env` 除外）
- [ ] `infra/docker-compose.yml` 作成（**PostgreSQL のみ**）
- [ ] `.env.example` 作成（全環境変数を列挙）
- [ ] `Procfile.dev` 作成（rails / next の一括起動）
- [ ] `README.md` にローカルセットアップ手順を記載

### 0.2 バックエンド初期化（Rails）
- [ ] Rails 7.2 API アプリ作成 (`rails new backend --api --database=postgresql`)
- [ ] `Gemfile` に Phase 0 で必要な gem を追加（下記参照）
- [ ] `database.yml` のローカル DB 接続設定
- [ ] `rails db:create` でデータベース作成確認
- [ ] `dotenv-rails` で `.env` 読み込み設定
- [ ] CORS 設定（`rack-cors` gem、localhost:3000 を許可）
- [ ] ヘルスチェックエンドポイント (`GET /up`) 確認

**Phase 0 の gem（最小構成）:**
```ruby
# Gemfile
gem 'dotenv-rails'
gem 'rack-cors'
```

### 0.3 フロントエンド初期化（Next.js + shadcn/ui）
- [ ] Next.js 15 プロジェクト作成 (`npx create-next-app@latest frontend --typescript --tailwind --app`)
- [ ] shadcn/ui 初期化 (`npx shadcn@latest init`)
- [ ] 基本コンポーネントを追加（button / card / badge / dialog / table / tabs / skeleton / sonner / command / navigation-menu）
- [ ] 環境変数 (`NEXT_PUBLIC_API_URL=http://localhost:3001`) 設定
- [ ] グローバルレイアウト（サイドバー + ヘッダー）を shadcn/ui で作成
- [ ] API クライアント (`lib/api.ts`) の基本実装

---

## Phase 1: ダッシュボード UI + タスク管理

**Phase 1 が完了するとローカルで動く UI が手に入る。**
**バックエンドは PostgreSQL のみ。Redis / Sidekiq 不要。**

### 1.1 プロジェクト・タスク API（Rails）
- [ ] `Project` マイグレーション・モデル作成
- [ ] `Task` マイグレーション・モデル作成（status enum 定義）
- [ ] `Resource` マイグレーション・モデル作成
- [ ] `TaskAssignment` マイグレーション・モデル作成
- [ ] `Api::V1::ProjectsController` 実装（CRUD）
- [ ] `Api::V1::TasksController` 実装（CRUD + status 変更）
- [ ] `Api::V1::ResourcesController` 実装（CRUD）
- [ ] シードデータ作成 (`db/seeds.rb`) で動作確認用サンプルを投入

### 1.2 共通 UI
- [ ] グローバルナビゲーション（`NavigationMenu` + `Sheet` でサイドバー）
- [ ] プロジェクト選択コンポーネント（`Command` / `Popover`）
- [ ] ローディング状態（`Skeleton` コンポーネント）
- [ ] エラーバウンダリ + `Sonner` (Toast) 通知

### 1.3 タスク管理（カンバンボード）
- [ ] `@dnd-kit/core` インストール
- [ ] カンバンボードコンポーネント作成
- [ ] カラム（ToDo / In Progress / Done / Blocked）を `Card` で表示
- [ ] タスクカード（`Card` + `Badge` + `Avatar` で優先度・担当者・期日表示）
- [ ] ドラッグ＆ドロップでステータス変更（`PATCH /api/v1/tasks/:id`）
- [ ] タスク詳細モーダル（`Dialog` + ソースイベントへのリンク付き）
- [ ] タスク手動作成フォーム（`Dialog` + `Form` + `Input`）

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
Phase 0  基盤セットアップ（PostgreSQL のみ）
    ↓
Phase 1  ダッシュボード UI + タスク管理  ← まずここを動かす
    ↓
Phase 2  Redis / Chroma 導入 + コアエンジン（LLM 分析）
    ↓
Phase 3  データ収集（Slack → Email → Meeting の順）
    ↓
Phase 4  エージェント実行（Claude Code / Codex）
    ↓
Phase 5  WBS + リソース管理 UI
    ↓
Phase 6  テスト・品質向上
```

---

## 見積もり工数（概算）

| Phase | 工数目安 |
|---|---|
| Phase 0（基盤） | 1〜2日 |
| Phase 1（ダッシュボード + タスク管理） | 4〜6日 |
| Phase 2（Redis/Chroma + コアエンジン） | 4〜6日 |
| Phase 3（収集） | 5〜7日 |
| Phase 4（エージェント実行） | 4〜6日 |
| Phase 5（WBS + リソース管理） | 3〜5日 |
| Phase 6（統合・品質） | 2〜4日 |
| **合計** | **約 23〜36日** |
