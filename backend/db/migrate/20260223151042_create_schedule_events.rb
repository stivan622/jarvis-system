class CreateScheduleEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :schedule_events do |t|
      t.string :title, null: false
      t.date :date, null: false
      t.integer :start_minutes, null: false
      t.integer :duration_minutes, null: false
      t.references :project, null: true, foreign_key: true
      t.references :task, null: true, foreign_key: true

      t.timestamps
    end
  end
end
