# Project context

- Product: MiniKlaim, a territory-capture running game. Every H3 hex (res 12,
  about 13 m) a player crosses becomes theirs on a shared map.
- Purpose here: ETHGlobal Mumbai 2026, Continuity Track. Add Arkiv, ENSv2 and
  World ID to the live game. Only new work is judged.
- Main users: MiniKlaim players (MiniPay / Farcaster / any injected wallet),
  and the hackathon judges for the demo.
- Repository and commands:
  - This repo: hackathon artifacts and new code.
  - Game: `0xj4an/MiniKlaim` (default branch `dev`, release `dev -> main`).
  - Deploy: `ops/deploy.sh` inside MiniKlaim on the VPS.
- Environments:
  - Production web, Postgres and cron loops: Docker on the VPS behind Caddy
    (www.miniklaim.fun). Railway services are asleep; `docs/DEPLOYMENT.md` in
    MiniKlaim still says Railway and is out of date.
  - Celo mainnet (42220): game contracts, unchanged by this work.
  - Arkiv testnet "Rabdi" (chain 7794095): defense levels.
  - Ethereum mainnet: `miniklaim.eth` (ENSv2) for neighbourhood titles.
- Data source of truth:
  - Ownership: Postgres `hexes.owner_address`, settled to Celo.
  - Levels: Postgres (`base_strength`, `damage`, `reinforced_at`), computed
    on read by `lib/runs/hexStrength.ts`.
  - Arkiv and ENS are public mirrors written by the backend. They never
    decide game state.
- Non-negotiable constraints:
  - Do not change the live Celo contracts.
  - Do not change game rules in production; the demo uses its own zone.
  - No secrets, keys or player PII in this repo or in `.ai/`.
  - No git commit, push or deploy without 0xj4an's explicit approval.
  - Submission deadline: Sat 7 Nov 2026, 09:00 IST.

## Wallets

| Wallet | Role |
| --- | --- |
| `0x8f51DC0791CdDDDCE08052FfF939eb7cf0c17856` | Owner of `miniklaim.eth`; signs the one-time ENS setup |
| `0x8da26Ae1B32a7e4Cd158622D7d70Fe16D6F1dE83` | Game relayer (key in the `miniklaim` container); writes Arkiv entities and ENS text records |

## Usage rules

Read only the references and artifacts the current stage declares. Do not
assume requirements that are not confirmed. Open items live in the run's
"Open decisions" section until 0xj4an confirms them.
