class ScheduleEvent < ApplicationRecord
  belongs_to :project, optional: true
  belongs_to :task, optional: true

  validates :title, presence: true
  validates :date, presence: true
  validates :start_minutes, presence: true, numericality: { greater_than_or_equal_to: 0, less_than: 1440 }
  validates :duration_minutes, presence: true, numericality: { greater_than_or_equal_to: 15 }
end
