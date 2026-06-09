# frozen_string_literal: true

# Be sure to restart your server when you modify this file.

# Avoid CORS issues when API is called from the frontend app.
# Handle Cross-Origin Resource Sharing (CORS) in order to accept cross-origin AJAX requests.

# Read more: https://github.com/cyu/rack-cors

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  max_age = 1.day.to_i
  expose  = %w[
    at-license-accept-signature
    at-license-signature
    at-license-date
    at-license-digest
    at-license-account-id
    at-license-bearer-id
    at-license-token-id
    at-license-account
    at-license-bearer
    at-license-token
    at-license-environment
    at-license-license
    at-license-edition
    at-license-mode
    at-license-revision
    at-license-version
    x-ratelimit-window
    x-ratelimit-count
    x-ratelimit-limit
    x-ratelimit-remaining
    x-ratelimit-reset
    x-request-id
    x-signature
    date
    digest
  ]

  options = {
    headers: :any,
    methods: :any,
    max_age:,
    expose:,
  }

  allow do
    origins AtLicense::Portal::ORIGIN

    resource '*', **options, credentials: true
  end

  allow do
    origins '*'

    resource '*', **options
  end
end
