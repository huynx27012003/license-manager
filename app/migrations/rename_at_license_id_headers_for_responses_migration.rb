# frozen_string_literal: true

class RenameAtLicenseIdHeadersForResponsesMigration < BaseMigration
  description %(renames AtLicense-X headers to AtLicense-X-Id for all responses)

  response do |res|
    res.headers['AtLicense-Account-Id'] = res.headers.delete('AtLicense-Account') if res.headers.key?('AtLicense-Account')
    res.headers['AtLicense-Bearer-Id']  = res.headers.delete('AtLicense-Bearer')  if res.headers.key?('AtLicense-Bearer')
    res.headers['AtLicense-Token-Id']   = res.headers.delete('AtLicense-Token')   if res.headers.key?('AtLicense-Token')
  end
end
