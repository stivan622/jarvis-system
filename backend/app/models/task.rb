class Task < ApplicationRecord
  belongs_to :project
  belongs_to :parent_task, class_name: "Task", optional: true
  has_many :sub_tasks, class_name: "Task", foreign_key: :parent_task_id, dependent: :destroy
  has_many :schedule_events, dependent: :nullify

  validates :title, presence: true
end
