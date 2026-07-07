# Stage 6 — Coloured-Balls Web App + Level Editor

> **PIVOT (2026-07-07).** This stage was re-scoped. The racers are now plain, distinctly-coloured
> balls (not Instagram avatars); the Instagram/`instagrapi`/Remotion/pymunk pipeline is retired.
> The old version of this file (Instagram commenters, planck.js, Remotion Player, local Python
> `/commenters` API) is superseded by everything below. Research + plan are locked; an adversarial
> critique rated it **SOUND-WITH-FIXES** and every fix is folded into the stages.

## Goal
One **static browser web app**, deployed to **GitHub Pages**, that lets you:
1. **Design custom track levels** in a visual editor (walls, funnels, peg-grids, gates, spawn, finish).
2. **Watch N distinctly-coloured balls race** the level live in the browser (default 16, adjustable 2–64).
3. **Export a shareable vertical 1080×1920 MP4**, encoded entirely client-side.

Later layers (same core): **elimination** (gated panel resets) and **brackets** (multi-race tournament → final).

## Decisions locked (user, 2026-07-07)
| Question | Decision |
|---|---|
| Racers | Plain coloured balls, **anonymous**, count adjustable, **default 16** (range 2–64). No avatars/names. |
| Instagram data | **Retired entirely.** No server-side fetch of any kind. |
| Output | **Live preview + MP4 export**, both from one app. |
| Hosting | **GitHub Pages** — static only; no Node/Python server; no custom HTTP headers. |
| Race modes | **Single race + elimination + brackets** (full scope). |
| Camera | **Follows the leader** (downward scroll). |
| Audio | **Silent v1** (music/SFX is a post-v1 fast-follow). |
| Repo | **Reuse the existing repo** (`web/` folder); retire `engine/` + `renderer/` in place. |

Assumed defaults (reversible; not separately confirmed): **Chrome/Edge-first** MP4 export with a labelled WebM fallback elsewhere; **same-machine** determinism (cross-device shareable-seed deferred to `rapier2d-deterministic-compat`); caps **64 balls / 60 s**.

## Architecture — one deterministic sim → one `render()` → two loops
```
 Static Vite + React + TS bundle on GitHub Pages (100% client-side, no server, no SharedArrayBuffer)
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │  LEVEL JSON  (reused keystone, colour-agnostic)   +   RaceConfig {ballCount,seed,colors[]} │
 │        │                                                                            │
 │        ▼  compile                                                                   │
 │  DETERMINISTIC SIM  — Rapier2D (@dimforge/rapier2d-compat), fixed 1/60 dt,          │
 │        │              mulberry32-seeded spawn. Single source of truth.               │
 │        ▼                                                                            │
 │  ONE PURE render(ctx, state, frame, scale)  — hand-written Canvas 2D, camera-follow  │
 │        │                                                                            │
 │        ├── LIVE PREVIEW loop: rAF + fixed-timestep accumulator → on-screen canvas    │
 │        └── EXPORT loop (offline): re-run sim from same seed → render into 1080×1920   │
 │             OffscreenCanvas → VideoFrame → WebCodecs VideoEncoder → Mediabunny MP4    │
 │                                                                                     │
 │  EDITOR (react-konva): palette pieces → EditorDoc → compileToLevel() → Level JSON     │
 └──────────────────────────────────────────────────────────────────────────────────┘
```
Because the sim is deterministic and preview + export call the **same** `render()`, the exported video is
frame-identical to what you previewed (for a given seed) — no screen-capture, no second render path.

