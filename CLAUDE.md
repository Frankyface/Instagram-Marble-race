# Followers Marble Race — Project Rules

## One-liner
A personal tool that turns an Instagram account's followers into marbles in a physics-simulated marble race, rendered as a shareable vertical (Reels/Stories-format) video.

## Tech stack
- **Fetch + Simulation (Python)**: pluggable follower-fetching (Repository Pattern) with two adapters — an official Meta "Download Your Information" export parser, and an `instagrapi`-based unofficial scraper — both behind a common `FollowerSource` interface. Physics simulation via `pymunk` (Chipmunk2D bindings). Simulation emits a race-event stream (finish, gate-pass, collision, etc.) and outputs a JSON "race manifest" (frame-by-frame marble positions + events + results).
- **Rendering (Remotion / React+TypeScript)**: consumes the JSON race manifest and renders the final vertical MP4. Chosen because Remotion is purpose-built for data→video pipelines and ships a browser-based Player — a natural path to a future web app without a rewrite.
- **Render style**: intentionally simple 2D graphics — flat marbles with circular-cropped avatar textures, a basic track, clean vertical layout. Visual polish is explicitly NOT a v1 goal; the renderer was flagged as the biggest risk, so keep it simple rather than chasing polish.
- **Audio**: event-driven audio layer. v1 ships background music only (looping royalty-free track), but the system is built so SFX (collision thud, gate ding, finish stinger) can slot in later against the same race-event stream without rework.
- **Important Remotion constraint** (discovered building Stage 2): everything under `renderer/src/` gets bundled by webpack for the browser/headless-Chrome render context — this means **no `fs`/`path`/file I/O anywhere in `src/`**, including inside `calculateMetadata`. Any code that needs to read the manifest JSON or copy avatar files must live in `renderer/scripts/` (plain Node scripts, not bundled) and pass fully-resolved data into the composition as `inputProps`.

## Core architecture
Single continuous-scroll race (camera follows the leader) is the core primitive. Two modes are composed on top of it — NOT built as separate engines:
- **Elimination**: a single race cut into panels — when X marbles pass through a gate, the race jumps to a new panel and everyone restarts at the top.
- **Brackets**: multiple single races; the top X finishers from each advance to a final (configurable number of rounds).

## Document workflow (read this first, every session)
1. Read `handoff.md` first — it's the head of a linked list and the single source of truth for "where are we right now."
2. Follow its `## 🔗 Pointer` into the current stage folder under `staging/` and the active feature file.
3. `docs/master_plan.md` has the full vision if you need the big picture.
4. `staging/` folders are the ordered body of work, stage by stage — each has an `overview.md` and one `feature-<name>.md` per feature, each with an `## Open Questions` section.

## Standing command: "update all relevant files"
When the user says this, automatically:
1. Review what changed this session — what got built, decided, or abandoned.
2. Update `handoff.md` in full (all sections always refresh).
3. Update `new_session_prompt.md` if the resume instructions/pointer changed.
4. Update `CLAUDE.md` only if a rule/convention/stack fact changed.
5. Update active feature `.md` files — tick off done items, resolve/append open questions.
6. Update stage `overview.md` files if scope or done-criteria shifted.
7. Update `docs/master_plan.md` if the vision/roadmap genuinely changed.
8. Update `help.md` if new human to-dos appeared.
9. Keep `handoff.md`'s pointer accurate to the real current stage + feature file.
10. Give a 3-5 line summary of what was updated and why.

## Coding conventions
- Python: PEP 8, type hints throughout, small focused modules (one adapter per file), Repository Pattern for the `FollowerSource` interface, immutable data where practical.
- TypeScript/Remotion: camelCase functions/variables, PascalCase components, one composition per file, keep compositions data-driven off the race-manifest schema (no hardcoded race data in components).
- Many small files over few large ones — 200-400 lines typical, 800 max.

## How to run / test
Python engine lives in `engine/` with its own venv:
```
cd engine
.venv/Scripts/python.exe -m pytest --cov=raceengine --cov=sources --cov-report=term-missing
.venv/Scripts/python.exe scripts/run_sample_race.py --count 30 --seed 1
```
If `fixtures/avatars/` is empty, regenerate placeholder avatars first:
```
.venv/Scripts/python.exe fixtures/generate_placeholder_avatars.py --count 40
```

Remotion renderer lives in `renderer/` (Node/TypeScript, own `node_modules`):
```
cd renderer
npm run typecheck
npm run render                          # renders engine/output/sample_race.json -> renderer/output/race.mp4
node scripts/render.mjs --manifest <path> --out <path>   # render a specific manifest
npm run dev                             # remotion studio, previews against a small embedded placeholder manifest
```

## Branching / commits
- `main` is always deployable/demo-able.
- Feature branches per stage/feature, e.g. `stage-1/race-engine`.
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
