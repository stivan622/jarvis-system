class CreateTasks < ActiveRecord::Migration[8.1]
  def change
    create_table :tasks do |t|
      t.references :project, null: false, foreign_key: true
      t.string :title
      t.boolean :done, null: false, default: false
      t.boolean :this_week, null: false, default: false

      t.timestamps
    end
  end
end
