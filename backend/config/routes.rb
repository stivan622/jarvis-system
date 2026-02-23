Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      resources :workspaces, only: %i[index show create update destroy]
      resources :projects, only: %i[index show create update destroy]
      resources :tasks, only: %i[index show create update destroy]
      resources :schedule_events, only: %i[index show create update destroy]
    end
  end
end
