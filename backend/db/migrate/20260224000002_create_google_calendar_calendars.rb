class CreateGoogleCalendarCalendars < ActiveRecord::Migration[8.1]
  def change
    create_table :google_calendar_calendars do |t|
      t.references :google_calendar_account, null: false, foreign_key: true
      t.string :calendar_id, null: false
      t.string :name
      t.string :color
      t.boolean :enabled, default: true, null: false

      t.timestamps
    end

    add_index :google_calendar_calendars, [ :google_calendar_account_id, :calendar_id ], unique: true, name: "index_gcal_calendars_on_account_and_calendar_id"
  end
end
