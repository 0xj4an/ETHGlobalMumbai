# Implementation plan: Arkiv, World ID, ENSv2 on MiniKlaim

- Run: 2026-11-06-arkiv-ens-world (spec: 03-specification.md)
- Classification: architectural
- Base: MiniKlaim `main` 8748a2f368ba02441e332c169b8777ce866d2738, branch
  `ethglobal-mumbai` in this repo. Every commit after the base is new work.
- Deadline: Sat 7 Nov 2026 09:00 IST. Plan written Fri 6 Nov 13:45 IST,
  about 19 hours left.
- Order of sacrifice if time runs out: ENS first, then World. Arkiv is the
  core and the largest prize.

## 0. Where it runs

Production (www.miniklaim.fun) is not touched until the end, and only
behind flags that default off.

The demo runs as a second instance on the VPS:

- Container `miniklaim-mumbai` built from branch `ethglobal-mumbai`.
- Its own Postgres database, copied from production once (players, hexes,
  levels), so the demo has real data without writing to production.
- Its own subdomain (proposed `mumbai.miniklaim.fun`), Caddy block next to
  the production one.
- Flags on only there: `ARKIV_SYNC=on`, `WORLD_GATE=on`, `ENS_TITLES=on`,
  `DEMO_TIME_SCALE=<n>` (decay clock speed-up, demo only).
- Same relayer key as production (decided by 0xj4an). Celo settlement
  disabled in the demo instance so it never sends Celo transactions.

Open: confirm subdomain and whether the demo instance may reuse the relayer
for Arkiv and ENS writes (it holds no Celo role in this flow).

## 1. Accounts and secrets (0xj4an, in parallel, start now)

| # | Task | Output | Blocks |
| --- | --- | --- | --- |
| A1 | Pick Continuity Track in the ETHGlobal dashboard (ask an organizer first about switching and finalists) | Track set | Submission |
| A2 | Arkiv Hub: create access key | `ARKIV_ACCESS_KEY` | Phase 1 writes |
| A3 | Arkiv faucet: tGLM to `0x8da26Ae1B32a7e4Cd158622D7d70Fe16D6F1dE83` | Funded writer | Phase 1 writes |
| A4 | World Developer Portal: new app, enable World ID 4.0 | `WORLD_APP_ID`, `WORLD_RP_ID`, `WORLD_RP_SIGNING_KEY` | Phase 2 |
| A5 | Send about 0.002 ETH (mainnet) to `0x8da26Ae1B32a7e4Cd158622D7d70Fe16D6F1dE83` | Gas for ENS records | Phase 3 |
| A6 | DNS record for the demo subdomain | `mumbai.miniklaim.fun` | Demo URL |
| A7 | Put the secrets in the demo instance env on the VPS (never in git, never in chat) | `.env.miniklaim-mumbai` | All |

## 2. Phase 1: Arkiv (target 14:30 to 20:30 IST)

Decision: ADR-0001. Arkiv mirrors active defense; DB stays the source of
truth.

### 2.1 Dependencies

- `npm i @arkiv-network/sdk@1.0.1` (viem is already a dependency).

### 2.2 Schema (`lib/arkiv/schema.ts`)

`defineSchema("miniklaim.hex-defense", { ... })`:

| Column | Type | Indexed | Why |
| --- | --- | --- | --- |
| `h3` | str | yes | Look up one hex |
| `zone` | str | yes | H3 res-7 parent; map and ENS leader queries |
| `player` | addr | yes | "Defended blocks of X" |
| `level` | i32 | yes | Level at write time; filter strong blocks |
| `base` | i32 | no | Owner part of the level |
| `damage` | i32 | no | Attacker part |
| `reinforcedAt` | u64 | yes | Decay clock (unix seconds) |
| `city` | str | optional, yes | Readable filter |
| `game` | str | yes | `prod` or `demo`, so demo data never mixes with real data |

Readers always add `.ownedBy(relayer)`: anyone can write with our tag.

### 2.3 Expiry math (`lib/arkiv/expiry.ts`, pure, tested)

- `afterDamage = max(1, base - damage)`.
- Level reaches 1 at `reinforcedAt + (afterDamage - 1) * DECAY_DAYS`.
- Lifetime = that time minus now, scaled by `DEMO_TIME_SCALE` in the demo.
- Level 1 or lifetime under one block: no entity (delete if present).
- Lifetime over `MAX_LIFETIME` (about 182.5 days, levels 8 to 10): write
  `ExpirationTime.max()` and mark the row `needs_extend`.
- Tests: table from the hex-strength spec, cap at max, demo scale, level 1.

### 2.4 Outbox, same transaction as the game write

- Migration `0019_arkiv_sync.sql`:
  - `arkiv_queue(h3_id text primary key, queued_at timestamptz)`.
  - `arkiv_entities(h3_id text primary key, entity_key text, expires_at_block
    bigint, needs_extend bool, synced_at timestamptz, last_tx text)`.
- `applyStrengthBatch` inserts every touched h3 into `arkiv_queue` inside
  its transaction (`ON CONFLICT DO NOTHING`) when `ARKIV_SYNC=on`. A failed
  Arkiv write can never break or slow a claim.

### 2.5 Writer worker (`scripts/arkiv-sync.ts`, compose loop like the crons)

Every 10 s:

1. Take up to N queued h3 (`FOR UPDATE SKIP LOCKED`), read their current
   state from `hexes`.
2. Plan per hex: create, delete, or replace (delete + create in the same
   batch when the expiry must get shorter, since Arkiv cannot shorten).
   Level goes up with no shorter expiry: patch + extend.
