module Api
  module V1
    class WorkspacesController < BaseController
      def index
        workspaces = Workspace.order(:created_at)
        render json: workspaces
      end

      def show
        render json: find_workspace
      end

      def create
        workspace = Workspace.create!(workspace_params)
        render json: workspace, status: :created
      end

      def update
        workspace = find_workspace
        workspace.update!(workspace_params)
        render json: workspace
      end

      def destroy
        find_workspace.destroy!
        head :no_content
      end

      private

      def find_workspace
        Workspace.find(params[:id])
      end

      def workspace_params
        params.require(:workspace).permit(:name)
      end
    end
  end
end
