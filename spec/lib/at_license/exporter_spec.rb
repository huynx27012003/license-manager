# frozen_string_literal: true

require 'rails_helper'
require 'spec_helper'

require_dependency Rails.root / 'lib' / 'at_license'

describe AtLicense::Exporter do
  let(:account)    { create(:account) }
  let(:account_id) { account.id }

  # run association async destroys inline
  before { Sidekiq::Testing.inline! }
  after  { Sidekiq::Testing.fake! }

  around do |example|
    perform_enqueued_jobs { example.run }
  end

  it 'should not raise for valid io', :ignore_potential_false_positives do
    expect { AtLicense::Exporter.export(account, to: StringIO.new) }
      .to_not raise_error ArgumentError
  end

  it 'should raise for invalid io' do
    expect { AtLicense::Exporter.export(account, to: '') }
      .to raise_error ArgumentError
  end

  it 'should not raise for valid version 1' do
    expect { AtLicense::Exporter.export(account, to: StringIO.new, version: 1) }
      .to_not raise_error
  end

  it 'should raise for invalid version' do
    expect { AtLicense::Exporter.export(account, to: StringIO.new, version: 42) }
      .to raise_error AtLicense::Exporter::UnsupportedVersionError
  end

  it 'should not raise for valid digest' do
    expect { AtLicense::Exporter.export(account, to: StringIO.new, digest: Digest::SHA256.new) }
      .to_not raise_error
  end

  it 'should raise for invalid digest' do
    expect { AtLicense::Exporter.export(account, to: StringIO.new, digest: nil) }
      .to raise_error ArgumentError
  end

  context 'with encryption' do
    let(:secret_key) { SecureRandom.hex }

    before do
      create_list(:user, 5, account:)
      create_list(:license, 5, account:)
      create_list(:machine, 5, account:)
    end

    it 'should export' do
      export = AtLicense::Exporter.export(account, to: StringIO.new, secret_key:)

      expect(export.size).to be > 1.byte
    end

    it 'should be versioned' do
      export  = AtLicense::Exporter.export(account, to: StringIO.new, secret_key:)
      version = export.read(1).unpack1('C')

      expect(version).to eq AtLicense::Exporter::VERSION
    end

    it 'should be importable' do
      export = AtLicense::Exporter.export(account, to: StringIO.new, secret_key:)
      account.destroy!

      expect { AtLicense::Importer.import(from: export, account_id:, secret_key:) }.to_not raise_error
    end

    %w[sha512 sha256 md5].each do |digest|
      digest_class = "Digest::#{digest.upcase}".constantize

      it "should calculate a valid #{digest} digest" do
        export = AtLicense::Exporter.export(account, to: StringIO.new, digest: digest_class.new, secret_key:)

        expect(export.hexdigest).to eq digest_class.hexdigest(export.read)
      end
    end
  end

  context 'without encryption' do
    before do
      create_list(:user, 5, account:)
      create_list(:license, 5, account:)
      create_list(:machine, 5, account:)
    end

    it 'should export' do
      export = AtLicense::Exporter.export(account, to: StringIO.new)

      expect(export.size).to be > 1.byte
    end

    it 'should be versioned' do
      export  = AtLicense::Exporter.export(account, to: StringIO.new)
      version = export.read(1).unpack1('C')

      expect(version).to eq AtLicense::Exporter::VERSION
    end

    it 'should be importable' do
      export = AtLicense::Exporter.export(account, to: StringIO.new)
      account.destroy!

      expect { AtLicense::Importer.import(from: export, account_id:) }.to_not raise_error
    end

    %w[sha512 sha256 md5].each do |digest|
      digest_class = "Digest::#{digest.upcase}".constantize

      it "should calculate a valid #{digest} digest" do
        export = AtLicense::Exporter.export(account, to: StringIO.new, digest: digest_class.new)

        expect(export.hexdigest).to eq digest_class.hexdigest(export.read)
      end
    end
  end

  context 'with stdout' do
    it 'should export' do
      expect { AtLicense::Exporter.export(account, to: $stdout) }.to(
        output.to_stdout,
      )
    end
  end
end
