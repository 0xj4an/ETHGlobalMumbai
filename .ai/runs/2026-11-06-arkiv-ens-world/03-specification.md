# Specification: Arkiv defense levels, ENS titles, World ID attacks

- Classification: architectural (new integrations, new data surfaces).
- Track: ETHGlobal Continuity. Target prizes: Arkiv "Build on Arkiv
  (existing projects)" + Swarm bonus optional, ENS "Best Integration of
  ENSv2 into an Existing Project", World "[Cont] Best Use of IDKit".

## Problem and user

Hex levels already reward defending territory, but they live only in
MiniKlaim's database: no other app can read the map, titles are not
portable, and one person with many accounts can out-attack a real defender.

## Expected result

A demo zone where players capture, reinforce and attack; each defended hex
appears on Arkiv with an expiry; the zone leader shows on
`<zone>.miniklaim.eth`; attacking requires a World ID proof.

## Scope

1. Arkiv writer: on reinforce / attack / capture in the demo zone, upsert or
   delete the hex entity (ADR-0001). Batch per claim request.
2. Arkiv reader: the demo zone map reads levels from Arkiv.
3. ENS: setup script for 0xj4an to sign (Sepolia first, then mainnet), and
   a relayer job that writes `miniklaim.leader` when the leader changes
   (ADR-0002).
4. World: IDKit verification before attack actions count; backend
   validation and nullifier storage (ADR-0003).
5. Demo zone with an accelerated clock, isolated from production rules.
6. Submission files: `/arkiv/` (schema, friction, reach, why-arkiv,
   how-you-use-arkiv), before/after README section, World debrief, video.

## Out of scope

- Changing production game rules or Celo contracts.
- Syncing all production hexes to Arkiv.
- Rotating the relayer key.

## Main flow

1. Player runs in the demo zone; claim route plans new / reinforce /
   attack / capture as today.
2. If attack: require a valid World ID proof for this player, else the
   attack is skipped.
3. After the DB transaction commits, the relayer writes the Arkiv batch.
4. Leader job recomputes the zone sum of levels; if the leader changed,
   relayer sets `miniklaim.leader` on ENS.
5. Map reads levels from Arkiv; profile shows the zone title from ENS.

## Acceptance criteria

| Criterion | How it is verified |
| --- | --- |
| A reinforce in the zone creates/extends an Arkiv entity with the right expiry | Query by attribute on the Arkiv indexer; tx in explorer |
| An expired entity shows the hex at level 1, still owned | Accelerated clock in demo zone |
| A capture at level 1 deletes the entity | Arkiv query returns nothing for that hex |
| Demo map levels come from Arkiv | Code path + network trace in demo |
| Leader change updates `miniklaim.leader` | Universal Resolver read; Etherscan tx |
| Relayer cannot write other ENS keys | Reverted tx or simulation |
| Attack without World ID does nothing; with it, it counts | Demo shows both paths; backend log |
| Production behaviour unchanged outside the zone | Claim route tests; flag off |

## Errors and edge cases

- Arkiv write fails: game state is unaffected; retry from a queue, log it.
- Levels 8 to 10 exceed max expiry: backend extends again.
- Two leader changes in one minute: debounce to avoid paying gas twice.
- World proof reused for another account: rejected by nullifier.

## Non-functional requirements

- Security and privacy: no player PII on Arkiv or ENS, only addresses and
  levels; keys only in the VPS container env.
- Performance and availability: Arkiv and ENS writes off the claim
  request's critical path.
- Accessibility: existing map styles.
- Cost: ENS about 0.0005 ETH setup + about 0.00004 ETH per change; Arkiv
  testnet gas from faucet.

## Observability

- Logs: Arkiv batch result, ENS tx hash, World verification outcome.
- Health: Arkiv and ENS writer last success in `/api/health`.

## Open decisions

- [x] Track: Continuity (decided by 0xj4an 2026-11-06). Still to do: select
      it in the dashboard, after asking organizers about switching and finalists.
- [ ] Confirm the starting commit is before the hacking start.
- [ ] Arkiv: access key, tGLM for the relayer, write limits, testnet resets
      (ask at booth).
- [ ] ENS: does a relayer with per-key records count as central v2 usage?
      (ask at booth). 0xj4an sends about 0.002 ETH to the relayer and signs
      setup.
- [ ] World: register app (app_id, rp_id, signing key); credential choice
      (Proof of Human vs Selfie Check).
- [x] Code lives in this repo: full MiniKlaim history, branch
      `ethglobal-mumbai` cut from `main` 8748a2f. See 05-implementation-plan.md.
- [ ] Demo zone (which neighbourhood) and clock speed.
- [ ] License for this repo and reuse of the kit files.
