# @hathq/delivery-server

Provide Hatter product policy and UI over the generic Zixcel delivery host.

## What you can do

- Deliver an initial view with exact source references.
- Connect declared state updates and cancellation.

## Current scope

The current host is owner-local. Public HTTPS, authentication and placement require separate deployment validation.

Package distribution is not activated by this documentation. Use the checked-in source and the declared dependency versions; published availability must be verified separately.

## Getting started

This migration branch uses registry version declarations for the new Zixcel host/contracts and projection packages. Their initial npm publication is pending. CI tests all reviewed archives together; the branch must not replace a released consumer dependency graph before official publication.

Use the package manager matching the checked-in lockfile and the Node.js version declared in `package.json` or the development configuration. Run from this repository:

```sh
pnpm install --frozen-lockfile
pnpm test
```

## Documentation and source

[Usage guide](docs/getting-started.md)

[Implementation and public interfaces](src) · [Verification cases](test) · [Contributing](CONTRIBUTING.md) · [Security reporting](SECURITY.md) · [License](LICENSE) · [Attribution notices](NOTICE)
