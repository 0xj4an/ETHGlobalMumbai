# MiniKlaim at ETHGlobal Mumbai

Continuity Track work on [MiniKlaim](https://github.com/0xj4an/MiniKlaim), a
territory-capture running game live on Celo (www.miniklaim.fun). This repo is
the full MiniKlaim codebase with its history, on branch `ethglobal-mumbai`.

What existed before the event and what is added here is kept apart on purpose,
so judges only look at the new work:

- Starting point: the branch is cut from MiniKlaim `main` at commit
  `8748a2f368ba02441e332c169b8777ce866d2738` (2026-11-05). See
  [.ai/references/baseline.md](.ai/references/baseline.md).
- New work at ETHGlobal Mumbai (5 to 7 Nov 2026): hex defense levels on
  Arkiv, neighbourhood titles on ENSv2, and World ID on attacks. See
  [.ai/runs/2026-11-06-arkiv-ens-world/](.ai/runs/2026-11-06-arkiv-ens-world/).

## How this repo is organised

The repo follows Artur Vargas' AI Engineering Kit
([ArturVargas/AI_Engineering_Kit](https://github.com/ArturVargas/AI_Engineering_Kit),
commit `1916ca9`):

| Path | What it holds |
| --- | --- |
| `.ai/CONTEXT.md` | Project identity, constraints, where things run |
| `.ai/references/` | Stable project knowledge, including the baseline |
| `.ai/adr/` | Decisions that are hard to reverse |
| `.ai/runs/` | One folder per initiative, only the stages it needs |
| `standards/` | Kit rules (engineering, testing, security, release, ...) |
| `templates/` | Kit artifact formats |

`standards/` and `templates/` are copied from the kit unchanged (Spanish).

## License

To be decided before submission. The kit files are Artur's; confirm reuse
terms with him.
