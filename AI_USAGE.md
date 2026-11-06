# Use of AI tools

ETHGlobal asks every project to say where and how AI was used.

- **Tool:** Claude (Anthropic), working as a coding agent under 0xj4an's
  direction during ETHGlobal Mumbai.
- **Method:** spec-driven, with Artur Vargas' AI Engineering Kit. Every
  planning artifact is in this repo: `.ai/CONTEXT.md`,
  `.ai/references/baseline.md`, `.ai/adr/`, and the run in
  `.ai/runs/2026-11-06-arkiv-ens-world/` (specification and implementation
  plan). `standards/` and `templates/` are the kit, unchanged.
- **What 0xj4an decided:** the project (MiniKlaim on the Continuity Track),
  the three integrations, the rules (defense not ownership on Arkiv, relayer
  writes ENS records, World ID on attacks), the infra (same relayer, VPS),
  and every on-chain action, which he signs himself.
- **What the AI wrote (0xj4an reviews it before submission):** the new code for this event:
  `lib/arkiv/`, `lib/ens/`, `lib/world/`, `app/api/arkiv/`, `app/api/world/`,
  `app/api/mumbai/`, `app/mumbai/`, `scripts/arkiv-*.ts`,
  `scripts/ens-setup.ts`, the changes to `lib/runs/strengthClaim.ts`,
  `lib/runs/hexStrength.ts`, `app/api/hexes/route.ts`,
  `app/api/health/route.ts`, `app/api/runs/[id]/claim/route.ts`,
  `app/run/page.tsx`, migration `0020`, `ops/mumbai/`, the tests, and these
  docs.
- **Before the event:** MiniKlaim itself (everything up to commit
  `8748a2f368ba02441e332c169b8777ce866d2738`) was built by 0xj4an; its own
  history shows how.
