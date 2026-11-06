# How MiniKlaim uses Arkiv

## Do the filters, owners and expiry fit what the app does?

- **Filters.** `zone` drives the run map (it reads every defended block in
  the zones around the player) and the ENS title of each zone. `player`
  answers "my defended blocks". `level` finds the strongest blocks.
  `reinforcedAt` finds blocks whose owner stopped visiting. `game` keeps the
  demo apart from production.
- **Owner.** The game relayer owns every entity, because an attack must be
  able to change another player's block. Readers filter by that owner, the
  only way to trust what they read.
- **Expiry.** The lifetime is computed from the game's own decay formula
  ([`lib/arkiv/expiry.ts`](../lib/arkiv/expiry.ts), tested). When an attack
  makes a block fall sooner, the entity is replaced, since Arkiv can extend
  an expiry but not shorten it.

## Does each feature change something players see?

| Arkiv feature | What players see |
| --- | --- |
| Query by `zone` | The run map draws each block's level from Arkiv (`ARKIV_MAP=on`), not from our database |
| Expiry | A block's level drops back to 1 when its entity expires |
| Entity key | Each defended block links to its entity on the Arkiv explorer from `/mumbai` |
| `executeBatch` | A run's changes appear together, never half-applied |

## Flow

1. A claim changes a block (`lib/runs/strengthClaim.ts`). In the same
   database transaction the block is queued in `arkiv_queue`, so the mirror
   cannot miss a change and a slow Arkiv never slows a run.
2. `scripts/arkiv-sync.ts` reads the committed state, plans one operation per
   block (`lib/arkiv/plan.ts`) and sends one batch.
3. `/api/hexes?near=` reads the zones around the player from Arkiv
   (`lib/arkiv/read.ts`) and serves those levels; if Arkiv cannot be read it
   falls back to the database so the map never breaks.
