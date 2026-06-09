# frozen_string_literal: true

namespace :at_license do
  desc 'List information about AtLicense and the environment'
  task about: %i[environment] do
    AtLicense::Console.about!
  end
end
