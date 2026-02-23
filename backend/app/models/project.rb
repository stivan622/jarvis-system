class Project < ApplicationRecord
  belongs_to :workspace
  has_many :tasks, dependent: :destroy
  has_many :schedule_events, dependent: :nullify

  validates :name, presence: true
end
