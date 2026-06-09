# frozen_string_literal: true

module AtLicense
  module EE
    module Router
      class Constraint
        def matches?(request) = AtLicense.ee?
      end

      def ee(&)
        constraints Constraint.new do
          instance_eval(&)
        end
      end
    end
  end
end
