class GoogleCalendarCalendar < ApplicationRecord
  belongs_to :google_calendar_account

  validates :calendar_id, presence: true,
    uniqueness: { scope: :google_calendar_account_id }
end
