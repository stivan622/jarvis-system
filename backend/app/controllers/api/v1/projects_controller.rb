module Api
  module V1
    class ProjectsController < BaseController
      def index
        projects = if params[:workspace_id]
          Project.where(workspace_id: params[:workspace_id]).order(:created_at)
        else
          Project.order(:created_at)
        end
        render json: projects
      end

      def show
        render json: find_project
      end

      def create
        project = Project.create!(project_params)
        render json: project, status: :created
      end

      def update
        project = find_project
        project.update!(project_params)
        render json: project
      end

      def destroy
        find_project.destroy!
        head :no_content
      end

      private

      def find_project
        Project.find(params[:id])
      end

      def project_params
        params.require(:project).permit(:workspace_id, :name)
      end
    end
  end
end
