# @hathq/delivery-contracts

Describe the first view, trusted assets and readiness information that a display host delivers to a client.

## What you can do

- Validate bounded delivery envelopes.
- Tie the initial display to an exact projection identity.

## Current scope

The producer supplies readiness and source authority. Delivery data cannot introduce arbitrary executable UI.

Package distribution is not activated by this documentation. Use the checked-in source and the declared dependency versions; published availability must be verified separately.

## Getting started

The declared dependencies are exact official npm registry versions: `@hathq/projection-contracts` 0.10.0 and `@zixcel/interaction` 0.10.1. This package supplies ESM declarations through its `types` export. Its own registry publication remains pending; validate source and candidate archives independently before publication.

Use the package manager matching the checked-in lockfile and the Node.js version declared in `package.json` or the development configuration. Run from this repository:

```sh
pnpm install --frozen-lockfile
pnpm test
```

## Documentation and source

[Usage guide](docs/getting-started.md)

[Implementation and public interfaces](src) · [Verification cases](test) · [Contributing](CONTRIBUTING.md) · [Security reporting](SECURITY.md) · [License](LICENSE) · [Attribution notices](NOTICE)

## Release provenance

Starting with 0.10.1, releases use GitHub Actions OIDC trusted publishing from `hathq/delivery-server` (`publish-npm.yml`), without a stored npm publishing token. The workflow verifies reviewed archive hashes and requires npm provenance metadata. Check the published version on npm and verify registry signatures and provenance with `npm audit signatures` in an installed consumer project. Package runtime behavior and API contracts are unchanged by this release.
