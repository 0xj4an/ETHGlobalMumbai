# Arkiv schema: `miniklaim.hex-defense`

Defined in [`lib/arkiv/schema.ts`](../lib/arkiv/schema.ts). One entity per
MiniKlaim block (H3 resolution 12, about 13 m across) whose defense level is
above 1.

| Column | Type | Indexed | Meaning |
| --- | --- | --- | --- |
| `h3` | str | yes | H3 cell of the block |
| `zone` | str | yes | H3 res-7 parent (about 5 km2): the unit for map reads and ENS titles |
| `player` | addr | yes | Player who owns the block |
| `level` | i32 | yes | Level when written (1-10) |
| `base` | i32 | no | Level right after the owner's last visit |
| `damage` | i32 | no | Attacks since then |
| `reinforcedAt` | u64 | yes | Owner's last visit, unix seconds (the decay clock) |
| `decaySeconds` | i32 | no | Seconds per level of decay (30 days in production, faster in the demo) |
| `game` | str | yes | `prod` or `demo`, so demo data never mixes with real data |
| `city` | str | optional | City of the block, when known |

## Who owns what

- Every entity is owned and created by the game relayer
  `0x8da26Ae1B32a7e4Cd158622D7d70Fe16D6F1dE83`. Attacks change an entity, and
  only its owner can, so a player-owned entity could not be attacked.
- The player is the `player` column. Readers must filter
  `.ownedBy(0x8da26Ae1B32a7e4Cd158622D7d70Fe16D6F1dE83)`: anyone can write an
  entity with this tag.

## When it expires

- At the moment the block would decay back to level 1 with no owner visit:
  `reinforcedAt + (base - damage - 1) * decaySeconds`.
- Expired means "level 1, still owned". Only a capture takes a block, so
  expiry never frees one.
- Level 1 has no entity at all, which keeps most of the map (about 345k
  blocks) off Arkiv.
- Levels 8 to 10 need more than the 182.5-day maximum; the writer extends
  them a week before expiry (`needs_extend`).

## How it changes

| Game event | Arkiv operation |
| --- | --- |
| Owner reinforces (expiry moves later) | patch + extend |
| Attack (expiry moves earlier) | delete + create in one batch, since an expiry cannot be shortened |
| Capture at level 1, or damage down to 1 | delete |
| Block decays to 1 | nothing: the entity expires on its own |

All of a pass goes in one `executeBatch`, so it applies whole or not at all.

## One query you can run

```ts
import { createPublicClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { and, eq, gte } from "@arkiv-network/sdk/query";
import { i32 } from "@arkiv-network/sdk/schema";
import { http } from "viem";
import { HexDefense } from "./lib/arkiv/schema";

const client = createPublicClient({ chain: rabdi({ accessKey: "" }), transport: http() });
const { entities } = await client
  .select({ $key: true, $expiresAt: true, h3: true, player: true, level: true })
  .from(HexDefense)
  .ownedBy("0x8da26Ae1B32a7e4Cd158622D7d70Fe16D6F1dE83")
  .where(and(eq("game", "demo"), gte("level", i32(3))))
  .fetch();
```

Or over HTTP from the demo: `GET /api/arkiv/zone?zone=<res-7 cell>`.
