module Api
  module V1
    class ScheduleEventsController < BaseController
      def index
        events = ScheduleEvent.all
        events = events.where("date >= ?", params[:date_from]) if params[:date_from]
        events = events.where("date <= ?", params[:date_to]) if params[:date_to]
        render json: events.order(:date, :start_minutes)
      end

      def show
        render json: find_event
      end

      def create
        event = ScheduleEvent.create!(event_params)
        render json: event, status: :created
      end

      def update
        event = find_event
        event.update!(event_params)
        render json: event
      end

      def destroy
        find_event.destroy!
        head :no_content
      end

      private

      def find_event
        ScheduleEvent.find(params[:id])
      end

      def event_params
        params.require(:schedule_event).permit(:title, :date, :start_minutes, :duration_minutes, :project_id, :task_id)
      end
    end
  end
end
