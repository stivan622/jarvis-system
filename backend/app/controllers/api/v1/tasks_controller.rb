module Api
  module V1
    class TasksController < BaseController
      def index
        tasks = Task.all
        tasks = tasks.where(project_id: params[:project_id]) if params[:project_id]
        tasks = tasks.where(this_week: true) if params[:this_week] == "true"
        render json: tasks.order(:created_at)
      end

      def show
        render json: find_task
      end

      def create
        task = Task.create!(task_params)
        render json: task, status: :created
      end

      def update
        task = find_task
        task.update!(task_params)
        render json: task
      end

      def destroy
        find_task.destroy!
        head :no_content
      end

      private

      def find_task
        Task.find(params[:id])
      end

      def task_params
        params.require(:task).permit(:project_id, :title, :done, :this_week)
      end
    end
  end
end
