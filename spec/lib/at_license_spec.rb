# frozen_string_literal: true

require 'rails_helper'
require 'spec_helper'

require_dependency Rails.root / 'lib' / 'at_license'

describe AtLicense, type: :ee do
  describe '.console?' do
    within_console do
      it 'should return true in a console env' do
        expect(AtLicense.console?).to be true
      end
    end

    within_worker do
      it 'should return false in a worker env' do
        expect(AtLicense.console?).to be false
      end
    end

    within_server do
      it 'should return false in a server env' do
        expect(AtLicense.console?).to be false
      end
    end

    within_task do
      it 'should return false in a task env' do
        expect(AtLicense.console?).to be false
      end
    end

    it 'should return false in another env' do
      expect(AtLicense.console?).to be false
    end
  end

  describe '.server?' do
    within_console do
      it 'should return false in a console env' do
        expect(AtLicense.server?).to be false
      end
    end

    within_worker do
      it 'should return false in a worker env' do
        expect(AtLicense.server?).to be false
      end
    end

    within_server do
      it 'should return true in a server env' do
        expect(AtLicense.server?).to be true
      end
    end

    within_task do
      it 'should return false in a task env' do
        expect(AtLicense.server?).to be false
      end
    end

    it 'should return false in another env' do
      expect(AtLicense.server?).to be false
    end
  end

  describe '.worker?' do
    within_console do
      it 'should return false in a console env' do
        expect(AtLicense.worker?).to be false
      end
    end

    within_worker do
      it 'should return true in a worker env' do
        expect(AtLicense.worker?).to be true
      end
    end

    within_server do
      it 'should return false in a server env' do
        expect(AtLicense.worker?).to be false
      end
    end

    within_task do
      it 'should return false in a task env' do
        expect(AtLicense.worker?).to be false
      end
    end

    it 'should return false in another env' do
      expect(AtLicense.worker?).to be false
    end
  end

  describe '.task?' do
    within_console do
      it 'should return false in a console env' do
        expect(AtLicense.task?).to be false
      end
    end

    within_worker do
      it 'should return true in a worker env' do
        expect(AtLicense.task?).to be false
      end
    end

    within_server do
      it 'should return false in a server env' do
        expect(AtLicense.task?).to be false
      end
    end

    within_task do
      it 'should return true in a task env' do
        expect(AtLicense.task?).to be true
      end
    end

    it 'should return false in another env' do
      expect(AtLicense.task?).to be false
    end
  end

  describe '.multiplayer?' do
    within_ce do
      with_env AT_LICENSE_MODE: 'multiplayer' do
        it 'should return true in lax multiplayer mode' do
          expect(AtLicense.multiplayer?(strict: false)).to be true
        end
      end

      with_env AT_LICENSE_MODE: 'multiplayer' do
        it 'should return false in multiplayer mode' do
          expect(AtLicense.multiplayer?).to be false
        end
      end

      with_env AT_LICENSE_MODE: 'singleplayer' do
        it 'should return false in singleplayer mode' do
          expect(AtLicense.multiplayer?).to be false
        end
      end

      with_env AT_LICENSE_MODE: nil do
        it 'should return false in nil mode' do
          expect(AtLicense.multiplayer?).to be false
        end
      end
    end

    within_ee do
      with_env AT_LICENSE_MODE: 'multiplayer' do
        it 'should return true in lax multiplayer mode' do
          expect(AtLicense.multiplayer?(strict: false)).to be true
        end
      end

      with_env AT_LICENSE_MODE: 'multiplayer' do
        it 'should return true in multiplayer mode' do
          expect(AtLicense.multiplayer?).to be true
        end
      end

      with_env AT_LICENSE_MODE: 'singleplayer' do
        it 'should return false in singleplayer mode' do
          expect(AtLicense.multiplayer?).to be false
        end
      end

      with_env AT_LICENSE_MODE: nil do
        it 'should return false in nil mode' do
          expect(AtLicense.multiplayer?).to be false
        end
      end
    end
  end

  describe '.singleplayer?' do
    within_ce do
      with_env AT_LICENSE_MODE: 'multiplayer' do
        it 'should return false in lax multiplayer mode' do
          expect(AtLicense.singleplayer?(strict: false)).to be false
        end
      end

      with_env AT_LICENSE_MODE: 'multiplayer' do
        it 'should return true in multiplayer mode' do
          expect(AtLicense.singleplayer?).to be true
        end
      end

      with_env AT_LICENSE_MODE: 'singleplayer' do
        it 'should return true in singleplayer mode' do
          expect(AtLicense.singleplayer?).to be true
        end
      end

      with_env AT_LICENSE_MODE: nil do
        it 'should return true in nil mode' do
          expect(AtLicense.singleplayer?).to be true
        end
      end
    end

    within_ee do
      with_env AT_LICENSE_MODE: 'multiplayer' do
        it 'should return false in lax multiplayer mode' do
          expect(AtLicense.singleplayer?(strict: false)).to be false
        end
      end

      with_env AT_LICENSE_MODE: 'multiplayer' do
        it 'should return false in multiplayer mode' do
          expect(AtLicense.singleplayer?).to be false
        end
      end

      with_env AT_LICENSE_MODE: 'singleplayer' do
        it 'should return true in singleplayer mode' do
          expect(AtLicense.singleplayer?).to be true
        end
      end

      with_env AT_LICENSE_MODE: nil do
        it 'should return true in nil mode' do
          expect(AtLicense.singleplayer?).to be true
        end
      end
    end
  end

  describe '.ce?' do
    within_ce do
      it 'should return true in a CE env' do
        expect(AtLicense.ce?).to be true
      end
    end

    within_ee do
      it 'should return false in an EE env' do
        expect(AtLicense.ce?).to be false
      end
    end

    with_env AT_LICENSE_EDITION: nil do
      it 'should return true with nil edition' do
        expect(AtLicense.ce?).to be true
      end
    end
  end

  describe '.ee?' do
    within_ce do
      it 'should return false in a CE env' do
        expect(AtLicense.ee?).to be false
      end
    end

    within_ee do
      it 'should return true in an EE env' do
        expect(AtLicense.ee?).to be true
      end
    end

    with_env AT_LICENSE_EDITION: nil do
      it 'should return false with nil edition' do
        expect(AtLicense.ee?).to be false
      end
    end
  end

  describe '.cloud?' do
    within_ce do
      with_env AT_LICENSE_MODE: 'singleplayer', AT_LICENSE_HOST: 'api.acme.example' do
        it 'should return false in a CE env' do
          expect(AtLicense.cloud?).to be false
        end
      end

      with_env AT_LICENSE_MODE: 'singleplayer', AT_LICENSE_HOST: 'api.atenergy.vn' do
        it 'should return false in a CE env' do
          expect(AtLicense.cloud?).to be false
        end
      end

      with_env AT_LICENSE_MODE: 'multiplayer', AT_LICENSE_HOST: 'api.acme.example' do
        it 'should return false in a CE env' do
          expect(AtLicense.cloud?).to be false
        end
      end

      with_env AT_LICENSE_MODE: 'multiplayer', AT_LICENSE_HOST: 'api.atenergy.vn' do
        it 'should return false in a CE env' do
          expect(AtLicense.cloud?).to be false
        end
      end
    end

    within_ee do
      with_env AT_LICENSE_MODE: 'singleplayer', AT_LICENSE_HOST: 'api.acme.example' do
        it 'should return false in an EE env' do
          expect(AtLicense.cloud?).to be false
        end
      end

      with_env AT_LICENSE_MODE: 'singleplayer', AT_LICENSE_HOST: 'api.atenergy.vn' do
        it 'should return false in an EE env' do
          expect(AtLicense.cloud?).to be false
        end
      end

      with_env AT_LICENSE_MODE: 'multiplayer', AT_LICENSE_HOST: 'api.acme.example' do
        it 'should return false in an EE env' do
          expect(AtLicense.cloud?).to be false
        end
      end

      with_env AT_LICENSE_MODE: 'multiplayer', AT_LICENSE_HOST: 'api.atenergy.vn' do
        it 'should return true in an EE env' do
          expect(AtLicense.cloud?).to be true
        end
      end
    end

    with_env AT_LICENSE_EDITION: nil do
      with_env AT_LICENSE_MODE: 'singleplayer', AT_LICENSE_HOST: 'api.acme.example' do
        it 'should return false with a nil edition' do
          expect(AtLicense.cloud?).to be false
        end
      end

      with_env AT_LICENSE_MODE: 'singleplayer', AT_LICENSE_HOST: 'api.atenergy.vn' do
        it 'should return false with nil edition' do
          expect(AtLicense.cloud?).to be false
        end
      end

      with_env AT_LICENSE_MODE: 'multiplayer', AT_LICENSE_HOST: 'api.acme.example' do
        it 'should return false with a nil edition' do
          expect(AtLicense.cloud?).to be false
        end
      end

      with_env AT_LICENSE_MODE: 'multiplayer', AT_LICENSE_HOST: 'api.atenergy.vn' do
        it 'should return false with a nil edition' do
          expect(AtLicense.cloud?).to be false
        end
      end
    end
  end

  describe '.ee' do
    within_ce do
      it 'should not call the block in a CE env' do
        expect(AtLicense.ee { 1 }).to be nil
      end
    end

    within_ee do
      it 'should call the block in an EE env' do
        expect(AtLicense.ee { 1 }).to be 1
      end
    end
  end
end
