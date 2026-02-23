module Api
  module V1
    class GoogleCalendarController < BaseController
      SCOPES = [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile"
      ].freeze

      # GET /api/v1/google_calendar/auth_url
      def auth_url
        client = build_oauth_client
        url = client.authorization_uri(
          access_type: :offline,
          prompt: :consent,
          include_granted_scopes: true
        ).to_s
        render json: { url: url }
      end

      # GET /api/v1/google_calendar/callback
      def callback
        if params[:error]
          redirect_to "#{frontend_url}/auth/google/callback?google_error=#{params[:error]}", allow_other_host: true
          return
        end

        client = build_oauth_client
        client.code = params[:code]
        client.fetch_access_token!

        userinfo = fetch_userinfo(client.access_token)

        account = GoogleCalendarAccount.find_or_initialize_by(email: userinfo["email"])
        account.assign_attributes(
          name: userinfo["name"],
          picture_url: userinfo["picture"],
          access_token: client.access_token,
          token_expires_at: client.expires_at ? Time.at(client.expires_at.to_i) : nil
        )
        account.refresh_token = client.refresh_token if client.refresh_token.present?
        account.save!

        redirect_to "#{frontend_url}/auth/google/callback?google_connected=true", allow_other_host: true
      rescue => e
        Rails.logger.error "Google OAuth error: #{e.message}"
        redirect_to "#{frontend_url}/auth/google/callback?google_error=auth_failed", allow_other_host: true
      end

      # GET /api/v1/google_calendar/accounts
      def accounts
        render json: GoogleCalendarAccount.all.map { |a| serialize_account(a) }
      end

      # DELETE /api/v1/google_calendar/accounts/:id
      def destroy_account
        GoogleCalendarAccount.find(params[:id]).destroy!
        head :no_content
      end

      # GET /api/v1/google_calendar/accounts/:account_id/calendars
      def calendars
        account = GoogleCalendarAccount.find(params[:account_id])
        service = build_calendar_service(account)
        list = service.list_calendar_lists

        saved = account.google_calendar_calendars.index_by(&:calendar_id)

        items = (list.items || []).map do |cal|
          saved_cal = saved[cal.id]
          {
            id: saved_cal&.id,
            calendar_id: cal.id,
            name: cal.summary,
            color: cal.background_color || "#4285f4",
            enabled: saved_cal ? saved_cal.enabled : false
          }
        end

        render json: items
      rescue Google::Apis::AuthorizationError => e
        render json: { error: "認証エラー: #{e.message}" }, status: :unauthorized
      end

      # PATCH /api/v1/google_calendar/accounts/:account_id/calendars/:calendar_id
      def update_calendar
        account = GoogleCalendarAccount.find(params[:account_id])
        cal = account.google_calendar_calendars.find_or_initialize_by(
          calendar_id: params[:calendar_id]
        )
        cal.assign_attributes(calendar_params)
        cal.save!
        render json: {
          id: cal.id,
          calendar_id: cal.calendar_id,
          name: cal.name,
          color: cal.color,
          enabled: cal.enabled
        }
      end

      # GET /api/v1/google_calendar/events
      def events
        date_from = params[:date_from]
        date_to   = params[:date_to]

        all_events = []

        GoogleCalendarAccount.all.each do |account|
          enabled_calendars = account.google_calendar_calendars.where(enabled: true)
          next if enabled_calendars.empty?

          service = build_calendar_service(account)

          enabled_calendars.each do |cal|
            begin
              tz_offset = Time.now.strftime("%:z")  # e.g. "+09:00"
              result = service.list_events(
                cal.calendar_id,
                time_min: date_from ? "#{date_from}T00:00:00#{tz_offset}" : nil,
                time_max: date_to ? "#{date_to}T23:59:59#{tz_offset}" : nil,
                single_events: true,
                order_by: "startTime",
                max_results: 250
              )
              (result.items || []).each do |ev|
                serialized = serialize_event(ev, account, cal)
                all_events << serialized if serialized
              end
            rescue => e
              Rails.logger.error "Error fetching events for calendar #{cal.calendar_id}: #{e.message}"
            end
          end
        end

        render json: all_events
      end

      private

      def build_oauth_client
        Signet::OAuth2::Client.new(
          client_id: ENV.fetch("GOOGLE_CLIENT_ID"),
          client_secret: ENV.fetch("GOOGLE_CLIENT_SECRET"),
          authorization_uri: "https://accounts.google.com/o/oauth2/auth",
          token_credential_uri: "https://oauth2.googleapis.com/token",
          redirect_uri: "#{ENV.fetch("API_URL", "http://localhost:3001")}/api/v1/google_calendar/callback",
          scope: SCOPES
        )
      end

      def build_calendar_service(account)
        service = Google::Apis::CalendarV3::CalendarService.new
        service.authorization = account.authorized_client
        service
      end

      def fetch_userinfo(access_token)
        uri = URI("https://www.googleapis.com/oauth2/v2/userinfo")
        req = Net::HTTP::Get.new(uri)
        req["Authorization"] = "Bearer #{access_token}"
        res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |h| h.request(req) }
        JSON.parse(res.body)
      end

      def serialize_account(account)
        {
          id: account.id,
          email: account.email,
          name: account.name,
          picture_url: account.picture_url,
          created_at: account.created_at,
          updated_at: account.updated_at
        }
      end

      def serialize_event(ev, account, cal)
        start_obj = ev.start
        end_obj   = ev.end
        return nil unless start_obj && end_obj

        if start_obj.date_time
          # DateTime のオフセット（イベントのタイムゾーン）をそのまま使う
          # to_time するとサーバーの UTC に変換されてしまい日付がズレるため使わない
          start_dt  = start_obj.date_time
          end_dt    = end_obj.date_time
          date_str  = start_dt.strftime("%Y-%m-%d")
          start_min = start_dt.hour * 60 + start_dt.min
          dur_min   = [ ((end_dt - start_dt) * 24 * 60).round, 15 ].max
          all_day   = false
        elsif start_obj.date
          date_str  = start_obj.date
          start_min = 0
          dur_min   = 1440
          all_day   = true
        else
          return nil
        end

        {
          id: "gcal_#{cal.calendar_id}_#{ev.id}",
          google_event_id: ev.id,
          google_calendar_id: cal.calendar_id,
          google_account_id: account.id,
          title: ev.summary || "(タイトルなし)",
          date: date_str,
          start_minutes: start_min,
          duration_minutes: dur_min,
          all_day: all_day,
          color: cal.color || "#4285f4",
          calendar_name: cal.name,
          account_email: account.email,
          meet_link: ev.hangout_link
        }
      end

      def calendar_params
        params.require(:calendar).permit(:name, :color, :enabled)
      end

      def frontend_url
        ENV.fetch("FRONTEND_URL", "http://localhost:3000")
      end
    end
  end
end
