# frozen_string_literal: true

require 'rails_helper'
require 'spec_helper'

describe RenameAtLicenseIdHeadersForResponsesMigration do
  Response = Data.define(:headers)

  let(:migration) { RenameAtLicenseIdHeadersForResponsesMigration.new }

  it 'should migrate response headers when present' do
    account_id = SecureRandom.uuid
    bearer_id  = SecureRandom.uuid
    token_id   = SecureRandom.uuid
    response   = Response.new(headers: {
      'AtLicense-Account' => account_id,
      'AtLicense-Bearer' => bearer_id,
      'AtLicense-Token' => token_id,
    })

    migration.migrate_response!(response)

    expect(response.headers).to eq(
      'AtLicense-Account-Id' => account_id,
      'AtLicense-Bearer-Id' => bearer_id,
      'AtLicense-Token-Id' => token_id,
    )
  end

  it 'should not migrate response headers when missing' do
    account_id = SecureRandom.uuid
    bearer_id  = SecureRandom.uuid
    token_id   = SecureRandom.uuid
    response   = Response.new(headers: {
      'AtLicense-Account' => account_id,
      'AtLicense-Version' => '1.0',
    })

    migration.migrate_response!(response)

    expect(response.headers).to eq(
      'AtLicense-Account-Id' => account_id,
      'AtLicense-Version' => '1.0',
    )
  end
end
