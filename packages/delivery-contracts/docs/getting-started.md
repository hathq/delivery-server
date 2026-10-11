# Using @hathq/delivery-contracts

Describe the first view, trusted assets and readiness information that a display host delivers to a client.

## Before you start

The producer supplies readiness and source authority. Delivery data cannot introduce arbitrary executable UI.

## First steps

Make the exact declared dependency artifacts available before installation. Local archives are excluded from Git; registry publication remains pending.

Run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm test
```

## How to assess the result

- Validate bounded delivery envelopes.
- Tie the initial display to an exact projection identity.

A passing source-level check establishes only what that check observes. Keep missing configuration, unavailable services and unverified deployment paths visible.

## Continue reading

[Repository overview](../README.md)
