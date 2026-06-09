# frozen_string_literal: true

class ApplicationMailer < ActionMailer::Base
  DEFAULT_FROM_EMAIL = ENV.fetch('AT_LICENSE_FROM_EMAIL') { 'noreply@atenergy.vn' }
                          .freeze

  default from: "AtLicense Support <#{DEFAULT_FROM_EMAIL}>"
  default precedence: 'normal'
end
