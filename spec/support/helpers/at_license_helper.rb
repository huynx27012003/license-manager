# frozen_string_literal: true

module AtLicenseHelper
  module ScenarioMethods
    def within_ee(expiry: 1.year.from_now.iso8601, issued: 1.day.ago.iso8601, entitlements: %i[request_logs event_logs permissions environments multiplayer], &block)
      context 'when in the EE edition' do
        with_env AT_LICENSE_EDITION: 'EE' do
          before do
            allow(AtLicense::EE::LicenseFile).to receive(:current).and_return(
              AtLicense::EE::LicenseFile.new(
                included: entitlements.map {{ type: 'entitlements', attributes: { code: it.to_s.upcase } }},
                data: { type: 'licenses', attributes: { expiry: } },
                meta: { issued:, expiry: },
              ),
            )
          end

          instance_exec(&block)
        end
      end
    end

    def within_ce(&)
      context 'when in the CE edition' do
        with_env AT_LICENSE_EDITION: 'CE' do
          instance_exec(&)
        end
      end
    end
  end

  def self.included(klass)
    klass.extend ScenarioMethods
  end
end
