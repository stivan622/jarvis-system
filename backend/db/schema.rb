# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_02_24_000002) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "google_calendar_accounts", force: :cascade do |t|
    t.text "access_token"
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.string "name"
    t.string "picture_url"
    t.text "refresh_token"
    t.datetime "token_expires_at"
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_google_calendar_accounts_on_email", unique: true
  end

  create_table "google_calendar_calendars", force: :cascade do |t|
    t.string "calendar_id", null: false
    t.string "color"
    t.datetime "created_at", null: false
    t.boolean "enabled", default: true, null: false
    t.bigint "google_calendar_account_id", null: false
    t.string "name"
    t.datetime "updated_at", null: false
    t.index ["google_calendar_account_id", "calendar_id"], name: "index_gcal_calendars_on_account_and_calendar_id", unique: true
    t.index ["google_calendar_account_id"], name: "index_google_calendar_calendars_on_google_calendar_account_id"
  end

  create_table "projects", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name"
    t.integer "position", default: 0, null: false
    t.datetime "updated_at", null: false
    t.bigint "workspace_id", null: false
    t.index ["position"], name: "index_projects_on_position"
    t.index ["workspace_id"], name: "index_projects_on_workspace_id"
  end

  create_table "schedule_events", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.date "date", null: false
    t.integer "duration_minutes", null: false
    t.bigint "project_id"
    t.integer "start_minutes", null: false
    t.bigint "task_id"
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["project_id"], name: "index_schedule_events_on_project_id"
    t.index ["task_id"], name: "index_schedule_events_on_task_id"
  end

  create_table "tasks", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.boolean "done", default: false, null: false
    t.bigint "parent_task_id"
    t.integer "position", default: 0, null: false
    t.bigint "project_id", null: false
    t.boolean "this_week", default: false, null: false
    t.string "title"
    t.datetime "updated_at", null: false
    t.index ["parent_task_id"], name: "index_tasks_on_parent_task_id"
    t.index ["position"], name: "index_tasks_on_position"
    t.index ["project_id"], name: "index_tasks_on_project_id"
  end

  create_table "workspaces", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name"
    t.integer "position", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_workspaces_on_name"
    t.index ["position"], name: "index_workspaces_on_position"
  end

  add_foreign_key "google_calendar_calendars", "google_calendar_accounts"
  add_foreign_key "projects", "workspaces"
  add_foreign_key "schedule_events", "projects"
  add_foreign_key "schedule_events", "tasks"
  add_foreign_key "tasks", "projects"
  add_foreign_key "tasks", "tasks", column: "parent_task_id"
end
