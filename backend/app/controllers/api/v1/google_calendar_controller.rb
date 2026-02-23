module Api
  module V1
    class GoogleCalendarController < BaseController
      def index
        date_from = params[:date_from] || Date.today.to_s
        date_to   = params[:date_to]   || Date.today.to_s

        events = GoogleCalendarService.events(date_from: date_from, date_to: date_to)
        render json: events
      rescue Google::Apis::AuthorizationError => e
        render json: { error: "Google Calendar authorization failed: #{e.message}" }, status: :unauthorized
      rescue Google::Apis::Error => e
        render json: { error: "Google Calendar API error: #{e.message}" }, status: :bad_gateway
      rescue KeyError => e
        render json: { error: "Google Calendar not configured: #{e.message}" }, status: :service_unavailable
      end
    end
  end
end
