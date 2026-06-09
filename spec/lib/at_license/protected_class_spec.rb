# frozen_string_literal: true

require 'rails_helper'
require 'spec_helper'

require_dependency Rails.root / 'lib' / 'at_license'

describe AtLicense::EE::ProtectedClass, type: :ee do
  subject do
    Class.new do
      include AtLicense::EE::ProtectedClass

      AtLicense::EE::ProtectedClass::SINGLETON_METHODS.each do |method|
        define_singleton_method method do |*args, **kwargs|
          nil
        end
      end

      AtLicense::EE::ProtectedClass::INSTANCE_METHODS.each do |method|
        define_method method do |*args, **kwargs|
          nil
        end
      end
    end
  end

  AtLicense::EE::ProtectedClass::SINGLETON_METHODS.each do |method|
    it "should allow querying the record with .#{method}" do
      expect { subject.send(method) }.to_not raise_error
    end
  end

  AtLicense::EE::ProtectedClass::INSTANCE_METHODS.each do |method|
    it "should allow querying the record with ##{method}" do
      expect { subject.new.send(method) }.to_not raise_error
    end
  end

  within_console do
    within_ce do
      AtLicense::EE::ProtectedClass::SINGLETON_METHODS.each do |method|
        it "should block querying the record with .#{method}" do
          expect { subject.send(method) }.to raise_error AtLicense::EE::ProtectedMethodError
        end
      end

      AtLicense::EE::ProtectedClass::INSTANCE_METHODS.each do |method|
        it "should block querying the record with ##{method}" do
          expect { subject.new.send(method) }.to raise_error AtLicense::EE::ProtectedMethodError
        end
      end
    end

    within_ee do
      AtLicense::EE::ProtectedClass::SINGLETON_METHODS.each do |method|
        it "should allow querying the record with .#{method}" do
          expect { subject.send(method) }.to_not raise_error
        end
      end

      AtLicense::EE::ProtectedClass::INSTANCE_METHODS.each do |method|
        it "should allow querying the record with ##{method}" do
          expect { subject.new.send(method) }.to_not raise_error
        end
      end
    end

    context 'when record is protected with entitlements' do
      subject do
        Class.new do
          include AtLicense::EE::ProtectedClass[entitlements: %i[test]]

          def self.all = nil
          def reload   = nil
        end
      end

      within_ce do
        it 'should block querying protected record' do
          expect { subject.new.reload }.to raise_error AtLicense::EE::ProtectedMethodError
          expect { subject.all }.to raise_error AtLicense::EE::ProtectedMethodError
        end
      end

      within_ee entitlements: %i[test] do
        it 'should allow querying protected record when entitled' do
          expect { subject.new.reload }.to_not raise_error
          expect { subject.all }.to_not raise_error
        end
      end

      within_ee entitlements: [] do
        it 'should block querying protected record when unentitled' do
          expect { subject.new.reload }.to raise_error AtLicense::EE::ProtectedMethodError
          expect { subject.all }.to raise_error AtLicense::EE::ProtectedMethodError
        end
      end
    end
  end
end