## Locked tech choices (with the why)
| Area | Choice | Why |
|---|---|---|
| Physics | `@dimforge/rapier2d-compat` (pin exact, single-thread) | Only candidate with a determinism guarantee; `-compat` base64-inlines its wasm (no separate fetch → no Pages MIME/base-path issue); no SharedArrayBuffer. Beats planck.js now that pymunk-parity is moot. |
| MP4 export | **WebCodecs `VideoEncoder` + Mediabunny** (`CanvasSource` + `Mp4OutputFormat` + `BufferTarget`) | Real H.264 MP4, fully client-side, needs only HTTPS (**not** COOP/COEP) → the one real-MP4 option that fits Pages. HW-accelerated, faster-than-realtime, ~17 kB. `mp4-muxer` is deprecated → use Mediabunny (same author). |
| Renderer | Hand-written **Canvas 2D** behind a swappable `render()` interface | 16–64 balls + pegs ≈ 100–300 draws/frame — trivially inside Canvas 2D's budget; WebGL adds weight + readback/determinism risk for no gain. |
| Editor | **react-konva** + konva 9.x | Official typed React bindings: scene graph, per-shape drag, `Transformer` (resize/rotate), grid snap, layers. Konva is geometry-only — it never simulates (no drift). |
| Editor model | Palette of **parametric pieces** (funnel, peg-grid, gate, spawn, finish) + one freeform-wall escape hatch; `EditorDoc` compiled to Level JSON at run/export | Parametric pieces build faster + produce finishable races by construction; single source of truth = `EditorDoc` → Level JSON. |
| Ball colours | Golden-ratio-conjugate hue walk in **OKLCH** (`culori`), alternating lightness/chroma bands, cached by N | Perceptually-uniform spread keeps 16–40 balls distinguishable; verify pairwise ΔE after sRGB clamp. Lives in RaceConfig → Level stays colour-agnostic. |
| Validation / state | **Zod** at every boundary; Zustand + immutable history (or `zundo`) for editor undo/redo | Fail-fast on imported JSON; drag-coalesced single-step undo. |
| App / host | Vite 6 + React 19 + TS 5.7+ → GitHub Pages via Actions (`base` = repo subpath, `404.html` SPA fallback) | Pure static bundle; the two known Pages gotchas fixed once in config. |
| Fallback encoder | Lazy single-thread `ffmpeg.wasm` **or** labelled WebM, only when native WebCodecs H.264 is absent | ST ffmpeg runs header-free on Pages (MT needs SharedArrayBuffer → excluded). Lazy-load the ~31 MB core only when needed. |

## Retired (kept only as reference)
Python `pymunk` engine (`engine/`) · Node Remotion renderer (`renderer/`) · `instagrapi` + Meta-export `FollowerSource` layer · avatar textures / placeholder-avatar fixtures · precomputed JSON race-manifest (the live browser sim is now the source of truth) · planck.js (superseded by Rapier2D) · Remotion `<Player>` as preview (superseded by the shared Canvas 2D `render()`).

