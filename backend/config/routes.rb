Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      resources :workspaces, only: %i[index show create update destroy]
      resources :projects, only: %i[index show create update destroy]
      resources :tasks, only: %i[index show create update destroy]
      resources :schedule_events, only: %i[index show create update destroy]

      scope :google_calendar do
        get  "auth_url",  to: "google_calendar#auth_url"
        get  "callback",  to: "google_calendar#callback"
        get  "accounts",  to: "google_calendar#accounts"
        delete "accounts/:id", to: "google_calendar#destroy_account", as: :google_calendar_account
        get  "accounts/:account_id/calendars", to: "google_calendar#calendars"
        patch "accounts/:account_id/calendars/:calendar_id", to: "google_calendar#update_calendar",
              constraints: { calendar_id: /[^\/]+/ }
        get  "events",    to: "google_calendar#events"
      end
    end
  end
end
