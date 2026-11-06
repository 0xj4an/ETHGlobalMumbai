# ADR-0001: Arkiv holds active hex defense, not ownership

- Status: accepted
- Date: 2026-11-06
- Context: Arkiv entities have an owner wallet and an expiry. MiniKlaim
  ownership never expires (only a capture takes a hex); levels decay one per
  30 days down to 1.

## Decision

- One Arkiv entity per hex above level 1: owner (player), base level,
  damage, last owner visit (`reinforcedAt`).
- Expiry = time until the level would reach 1 with no owner visit.
- Expired entity means "back to level 1", not "free". Level-1 hexes have no
  entity.
- The exact level is still computed with the existing formula; Arkiv expiry
  only marks the end.
- The relayer owns every entity (only the owner can update, and attacks
  update it). The player address is a queryable attribute.

## Alternatives considered

- One entity per hex with expiry = loss of the hex: changes game rules.
- Player-owned entities: attackers could not update them.
- Mirror all ~345k hexes: needless writes; most are level 1.

## Consequences

- Max expiry is about 182.5 days, so levels 8 to 10 (210 to 270 days) need
  one more extension from the backend.
- Expiry cannot be shortened; harmless because the formula decides.
- Players must trust the backend writer; data is public and checkable.

## Reopen if

- Arkiv adds owner-delegated updates, or the testnet resets/limits writes.