## Reusable prior art (found in research)
- **This project's Level JSON + types** (`web/src/level/types.ts`, `web/levels/classic-funnel.json`) — ported verbatim as the keystone (S1 fixture).
- `lazygyu/roulette` (MIT) — **adopt** patterns: canvas renderer, camera-follow, minimap, live ranking, anti-stuck nudge (strip its named-participant layer; don't reuse its `MediaRecorder` recorder).
- `Kimajun0919/roulette` (React+Vite fork) — **learn**: engine/UI split, JSON scene schema + loader, shape→body compiler.
- `ahowley/marble-melodies` (MIT) — **learn**: Konva select/resize/rotate/box-select + localStorage-autosave interaction model.

## Sub-stages (each independently verifiable)
| # | Deliverable | Depends |
|---|---|---|
| **S0** | Vite+React+TS scaffold auto-deployed to the live `user.github.io/<repo>` URL (base subpath, 404.html, Actions deploy-pages). Verified by loading the real Pages URL. | — |
| **S1** | Level format module + Zod `LevelSchema`; Vitest loads `classic-funnel.json`, validates + round-trips (parse→serialize→parse equality); invalid fixtures rejected. | S0 |
| **S2** | `buildRace(level, config)` → Rapier world (fixed 1/60, mulberry32 spawn) + headless step loop. Vitest: two runs from same seed → **bit-identical** position arrays; all balls cross `finishY` within a frame cap. | S1 |
| **S3** | One pure `render(ctx, state, frame, scale)` (Canvas 2D) drawing walls/pegs/coloured balls + **camera-follows-leader**. Verified: same `RaceState` renders identical geometry at two resolutions (scale test). | S2 |
| **S4** | Live preview: rAF fixed-timestep accumulator, play/pause/restart, ball-count control (default 16, 2–64), OKLCH palette. Verified live: 16 auto-distinct balls race spawn→finish in the browser. | S3 |
| **S5** | Offline export loop → 1080×1920 H.264 MP4 Blob via Mediabunny, with progress UI, `typeof VideoEncoder` gate, **one-frame dry-run**, `VideoFrame.close()` + `encodeQueueSize` backpressure. Verified: downloaded MP4 plays + is frame-identical to preview for the same seed; long-export memory test (60 s / 64 balls). | S4 |
| **S6a** | react-konva canvas: place/select/move/delete pieces + **tall-level pan/zoom**. | S5 |
| **S6b** | `Transformer` resize/rotate + grid snap. | S6a |
| **S6c** | Undo/redo + localStorage autosave + JSON import/export. | S6b |
| **S6d** | Per-piece `compileToLevel` (Zod-validated) + end-to-end author → Test Race → Export from the editor. | S6c |
| **S7** | Runtime codec detection (dry-run, not just `isConfigSupported`) + lazy labelled WebM/ST-ffmpeg fallback; tested support matrix (Chrome/Edge/Firefox/Safari desktop) degrading gracefully. Verified on live Pages URL. | S5 |
| **S8** | 64-ball export perf (progress, no frame loss), intentional non-template UI pass, QA checklist on the deployed build. | S6d, S7 |
| **S9** | **Elimination**: sim gates (quota passes `finishY`-style gate line → panel reset, survivors restart at top), editor gate authoring, panel-transition camera/render. | S8 |
| **S10** | **Brackets**: run N races, top-X advance across configurable rounds → final; stitch rounds + progress screens into one exported video. | S9 |

Milestone: **S0–S8 = a shippable single-race app.** S9 (elimination) and S10 (brackets) layer on the same continuous-race primitive.

## Definition of Done
- [ ] Design a level in the editor, watch 16 (or N) coloured balls race it live, export a 1080×1920 MP4 — all in the browser, all on the deployed GitHub Pages site.
- [ ] Physics + render + export are client-side; the exported MP4 is frame-identical to the preview.
- [ ] Elimination and brackets modes work end-to-end on the same engine.
- [ ] Level JSON format is shared, Zod-validated, and reused (not forked) from the existing keystone.

## Risks (with mitigations, from the critique)
- **WebCodecs H.264 support varies** (Chrome/Edge solid; Firefox desktop 130+; Safari 26+; undefined on Firefox Android) → gate on `typeof VideoEncoder` **and a real one-frame encode dry-run** (Firefox `isConfigSupported` false-positives); labelled fallback.
- **Determinism is conditional** → fixed `world.timestep`, pinned solver iterations, all randomness via seeded `mulberry32`, two-run identical-positions regression test (S2). Scope = same browser session (preview==export); document that cross-browser is not guaranteed.
- **VideoFrame OOM** → `close()` every frame + backpressure + duration/ball caps + long-export memory test.
- **Preview ≠ 1080×1920 export** unless `render()` is fully resolution-parameterized (no pixel literals) → enforced by the S3 scale test.
- **GitHub Pages base-path / wasm serving** (top static-hosting failure) → set `base`, add `404.html`, use `-compat` (base64 wasm), test the **built** artifact on the real Pages URL (S0/S8).
- **Editor scope creep** → S6 split into 4 verifiable sub-stages incl. pan/zoom; drop static trap-detection in favour of the S2 frame-cap "N balls didn't finish" signal; hide the Gate piece until S9 simulates it.
- **Async Rapier init** (`RAPIER.init()` must resolve before any world) → gate preview/export UI on it; consider code-splitting the sim so first paint isn't blocked.
- **Main-thread freeze during export** → decide main-thread-with-yields vs Web Worker (VideoEncoder + OffscreenCanvas both work in a Worker **if** `render()` is DOM-free); at minimum, `await` backpressure so the progress UI repaints.

## Resolved open questions (were flagged for the user)
- Cross-device reproducibility → **not required** for v1 (same-machine preview==export suffices); standard `-compat` build.
- Race modes → **elimination + brackets in scope** (S9/S10, after the single-race app).
- Camera → **follows leader** (scroll).
- Audio → **silent v1**.
- Repo → **reuse existing** repo's `web/`.

## Still to settle during build (non-blocking)
- Browser-support floor for MP4 (currently Chrome/Edge-first + labelled fallback) — revisit if first-class Safari/Firefox MP4 becomes a hard requirement.
- Exact ball/duration caps (starting 64 / 60 s).
- Main-thread vs Worker export (decide at S5 based on measured freeze).
