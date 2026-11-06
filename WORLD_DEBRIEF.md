# World ID integration debrief

Prize: [Cont] Best Use of IDKit. Integration: World ID is required to
attack another player's block in MiniKlaim (ADR-0003).

## The trust moment

Two attackers beat one defender: a block loses one level per attacker per
day. The daily limit only joins wallets a player linked on purpose, so one
person with ten accounts beats any honest defender. The moment that needs
trust is "this attack comes from a different human than the last one".

## Why this credential

Proof of Human (`proofOfHuman` preset) with the action
`miniklaim-attack-2026`: the nullifier is unique per human for that action,
and we store it against one player. A second account backed by the same human
is rejected (`409 nullifier-taken`). We do not need age, nationality or a
document: uniqueness is the minimum that stops multi-account attacks.
Capturing free blocks and defending your own stay open to everyone.

## Paths in the demo

- Success: verify on `/mumbai`, then an attack lowers the block's level.
- Blocked: without a proof, the attack does nothing and the run screen says
  "attacking needs World ID" with a link to verify.
- Rejected: the same World ID on a second account is refused.
- Cancelled: closing the widget leaves the player unverified.

## Integration notes

- Time to first success: to fill after the live run with the simulator.
- Friction: the signal must be checked on our side (`signal_hash` against
  `hashSignal(address)`) so a proof cannot be replayed for another player;
  the docs mention binding a signal but not checking it in the backend
  example.
- Missing in the docs: how IDKit behaves inside a wallet's in-app browser
  (MiniPay), where MiniKlaim mostly runs.
- One improvement with the most impact: a backend helper that verifies the
  proof and the expected signal in one call.
