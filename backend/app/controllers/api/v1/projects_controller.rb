module Api
  module V1
    class ProjectsController < BaseController
      def index
        projects = if params[:workspace_id]
          Project.where(workspace_id: params[:workspace_id]).order(:position, :created_at)
        else
          Project.order(:position, :created_at)
        end
        render json: projects
      end

      def reorder
        ids = params.require(:ids)
        ids.each_with_index do |id, index|
          Project.where(id: id).update_all(position: index)
        end
        head :no_content
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
