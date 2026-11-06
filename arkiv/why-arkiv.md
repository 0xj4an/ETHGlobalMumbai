# Why Arkiv

## If this data stayed in MiniKlaim's database, what would players lose?

- **Anyone can read the map without asking us.** Today the levels of every
  block live in one Postgres behind one API. On Arkiv any app, bot or
  explorer can query "the strongest blocks in this neighbourhood" or "every
  block this player defends" with no key from us and no API we can change.
- **The decay clock is visible and checkable.** Each entity expires exactly
  when the block falls back to level 1. A player can see, on chain, how long
  their defense lasts, and that we did not change the rules for them.
- **Other games can build on the territory.** The ENS title of each zone is
  computed from these levels; another app could reward the defenders of a
  zone the same way, reading the same entities.

## What we kept off Arkiv, and why

- **Level-1 blocks (about 345k).** They are owned forever and change only on
  capture; ownership is already recorded on Celo. Writing them would cost a
  write per block for no new information.
- **Ownership itself.** Celo stays the record of who owns a block (it has the
  ERC-721 tokens). Arkiv holds the part that changes and expires: defense.
- **Runs, GPS paths, linked wallets, time zones.** Personal data stays in our
  database.
- **The daily action limit.** It is enforced in one database transaction
  with row locks so two runs cannot both capture a block.

## Why expiry fits

MiniKlaim's defense already decays: one level per 30 days without a visit.
Arkiv's expiry is the same idea at the database level, so the entity's
lifetime is the defense itself, not a timer we keep elsewhere.
