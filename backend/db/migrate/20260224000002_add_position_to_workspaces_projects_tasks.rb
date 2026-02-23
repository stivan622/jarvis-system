class AddPositionToWorkspacesProjectsTasks < ActiveRecord::Migration[8.1]
  def change
    add_column :workspaces, :position, :integer, default: 0, null: false
    add_column :projects, :position, :integer, default: 0, null: false
    add_column :tasks, :position, :integer, default: 0, null: false

    add_index :workspaces, :position
    add_index :projects, :position
    add_index :tasks, :position
  end
end
