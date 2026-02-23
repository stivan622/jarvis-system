class AddParentTaskIdToTasks < ActiveRecord::Migration[8.1]
  def change
    add_column :tasks, :parent_task_id, :bigint
    add_index :tasks, :parent_task_id
    add_foreign_key :tasks, :tasks, column: :parent_task_id
  end
end
