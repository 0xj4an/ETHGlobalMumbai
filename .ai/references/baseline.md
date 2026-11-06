# Project baseline

Starting point for the Continuity Track. Everything here existed before
ETHGlobal Mumbai.

## Current state

- Repo `0xj4an/MiniKlaim`, `main` at
  `8748a2f368ba02441e332c169b8777ce866d2738`
  (2026-11-05 01:41 Bogota, "fix(run map): a refresh may add the player's
  blocks, never take them away (#267)"). Confirm it is before the event's
  hacking start.
- Live at www.miniklaim.fun. `/api/stats` on 2026-11-05: 344,722 hexes,
  8,441 runs, 10,163 players.
- Hex levels are live (`NEXT_PUBLIC_HEX_STRENGTH=on` since 2026-10-25,
  spec `ideas/specs/2026-10-25-hex-strength.md`). Sample, one wallet on
  2026-11-05: 14,491 hexes, 13,856 at level 1, 633 at level 2, 2 at level 3.

## Game rules for levels (lib/runs/hexStrength.ts)

- Level 1 to 10, never 0.
- Owner pass: +1 (cap 10). Other player pass: -1 (attack).
- Attack on a level-1 hex captures it; the new owner starts at level 1.
- One action per hex per player per day; linked wallets share the limit.
- Decay: -1 level per 30 days without an owner visit, never below 1. Any
  owner visit resets the clock.
- Time never takes a hex away. Only a capture does.
- Levels are DB only. On-chain only records ownership changes.

## Architecture and deployment

- Next.js 16 + React 19 + MapLibre, Postgres + PostGIS + H3 via Drizzle.
- Docker on the VPS behind Caddy; cron loops `miniklaim-retry-unminted`
  and `miniklaim-finalize-orphans` (see MiniKlaim `ops/README.md`).
- Celo mainnet contracts (from MiniKlaim `docs/CONTRACTS.md`):
  - MiniKlaimHexes proxy `0x9945dDEAa9C52c3C4e667B71B698c4e4551F242B`
  - MiniKlaimBadges proxy `0x79c5d6365f447d1F707EA6d4bDE5D6A96f181cf7`
  - MiniKlaimClaimRouter `0x9C3369e1519B03c16C329aCE13dB528eC8Ca8c74`
  - MiniKlaimDrops proxy `0x19cE0B7C48608286A7872147f89F70896D0e67c6`
- Admin / deployer / relayer EOA `0x8da26Ae1B32a7e4Cd158622D7d70Fe16D6F1dE83`
  (single key; holds `DEFAULT_ADMIN_ROLE`, confirmed on Hexes on-chain).

## Dependencies and integrations

- Celo (+ Soneium), MiniPay, Farcaster mini app host, Sentry, PostHog, Resend.
- `miniklaim.eth` is already a v2 name on Ethereum mainnet (registered
  2026-11-04 in ETHRegistry `0xf60aba43e1f7f3dab1186ff03b561401c9df85e2`,
  never in v1), owned by `0x8f51DC0791CdDDDCE08052FfF939eb7cf0c17856`.

## Known risks and debt

- The relayer key is also admin on the Celo contracts. MiniKlaim docs say to
  rotate it after the 2026-10-21 Railway incident and move admin to a
  multisig. Not part of this work.
- `docs/DEPLOYMENT.md` in MiniKlaim still describes Railway.
- Unaudited contracts.

## Next initiative

`.ai/runs/2026-11-06-arkiv-ens-world/`
