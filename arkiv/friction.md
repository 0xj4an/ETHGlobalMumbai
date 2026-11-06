# Arkiv feedback

Written while building the Mumbai integration with `@arkiv-network/sdk`
1.0.1 on Rabdi. Items marked "to confirm" still need the live run.

## What got in the way

- **No documented batch size limit.** `executeBatch` is atomic, which is
  exactly what we want, but the docs do not say how many operations or how
  much gas one batch can hold. We picked 50 per batch and back off on error.
  A documented limit (or an SDK helper that splits a batch) would help.
- **An expiry can only move later.** Our defense drops when a block is
  attacked, so we delete and recreate the entity in the same batch. That
  changes the entity key on every attack, so anything that stored the old
  key (a link, another entity's `key` column) goes stale. An "expire at"
  that may move earlier, for the owner, would avoid that.
- **No event when an entity expires.** The docs say so clearly. We keep our
  own copy of each expiry block (`arkiv_entities`) to know when an entity is
  gone. A query for "expired since block N" would remove that bookkeeping.
- **Batch results do not include the expiry block per entity.** `createEntity`
  returns `expiresAt`; `executeBatch` returns only keys. We estimate the
  expiry from the block we read before sending.
- **Access key needs a browser.** Getting a key from the Hub needs a wallet
  and a captcha, so a server deploy cannot be fully scripted.

## What worked well

- The schema API: typed columns, `.indexed()`, and compile errors on a filter
  over a non-indexed column caught two mistakes before running.
- Clear docs on ownership and on why to filter `ownedBy` for trusted reads.
- Markdown versions of every docs page (`.md`), easy to read from tools.

## To confirm on the live run

- Gas per batch and the largest batch that lands.
- Whether Rabdi data survives until judging.
