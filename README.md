<a href="https://atenergy.vn?ref=at-license-api">
  <div>
    <img src="https://atenergy.vn/images/logo-pill.png" width="200" alt="AtLicense">
  </div>
</a>
<br>

[![AtLicense CI](https://github.com/ATEnergy/at-license-api/actions/workflows/test.yml/badge.svg)](https://github.com/ATEnergy/at-license-api/actions)
[![Discord Community](https://img.shields.io/badge/discord-community-blue)][discord]

# AtLicense

AtLicense is a fair source software licensing and distribution API, built
for developers, by developers. Use AtLicense to add license key validation,
entitlements, and device activation to your business's desktop apps,
server applications, on-premise software, and other products.

## Software licensing for everyone

AtLicense comes in two editions. AtLicense CE is our Community Edition, and is
free (as in beer) to self-host for personal and commercial use. AtLicense
EE is our Enterprise Edition, and it requires a license key to use.
AtLicense EE comes with dedicated support, as well as enterprise-grade features
like request logs, audit logs, permissions, environments, and more.

We built AtLicense to make software licensing accessible to everyone.

## Managed hosting with AtLicense Cloud

The easiest way to get started with AtLicense is with [our official managed
service in the cloud][at-license-cloud]. We'll handle the hard stuff — high
availability, backups, security, and maintenance — while you focus on
product.

Our managed hosting can save a substantial amount of developer time and
resources. For most businesses, this ends up being the best value
option and the revenue goes to funding the maintenance and further
development of AtLicense. So you’ll be supporting [Fair Source](https://fair.io)
software and getting a great service!

## Self hosting with AtLicense CE

AtLicense is a fair source software licensing and distribution API, and we have a
free (as in beer) [self-hosted solution][self-hosting]. AtLicense Community
Edition (CE) is exactly the same code base as our managed solution, AtLicense
Cloud, but with a less frequent release schedule (think of it as an LTS
release).

Bug fixes and new features are released to AtLicense Cloud several times
per week. Features are battle-tested in AtLicense Cloud, which allows us to fix
any bugs before the general self-hosted release. Every 6 months or so, we
combine all the changes into a new self-hosted release.

AtLicense CE does lack a few features from AtLicense Cloud, most of which are
available in AtLicense EE.

Interested in self-hosting AtLicense? Take a look at our [self-hosting docs][self-hosting].

## Self hosting with AtLicense EE

AtLicense is also enterprise-grade, and battle-tested in AtLicense Cloud with some of
the best brands in the world. The following features are available in
AtLicense Enterprise Edition (EE):

- **Request logs**: keep a historical record of API requests, along with who
  made the request, the request body, response body, status code, IP address,
  and other information.
- **Event logs**: keep an audit trail of every single event that happens on a
  AtLicense account.
- **Environments**: manage separate environments within an AtLicense account, from
  test environments, to a sandbox, to QA, to production.
- **Permissions**: enterprise-grade roles and permissions.
- **Import/export**: migrate from AtLicense Cloud to AtLicense EE (and vice-versa).
- **OCI/Docker**: license and distribute private container images via AtLicense's
  license-gated, OCI-compliant container registry.
- **SSO/SAML**: support for SSO/SAML.

In addition, AtLicense EE customers are entitled to dedicated self-hosting
support. We're here to make sure you're successful.

AtLicense uses AtLicense EE in production to run AtLicense Cloud, which is used to
license AtLicense EE. It's ~~turtles~~ AtLicenses all the way down (we love
dogfooding our own products).

To obtain a license key, please [reach out][sales].

## Sustainability

Our only sources of funding for AtLicense is our premium, managed service for
running AtLicense in the Cloud, and AtLicense EE. But if you're looking for an
alternative way to support the project, we've put together [some
sponsorship options][sponsor].

If you choose to self-host AtLicense CE, you can [become a sponsor][sponsor],
which is a great way to give back to the community and to contribute
to the long-term sustainability of the project.

## Support

AtLicense CE is a community supported project and there are **no guarantees** that
you will receive support from the creators of AtLicense to troubleshoot your
self-hosting issues. AtLicense offers **best-effort** support for AtLicense CE. There
is [a community-supported Discord server][discord] and [a forum][forum] where
you can ask for help with self-hosting.

If you do need support guantantees, consider becoming a [AtLicense Cloud][at-license-cloud]
customer, or [purchasing AtLicense EE][sales].

## Developing

### Secrets

To generate a [secret key](https://guides.rubyonrails.org/security.html) for
the application, run:

```bash
export SECRET_KEY_BASE="$(openssl rand -hex 64)"
```

To generate [at-work encryption](https://guides.rubyonrails.org/active_record_encryption.html) secrets, run:

```bash
export ENCRYPTION_DETERMINISTIC_KEY="$(openssl rand -base64 32)"
export ENCRYPTION_PRIMARY_KEY="$(openssl rand -base64 32)"
export ENCRYPTION_KEY_DERIVATION_SALT="$(openssl rand -base64 32)"
```

### Setup

To install dependencies, run:

```bash
bundle
```

To setup AtLicense, run:

```bash
bundle exec rails at-license:setup
```

### Seeding

To seed the database with sample data, run (optional):

```bash
bundle exec rails db:seed:development
```

### Running

To start the server, run:

```bash
bundle exec rails server
```

To start a worker, run:

```bash
bundle exec sidekiq
```

To start a console, run:

```bash
bundle exec rails console
```

### Testing

To setup the test environment, run:

```bash
bundle exec rake test:setup
```

To run the entire test suite, specs and features, run (takes ~20 mins on a 16-core CPU):

```bash
bundle exec rake test
```

To run Cucumber features, run:

```bash
bundle exec rake test:cucumber
bundle exec rake test:cucumber[features/api/v1/licenses/actions/validations.feature:369]
bundle exec rake test:cucumber[features/api/v1/licenses/actions/validations.feature]
bundle exec rake test:cucumber[features/api/v1/licenses]
```

To run Rspec specs, run:

```bash
bundle exec rake test:rspec
bundle exec rake test:rspec[spec/models/license_spec.rb:199]
bundle exec rake test:rspec[spec/models/license_spec.rb]
bundle exec rake test:rspec[spec/models]
```

## License

AtLicense is licensed under the [Fair Core License](https://fcl.dev). The Fair
Core License, or FCL, provides the best balance between user freedom and
developer sustainability for a project like AtLicense that monetizes via SaaS and
self-hosting. The FCL is a mostly-permissive non-compete [Fair Source](https://fair.io)
license that eventually contributes to Open Source after 2 years.

The 2-year timeframe applies to each software version made available, whether
through pushing a Git commit, tagging a release on GitHub, or publishing an
image to Docker Hub. After 2 years, the code licensed under the FCL becomes
Open Source under the Apache 2.0 license.

To obtain an Open Source version of AtLicense, run the following:

```bash
git clone https://github.com/ATEnergy/at-license-api && cd at-license-api
git checkout `git rev-list -n 1 --before='2 years ago' master`
```

If the `LICENSE.md` file is FCL, and that code is 2 years old, you may use that
version under the Open Source terms of the change license, which is currently
the Apache 2.0 license.

You can...

1. self-host AtLicense EE to license your enterprise applications.
2. embed AtLicense CE in your on-premise applications.
3. run AtLicense CE on a private network.
3. modify AtLicense to add additional functionality.
4. fork AtLicense into a private repo.

If the FCL happens to not work for your company or use-case, please [reach out][sales].

The license is available [here](https://atenergy.vn/license/).

## Contributing

If you discover an issue, or are interested in a new feature, please open an
issue. If you want to contribute code, feel free to open a pull request. If the
PR is substantial, it may be beneficial to open an issue beforehand to discuss.

The CLA is available [here](https://atenergy.vn/cla/).

## Security

We take security at AtLicense very seriously. We try to perform annual pen-tests
on our code base and infrastructure. In addition, we regularly perform both
internal and external code audits.

If you believe you've found a vulnerability, please see our [`SECURITY.md`](https://github.com/ATEnergy/at-license-api/blob/master/SECURITY.md)
file.

## Is it any good?

[Yes.](https://news.ycombinator.com/item?id=3067434)

[at-license-cloud]: https://atenergy.vn
[self-hosting]: https://atenergy.vn/docs/self-hosting/
[sponsor]: https://github.com/sponsors/ezekg
[support]: mailto:support@atenergy.vn
[discord]: https://discord.gg/TRrhSaWSsN
[forum]: https://github.com/ATEnergy/community/discussions
[license]: https://atenergy.vn/license/
[sales]: mailto:sales@atenergy.vn
# license-manager
