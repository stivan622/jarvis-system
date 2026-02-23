class CreateGoogleCalendarAccounts < ActiveRecord::Migration[8.1]
  def change
    create_table :google_calendar_accounts do |t|
      t.string :email, null: false
      t.string :name
      t.string :picture_url
      t.text :access_token
      t.text :refresh_token
      t.datetime :token_expires_at

      t.timestamps
    end

    add_index :google_calendar_accounts, :email, unique: true
  end
end
