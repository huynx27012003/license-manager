# frozen_string_literal: true

namespace :at_license do
  # Usage: rake at_license:import[secret] < encrypted.export
  #        rake at_license:import < unencrypted.export
  desc 'Import data into a AtLicense account from STDIN'
  task :import, %i[secret_key] => %i[silence environment] do |_, args|
    secret_key = args[:secret_key]
    account_id = ENV.fetch('AT_LICENSE_ACCOUNT_ID')

    AtLicense::Importer.import(
      from: STDIN,
      account_id:,
      secret_key:,
    )
  end
end
