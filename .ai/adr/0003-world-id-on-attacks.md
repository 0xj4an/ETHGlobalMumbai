# ADR-0003: World ID is required to attack, not to play

- Status: proposed
- Date: 2026-11-06
- Context: Two attackers beat one defender. The daily limit only joins
  linked wallets, so one person with many accounts wins alone. World ID
  proves a unique human; it does not stop GPS spoofing.

## Decision

- Require a World ID proof (IDKit, validated in the backend, nullifier
  stored) before a player's attack actions count.
- Capturing free hexes and reinforcing your own stay open.
- Production rollout is out of scope for the hackathon; the demo runs in a
  normal browser with QR or the simulator.

## Alternatives considered

- Gate the whole game: kills onboarding for non-World users.
- Gate neighbourhood titles only: weaker case for the prize.

## Consequences

- Need a success path and a denied/cancelled path in the demo.
- Behaviour inside the MiniPay in-app browser is unknown.

## Reopen if

- World ID does not work in MiniPay, or the credential choice changes.
