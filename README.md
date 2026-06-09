# AT-License

Licensing and distribution API.

## Developing

### Secrets

To generate a [secret key](https://guides.rubyonrails.org/security.html) for
the application, run:

```bash
export SECRET_KEY_BASE="$(openssl rand -hex 64)"
```

To generate encryption secrets, run:

```bash
export ENCRYPTION_DETERMINISTIC_KEY="$(openssl rand -base64 32)"
export ENCRYPTION_PRIMARY_KEY="$(openssl rand -base64 32)"
export ENCRYPTION_KEY_DERIVATION_SALT="$(openssl rand -base64 32)"
```

### Setup

```bash
bundle
bundle exec rails at-license:setup
```

### Seeding

```bash
bundle exec rails db:seed:development
```

### Running

```bash
bundle exec rails server
```

```bash
bundle exec sidekiq
```

```bash
bundle exec rails console
```

### Testing

```bash
bundle exec rake test:setup
bundle exec rake test
```

## License

Fair Core License.
