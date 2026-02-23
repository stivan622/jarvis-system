class CreateWorkspaces < ActiveRecord::Migration[8.1]
  def change
    create_table :workspaces do |t|
      t.string :name

      t.timestamps
    end
    add_index :workspaces, :name
  end
end
