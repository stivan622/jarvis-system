class Task < ApplicationRecord
  belongs_to :project
  has_many :schedule_events, dependent: :nullify

  validates :title, presence: true
end
