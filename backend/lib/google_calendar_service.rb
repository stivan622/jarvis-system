class GoogleCalendarService
  SCOPE = Google::Apis::CalendarV3::AUTH_CALENDAR_READONLY

  def self.events(date_from:, date_to:)
    new.events(date_from: date_from, date_to: date_to)
  end

  def events(date_from:, date_to:)
    calendar = Google::Apis::CalendarV3::CalendarService.new
    calendar.authorization = authorizer

    time_min = Time.parse("#{date_from}T00:00:00Z").iso8601
    time_max = Time.parse("#{date_to}T23:59:59Z").iso8601

    result = calendar.list_events(
      ENV.fetch("GOOGLE_CALENDAR_ID", "primary"),
      single_events: true,
      order_by: "startTime",
      time_min: time_min,
      time_max: time_max,
      max_results: 250
    )

    (result.items || []).filter_map { |item| convert(item) }
  end

  private

  def authorizer
    credentials = Google::Auth::UserRefreshCredentials.new(
      client_id: ENV.fetch("GMAIL_CLIENT_ID"),
      client_secret: ENV.fetch("GMAIL_CLIENT_SECRET"),
      refresh_token: ENV.fetch("GMAIL_REFRESH_TOKEN"),
      scope: SCOPE
    )
    credentials.fetch_access_token!
    credentials
  end

  def convert(item)
    # 終日イベントは start_minutes が定義できないためスキップ
    return nil unless item.start&.date_time && item.end&.date_time

    start_dt = item.start.date_time
    end_dt   = item.end.date_time

    start_minutes    = start_dt.hour * 60 + start_dt.min
    end_minutes      = end_dt.hour * 60 + end_dt.min
    duration_minutes = [ end_minutes - start_minutes, 15 ].max

    {
      id:               "google_#{item.id}",
      title:            item.summary || "(無題)",
      date:             start_dt.strftime("%Y-%m-%d"),
      start_minutes:    start_minutes,
      duration_minutes: duration_minutes,
      source:           "google",
      created_at:       item.created&.iso8601 || Time.now.iso8601,
      updated_at:       item.updated&.iso8601 || Time.now.iso8601
    }
  end
end
