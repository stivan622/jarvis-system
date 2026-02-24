module Api
  module V1
    class WorkspacesController < BaseController
      def index
        workspaces = Workspace.order(:position, :created_at)
        render json: workspaces
      end

      def reorder
        ids = params.require(:ids)
        ids.each_with_index do |id, index|
          Workspace.where(id: id).update_all(position: index)
        end
        head :no_content
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
