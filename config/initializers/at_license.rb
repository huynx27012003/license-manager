# frozen_string_literal: true

require_dependency Rails.root / 'lib' / 'at_license'

Rails.application.config.to_prepare do
  next if
    AtLicense.test? || AtLicense.task? # Skip in test and during Rake tasks

  case
  when AtLicense.ee?
    unless ENV.key?('AT_LICENSE_LICENSE_FILE_PATH') || ENV.key?('AT_LICENSE_LICENSE_FILE')
      abort "Environment variable AT_LICENSE_LICENSE_FILE_PATH or AT_LICENSE_LICENSE_FILE is required in EE"
    end

    unless ENV.key?('AT_LICENSE_LICENSE_KEY')
      abort "Environment variable AT_LICENSE_LICENSE_KEY is required in EE"
    end
  when AtLicense.ce?
    if AtLicense.multiplayer?(strict: false)
      abort "Multiplayer mode is only available in EE (use AT_LICENSE_MODE=singleplayer instead)"
    end
  end

  case
  when AtLicense.multiplayer?(strict: false)
    unless AtLicense.ee { it.entitled?(:multiplayer) }
      abort "AtLicense EE license is missing the multiplayer entitlement (use AT_LICENSE_MODE=singleplayer instead)"
    end
  when AtLicense.singleplayer?
    account_id = ENV['AT_LICENSE_ACCOUNT_ID']
    unless account_id.present?
      abort 'Environment variable AT_LICENSE_ACCOUNT_ID is required when running in singleplayer mode'
    end

    unless account_id in UUID_RE
      abort 'Environment variable AT_LICENSE_ACCOUNT_ID must be a valid UUID'
    end

    unless Account.exists?(id: account_id)
      abort "Account #{account_id} does not exist (run `rake at-license:setup` to create it)"
    end
  end

  unless ENV.key?('AT_LICENSE_HOST')
    abort "Environment variable AT_LICENSE_HOST is required"
  end
end
