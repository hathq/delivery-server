# Using @hathq/delivery-server

Serve reviewed view snapshots and trusted release assets from a configured display host.

## Before you start

The current host is owner-local. Public HTTPS, authentication and placement require separate deployment validation.

## First steps

Make the exact declared dependency artifacts available before installation. Local archives are excluded from Git; registry publication remains pending.

Run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm test
```

## How to assess the result

- Deliver an initial view with exact source references.
- Connect declared state updates and cancellation.

A passing source-level check establishes only what that check observes. Keep missing configuration, unavailable services and unverified deployment paths visible.

## Continue reading

[Repository overview](../README.md)
