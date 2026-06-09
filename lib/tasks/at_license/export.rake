# frozen_string_literal: true

namespace :at_license do
  # Usage: rake at_license:export[secret] > encrypted.export
  #        rake at_license:export > unencrypted.export
  desc 'Export data from a AtLicense account to STDOUT'
  task :export, %i[secret_key] => %i[silence environment] do |_, args|
    ActiveRecord::Base.logger.silence do
      secret_key = args[:secret_key]
      account_id = ENV.fetch('AT_LICENSE_ACCOUNT_ID')
      account    = Account.find(account_id)

      export = AtLicense::Exporter.export(
        account,
        digest: Digest::SHA256.new,
        to: STDOUT,
        secret_key:,
      )

      STDERR.puts "digest: sha-256=#{export.hexdigest}"
    end
  end
end
