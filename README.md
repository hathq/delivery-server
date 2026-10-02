# @hathq/delivery-server

Serve reviewed view snapshots and trusted release assets from a configured display host.

## What you can do

- Deliver an initial view with exact source references.
- Connect declared state updates and cancellation.

## Current scope

The current host is owner-local. Public HTTPS, authentication and placement require separate deployment validation.

Package distribution is not activated by this documentation. Use the checked-in source and the declared dependency versions; published availability must be verified separately.

## Getting started

The manifest currently requires locally supplied package archives: `@hathq/delivery-contracts`, `@crowsi/transport-foundation`, `@crowsi/browser-security`. These archives are excluded from Git. Obtain the exact approved dependency artifacts before installing; a fresh clone alone is not sufficient. Registry distribution remains pending.

Use the package manager matching the checked-in lockfile and the Node.js version declared in `package.json` or the development configuration. Run from this repository:

```sh
pnpm install --frozen-lockfile
pnpm test
```

## Documentation and source

[Usage guide](docs/getting-started.md)

[Implementation and public interfaces](src) · [Verification cases](test) · [Contributing](CONTRIBUTING.md) · [Security reporting](SECURITY.md) · [License](LICENSE) · [Attribution notices](NOTICE)
