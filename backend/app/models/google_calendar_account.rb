class GoogleCalendarAccount < ApplicationRecord
  has_many :google_calendar_calendars, dependent: :destroy

  validates :email, presence: true, uniqueness: true

  def authorized_client
    client = Google::Auth::UserRefreshCredentials.new(
      client_id: ENV.fetch("GOOGLE_CLIENT_ID"),
      client_secret: ENV.fetch("GOOGLE_CLIENT_SECRET"),
      scope: "https://www.googleapis.com/auth/calendar.readonly",
      access_token: access_token,
      refresh_token: refresh_token,
      expires_at: token_expires_at
    )
    # Refresh token if expired
    if token_expires_at && token_expires_at < Time.current + 60.seconds
      client.refresh!
      update!(
        access_token: client.access_token,
        token_expires_at: Time.at(client.expires_at)
      )
    end
    client
  end
end
