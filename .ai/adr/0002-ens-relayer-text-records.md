# ADR-0002: ENS neighbourhood titles are text records written by the relayer

- Status: accepted (mainnet setup pending signature by 0xj4an)
- Date: 2026-11-06
- Context: ENSv2 has no forced transfer of a subname; reassigning would
  mean unregister + register and burning the token history. Every change
  costs real ETH.

## Decision

- `miniklaim.eth` stays with `0x8f51DC0791CdDDDCE08052FfF939eb7cf0c17856`.
- A UserRegistry under `miniklaim.eth` holds neighbourhood subnames
  (e.g. `poblado.miniklaim.eth`); they resolve to a new Permissioned
  Resolver.
- The relayer `0x8da26Ae1B32a7e4Cd158622D7d70Fe16D6F1dE83` only gets the
  per-key setter role for `miniklaim.leader` (and similar `miniklaim.*` keys).
- Leader = highest sum of levels in the zone; written only when it changes.

## Evidence (eth_simulateV1 on mainnet state, 2026-11-05, nothing sent)

| Step | Result | Gas |
| --- | --- | --- |
| Deploy UserRegistry via VerifiableFactory | OK | 202,194 |
| Deploy PermissionedResolver | OK | 178,250 |
| setSubregistry on miniklaim.eth | OK | 57,580 |
| Register `poblado` | OK | 156,346 |
| Grant relayer `miniklaim.leader` setter | OK | 87,330 |
| Relayer setText (first / later) | OK | 159,218 / 60,476 |
| Relayer writes `url` | reverted (expected) | - |
| Stranger writes | reverted (expected) | - |
| Read via Universal Resolver | returns new leader | - |

At about 0.72 gwei: setup about 0.0005 ETH, each leader change about
0.00004 ETH.

## Alternatives considered

- Transfer `miniklaim.eth` to the relayer: a server key leak would lose the
  name.
- Reassign subname ownership per leader change: no forced transfer; burns
  history; more gas.

## Consequences

- Title is a record, not a token that moves between players.
- Pointing the subname's ETH address at the leader is not proven
  (`grantSetterRoles` for `setAddr` reverted in simulation). Optional.
- The existing `miniklaim.eth` resolver `0xdFAD00669289628b29aB3dDAc648bf963C893064`
  rejected the calls tried; the new resolver is only for neighbourhoods.

## Reopen if

- ENS judges say per-key relayer records are not central v2 usage.