3. One `executeBatch` per pass (atomic). Store keys from
   `createdEntities`, tx hash, expiry block in `arkiv_entities`.
4. On error: keep the rows queued, log, back off. Find the safe batch size
   on the first run (no batch limit in the docs; ask at the booth).
5. Extension pass: rows with `needs_extend` near expiry get `extensions`.

Also `scripts/arkiv-backfill.ts`: queue every hex above level 1 in the
demo zone (about 640 for one active player in production data).

### 2.6 Reader

- `GET /api/arkiv/hexes?zone=<res7>`: queries Arkiv (public client,
  `.ownedBy(relayer)`, paginated, 100 per page), returns the same row shape
  as `/api/hexes?near=` plus `entityKey` and `expiresAt`.
- Run map in the demo instance reads levels from this route
  (`NEXT_PUBLIC_MAP_SOURCE=arkiv`). This is what makes Arkiv a feature users
  see, not a log.
- Hex popup shows "on Arkiv, expires in X" with a link to the explorer
  (`rabdi.explorer.arkiv.network`).

### 2.7 Health

`/api/health` adds `arkiv: { queued, lastSyncAt, lastError }`.

### 2.8 Prize files (`/arkiv/`)

`schema.md`, `friction.md`, `reach.md`, `why-arkiv.md`,
`how-you-use-arkiv.md`; README gets the writer address
`0x8da26Ae1B32a7e4Cd158622D7d70Fe16D6F1dE83` and one query judges can run.
Optional Swarm bonus: skip unless Phase 3 finishes early.

Done when: a reinforce in the demo shows up on Arkiv within 30 s, the map
draws it from Arkiv, an attack shortens it, a capture removes it, and an
expired entity shows the hex at level 1 still owned.

## 3. Phase 2: World ID on attacks (target 20:30 IST to 00:30 IST)

Decision: ADR-0003.

- `npm i @worldcoin/idkit@4 @worldcoin/idkit-core@4`.
- Migration `0020_world_verifications.sql`: `world_verifications(player_key
  text primary key, nullifier text unique, credential text, verified_at
  timestamptz)`.
- `POST /api/world/rp-signature`: `signRequest({ signingKeyHex, action })`
  from `@worldcoin/idkit-core/signing`. Action `miniklaim-attack-2026`.
- `POST /api/world/verify`: check `environment`, forward to
  `https://developer.world.org/api/v4/verify/{rp_id}`, store the nullifier
  against the player key. A nullifier already bound to another player is
  rejected (one human, one army).
- Claim route: with `WORLD_GATE=on`, attack actions of an unverified player
  become `action: "attack-blocked"` (no damage written). Captures of free
  blocks and reinforces stay open.
- Client: "Verify to attack" sheet with `IDKitRequestWidget` and
  `proofOfHuman({ signal: <player address> })`; staging + simulator for the
  demo; shows success, cancel and rejected states.
- Debrief file for the prize: time to first success, friction, missing
  docs, one improvement.

Done when: the demo shows an attack blocked without World ID, the same
attack counting after verification, and a second account with the same
human rejected.

## 4. Phase 3: ENSv2 titles (target 00:30 IST to 04:00 IST)

Decision: ADR-0002 (simulated on mainnet state).

- `scripts/ens-setup.ts`: builds the 5 setup transactions (deploy
  UserRegistry, deploy PermissionedResolver, setSubregistry, register zone
  subnames, grant the relayer `miniklaim.leader` / `miniklaim.score`
  setters). Runs `eth_simulateV1` first, then prints them for 0xj4an to
  sign from `0x8f51DC0791CdDDDCE08052FfF939eb7cf0c17856` (small admin page
  with wagmi, or calldata for his wallet). Sepolia first, then mainnet.
- Zones: H3 res-7 cells with a label each (e.g. the venue area). Config in
  `lib/ens/zones.ts`.
- `lib/ens/leader.ts`: sum of effective levels per player in the zone (DB;
  cross-check against Arkiv).
- Worker step (same loop as Arkiv): if the leader changed and the last
  write is older than a debounce window, `setText(<zone>.miniklaim.eth,
  "miniklaim.leader", <address>)` and `miniklaim.score`. Log the tx hash.
- UI: zone title on the profile and in the hex popup, read with viem
  `getEnsText` through the Universal Resolver.
- Before mainnet: ask the ENS booth whether per-key relayer records count
  as central ENSv2 usage.

Done when: a leader change in the demo updates the record on mainnet, the
app shows it, and the relayer cannot write any other key.

## 5. Phase 4: submission (target 04:00 to 08:30 IST)

- Demo instance live with seeded zone; rehearse the full path once.
- README "before and during": base commit, list of new commits, what each
  prize uses.
- Videos within each sponsor's rules (ETHGlobal demo, plus any length
  limits they set).
- Fill the ETHGlobal project page; pick the three partner prizes (Arkiv
  counts as one).
- Buffer 08:30 to 09:00.

## 6. Verification for every phase

- `npm run lint`, `npx tsc --noEmit`, `npm test` before each push.
- Pure functions (expiry, leader, plans) have unit tests.
- Claim route with flags unset behaves exactly as `main` (existing tests).
- Nothing is committed, pushed or deployed without 0xj4an's go.

## 7. Open decisions (need 0xj4an)

- [ ] Demo instance + subdomain, or a zone inside production.
- [ ] Remote for this branch: push to `0xj4an/MiniKlaim` as a branch, or a
      new public repo for the submission.
- [ ] Demo zone (which area near the venue) and `DEMO_TIME_SCALE`.
- [ ] World credential: Proof of Human (Orb) or Selfie Check.
- [ ] License for the kit files (no LICENSE in Artur's repo).
