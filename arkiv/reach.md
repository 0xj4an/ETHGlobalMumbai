# Reach

## Who uses MiniKlaim today?

MiniKlaim is live at www.miniklaim.fun as a MiniPay and Farcaster mini app on
Celo. Public stats (`/api/stats`, read on 5 Nov 2026):

- 10,163 players
- 8,441 runs
- 344,722 blocks captured

Hex defense levels have been live since 25 Oct 2026. One active player alone
holds 635 blocks above level 1, the blocks that get an Arkiv entity.

## Will players use the Arkiv part, and will it ship after Mumbai?

- At Mumbai it runs on a demo instance with its own copy of the data
  (`ops/mumbai/`), so production is not touched during the event.
- The code ships behind flags that default off (`ARKIV_SYNC`, `ARKIV_MAP`).
  Turning them on in production writes defended blocks with the `prod` tag,
  and the run map reads them from Arkiv.
- Next after Mumbai: open the zone query to the community map and to the
  public profile, so anyone can check a player's defense on Arkiv.
