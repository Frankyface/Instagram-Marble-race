# Stage 6 — Web App + Level Editor

## Goal
Turn the CLI tool into a single **browser web app** (personal use, runs locally) that lets you:
1. **Design custom track "levels"** in a visual editor (walls, funnels, pegs, gates — beyond today's procedural-only track).
2. **Enter an Instagram post URL**, fetch its commenters, and race them on the chosen level.
3. **Preview the race live in the browser** and **export a shareable vertical MP4**.

## Decisions locked (user, 2026-07-06)
- **Physics runs in the browser (ported to JS).** The small pymunk engine gets re-implemented in JS (planck.js — a Box2D port, closest to pymunk's semantics) so the editor, simulation, and playback all run client-side with instant preview. The Python `raceengine` stays as the CLI/reference implementation but is not on the web hot path.
- **One cohesive web app** (editor + URL→video flow together), not two separate tools.
- **Personal use only.** One Instagram session (the user's), no accounts/auth/multi-tenancy. This deliberately sidesteps the multi-user Instagram-access problem.

## Architecture
```
 Browser (Vite + React + TS)                              Local Python service (thin)
 ┌───────────────────────────────────────────┐           ┌──────────────────────────────┐
 │ Level Editor (canvas): design a level      │           │ POST /commenters {postUrl}    │
 │        │ writes                             │           │   -> instagrapi fetch (Stage 3)│
 │        ▼                                    │  fetch    │   -> [{id,username,avatarUrl}] │
 │ Level JSON (walls/pegs/funnels/gates,       │◀─────────▶│ (must stay server-side:        │
 │   spawn zone, finish line, dimensions)      │  avatars  │  instagrapi=Python, needs the  │
 │        │                                    │           │  session + a non-flagged IP)   │
 │        ▼                                    │           └──────────────────────────────┘
 │ JS physics (planck.js): simulate level +    │
 │   marbles -> frame positions + events       │           MP4 export:
 │        │  (same "race manifest" shape)       │           reuse the existing Remotion
 │        ▼                                    │           renderer (Stage 2) via a local
 │ Remotion Player (browser): live preview      │──────────▶ /render endpoint, OR in-browser
 │   + "Export MP4" button                     │           capture. (decide in feature-export)
 └───────────────────────────────────────────┘
```

Only two things must stay server-side: (1) the Instagram fetch (instagrapi), and (2) MP4 encoding (Remotion's renderer is Node-based). Everything else — editor, physics, live preview — is client-side.

## The keystone: a shared "level" format
Today's track is procedural params only. The editor needs a richer **Level JSON** describing explicit geometry (wall polylines, peg circles, funnels, gates for elimination, a spawn region, a finish line, canvas dimensions). This format is the contract between editor → JS physics → renderer, and ideally the Python engine can consume it too (so the CLI and web app stay in sync). Designing this well is the first task — everything else depends on it.

## Sub-stages (proposed)
| # | Feature | Why first / dependency |
|---|---|---|
| W1 | `feature-level-format.md` — the Level JSON schema + a couple of hand-authored sample levels | Keystone; everything consumes it |
| W2 | `feature-js-physics.md` — planck.js engine: Level + N marbles → frame positions + events, matching the race-manifest shape | Core; verify parity with the Python sim's feel |
| W3 | `feature-web-app-shell.md` — Vite+React+TS app; load a level, run the JS sim, play it via the Remotion Player in-browser | Makes W1+W2 visible |
| W4 | `feature-editor-ui.md` — canvas editor to create/edit Level JSON (place walls/pegs/funnels/gates, set spawn+finish) with live race preview | The "editor" ask |
| W5 | `feature-fetch-service.md` — thin local Python API wrapping the Stage 3 instagrapi adapter (`/commenters`), CORS for localhost; avatars streamed/proxied to the browser | Puts real followers into the web app |
| W6 | `feature-export.md` — MP4 export (reuse the Node Remotion renderer via a local `/render`, or in-browser capture) | Shareable output |

## Definition of Done
- [ ] A browser app where you can design a level, paste a post URL, and watch that post's commenters race on your level — then export an MP4.
- [ ] Physics runs client-side (instant editor preview); only the Instagram fetch + MP4 encode touch the local Python/Node services.
- [ ] The Level JSON format is shared and documented; at least 2 hand-authored sample levels plus editor-created ones work.
- [ ] Reuses (not forks) the existing Stage 3 instagrapi fetch and, where practical, the Stage 2 Remotion renderer.

## Big open questions (resolve as we go)
- **Physics parity/determinism**: planck.js vs pymunk will *feel* different; the goal is a fun race, not bit-identical parity. How much re-tuning is acceptable? (Likely: re-tune fresh in JS, don't chase parity.)
- **MP4 export path**: reuse the Node Remotion renderer (heavier, but already built and high-quality) vs in-browser canvas capture (lighter, lower quality, no server). Lean reuse-Remotion for quality since it's a local personal tool.
- **Does the Python `raceengine` also consume Level JSON**, or does the web app fully supersede it? (Keep Python consuming it if cheap, so the CLI stays usable; otherwise let the JS engine be the source of truth for levels.)
- **Editor scope for v1**: freeform (draw arbitrary walls) vs a palette of parametric pieces (funnels, peg-grids, gates) you place and tweak. Palette-of-pieces is faster to build and produces better races; freeform is more powerful. Probably start palette-based.
