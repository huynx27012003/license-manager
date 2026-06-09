# frozen_string_literal: true

require_relative 'at_license/console'
require_relative 'at_license/database'
require_relative 'at_license/ee'
require_relative 'at_license/error'
require_relative 'at_license/jsonapi'
require_relative 'at_license/logger'
require_relative 'at_license/middleware'
require_relative 'at_license/version'
require_relative 'at_license/portable_class'
require_relative 'at_license/exporter'
require_relative 'at_license/importer'
require_relative 'at_license/url_for'
require_relative 'at_license/routing'

module AtLicense
  PUBLIC_KEY = %(\xB8\xF3\xEBL\xD2`\x13_g\xA5\tn\x8D\xC1\xC9\xB9\xDC\xB8\x1E\xE9\xFEP\xD1,\xDC\xD9A\xF6`z\x901).freeze
  EDITION    = ENV['AT_LICENSE_EDITION']
  MODE       = ENV['AT_LICENSE_MODE']
  HOST       = ENV['AT_LICENSE_HOST']

  # effective top-level domain + 1 e.g. atenergy.vn
  DOMAIN = ENV.fetch('AT_LICENSE_DOMAIN') {
    domains = HOST.downcase.strip.split('.')[-2..-1]
    next if
      domains.blank?

    domains.join('.')
  }

  # subdomain e.g. api
  SUBDOMAIN = ENV.fetch('AT_LICENSE_SUBDOMAIN') {
    subdomains = HOST.downcase.strip.split('.')[0..-3]
    next if
      subdomains.blank?

    subdomains.join('.')
  }

  class << self
    def revision = Version.revision
    def version  = Version.version

    def database = Database
    def logger   = Logger
    def routing  = Routing

    def console?   = Rails.const_defined?(:Console)
    def server?    = Rails.const_defined?(:Server) || puma?
    def test?      = Rails.env.test?
    def worker?    = sidekiq?
    def task?(...) = rake?(...)

    def multiplayer?(strict: true) = ENV['AT_LICENSE_MODE'] == 'multiplayer' && (!strict || !!ee { it.entitled?(:multiplayer) })
    def singleplayer?(...)         = !multiplayer?(...)

    def ee?    = ENV['AT_LICENSE_EDITION'] == 'EE'
    def ce?    = !ee?

    def cloud?       = ee? && multiplayer? && (ENV['AT_LICENSE_HOST'] in 'api.atenergy.vn' | 'api.at-license.dev')
    def self_hosted? = !cloud?

    def mode    = multiplayer? ? 'multiplayer' : 'singleplayer'
    def edition = ee? ? 'EE' : 'CE'

    def ee(&block)
      return unless
        ee?

      case block.arity
      when 2
        yield EE.license, EE.license_file
      when 1
        yield EE.license
      when 0
        yield
      else
        raise ArgumentError, 'expected block with 0..2 arguments'
      end
    end

    private

    def puma?    = Puma.const_defined?(:Server) && $0.ends_with?('puma')
    def sidekiq? = Sidekiq.const_defined?(:CLI)

    def rake?(*tasks)
      Rake.respond_to?(:application) && Rake.application.top_level_tasks.any? { |task|
        tasks.all? { task.starts_with?(it) }
      }
    end
  end

  class Portal
    extend UrlFor

    HOST   = ENV.fetch('AT_LICENSE_PORTAL_HOST') { "portal.#{DOMAIN}" }
    ORIGIN = "https://#{HOST}"

    def self.url_for(record_or_path = nil, **)
      case record_or_path
      in Account => account
        super(ORIGIN, path: account.slug, **)
      in String | Symbol => path
        super(ORIGIN, path:, **)
      else
        super(ORIGIN, **)
      end
    end
  end

  class Docs
    extend UrlFor

    HOST   = ENV.fetch('AT_LICENSE_DOCS_HOST') { "#{DOMAIN}" }
    ORIGIN = "https://#{HOST}"

    def self.url_for(topic = nil, **) = super("#{ORIGIN}/docs/api/", path: topic.presence, trailing_slash: true, **)
  end
end
