# Followers Marble Race — Master Plan

## Pitch
A personal tool that turns an Instagram account's followers into marbles in a physics-simulated marble race, rendered as a shareable vertical video (Reels/Stories format) — the classic "marble race, whoever's marble wins" viral video format, but the marbles are real people's profile photos.

## Problem & Why
Marble race videos are a well-established, engaging short-form video genre. Personalizing them with real followers' avatars turns a generic format into something an account's own audience would actually want to watch and engage with ("is my photo in this race?"). Today, making one requires either manual video editing or generic marble-race generators that know nothing about a specific Instagram audience.

## Target Users & Use Cases
- **v1**: just the project owner — a personal content-creation tool to generate marble race videos for their own Instagram/TikTok, using their own followers (or any public account's followers, via the unofficial data source) as the cast.
- **Future**: anyone who wants to generate one of these for their own audience, self-serve via a web app.

Top job-to-be-done: "give me an Instagram handle, and a few minutes later hand me a finished, shareable vertical video of that account's followers racing marbles."

## v1 Scope

**In scope:**
- Core continuous-scroll race engine (camera follows the leader), physics-simulated with `pymunk`.
- All three race modes working end-to-end: **single race**, **elimination** (gated panel resets), and **brackets** (multiple races feeding a configurable-round final).
- Two pluggable follower-data sources behind a common interface: official Meta data-export parser, and an `instagrapi`-based unofficial scraper.
- Simple 2D rendering via Remotion: flat marbles with circular-cropped avatar textures, basic track, clean vertical (Reels/Stories) layout, full podium/results screen.
- Background music (looping, royalty-free), built on an event-driven audio system.
- Output: a finished, shareable vertical MP4.

**Explicitly OUT of v1 (non-goals):**
- Any web/multi-user interface — this is a personal script/tool for now.
- Visual polish beyond simple flat 2D graphics — no shaders, particle effects, or elaborate track art.
- Sound effects (collision thuds, gate dings, finish stingers) — architected for, not built.
- Scheduled/automated posting to Instagram.
- Any account/auth system, billing, or hosting.

## Future Roadmap (6-12 months)
1. **Open it up as a real web app** — others enter their own Instagram handle and get a race video generated for their own audience. Remotion's browser-based Player component is the intended bridge — the render layer already runs in a browser, so this is a UI + hosting + multi-tenancy problem more than a rewrite.
2. **Scheduled/automated posting straight to Instagram** — likely via the Instagram Graph API / Meta's Content Publishing API, which requires a reviewed Meta Developer app (start that review process early once pursuing this, since it's not instant).

Both goals must NOT be architecturally foreclosed by v1 decisions — in particular, the `FollowerSource` interface should be able to accept a handle from an arbitrary end-user (not just the project owner) without rework, and the render pipeline should not assume a single hardcoded output destination.

## Tech Stack & Key Decisions (with the why)

| Decision | Choice | Why |
|---|---|---|
| Follower fetching | Python, Repository Pattern (`FollowerSource` interface) with two adapters: official Meta export parser + `instagrapi` scraper | `instagrapi` only exists in Python. A common interface means either source feeds the same downstream pipeline, and a future third source slots in without touching the rest of the system. |
| Physics simulation | Python, `pymunk` (Chipmunk2D bindings) | Mature, deterministic 2D physics engine, well-suited to marble/circle collision simulation. |
| Simulation → render contract | JSON "race manifest" (frame-by-frame marble positions + a race-event stream + final results) | Clean seam between simulation and rendering — either side can be rebuilt independently, and it's the natural boundary for a future API. |
| Rendering | Remotion (React + TypeScript) | Purpose-built for data→video pipelines; ships a browser-based Player, giving a near-free path to the "web app" future-horizon goal without re-architecting the renderer. |
| Render style | Simple flat 2D (avatar-textured circles, basic track) | The renderer was flagged as the biggest risk to shipping — deliberately keeping it simple removes that risk rather than fighting it. |
| Audio | Event-driven, music-only in v1 | The race engine already emits an event stream for other reasons (gate-pass, finish, etc.); music is simply "the first audio source" subscribed to those events, so SFX later is additive, not a rework. |
| Race engine core primitive | Single continuous-scroll race (camera follows leader) | Both elimination and brackets are expressible as configuration/composition on top of one engine, rather than three separate systems to maintain. |

## Architecture Sketch
```
 Follower Sources (Python)         Race Engine (Python)              Renderer (Remotion/TS)
 ┌────────────────────┐            ┌─────────────────────┐           ┌───────────────────────┐
 │ Official export     │──┐        │ physics (pymunk)     │           │ video composition:    │
 │  adapter            │  │        │  + event stream      │──JSON──▶ │  avatars, track,      │
 ├────────────────────┤  ├──────▶ │ race manifest export  │  manifest│  camera-follow,       │
 │ instagrapi adapter  │──┘        │ (single/elim/bracket) │           │  podium, music        │
 └────────────────────┘            └─────────────────────┘           └───────────────────────┘
        common interface:                                                       │
          FollowerSource                                                        ▼
                                                                    shareable vertical MP4
```

## Staged Roadmap

| Stage | Goal | Headline Feature | Status |
|---|---|---|---|
| 1 — Core Race Engine | Stand up the single continuous-scroll race primitive with physics + event stream, against local placeholder avatars | A single race simulates end-to-end and exports a valid JSON race manifest | ✅ Done, 12/12 verification criteria pass |
| 2 — Rendering Pipeline | Build the Remotion composition that consumes a race manifest and renders a finished video | A JSON manifest becomes a shareable vertical MP4, with music | ✅ Done, verified via a real 30-racer render |
| 3 — Real Data Sources | Build both `FollowerSource` adapters (official export + instagrapi) behind the common interface | A race video generates from a real Instagram account's actual followers | Next up |
| 4 — Elimination Mode | Add gated panel-reset logic on top of the core engine | Elimination races (gate cutoffs, panel resets) work end-to-end | Not started — will need real changes to `physics.py`, see feature-race-engine.md |
| 5 — Brackets Mode | Add multi-race tournament composition (configurable rounds, top-X advances) on top of the core engine | Full bracket tournaments, feeding into a final race, work end-to-end | Not started — engine already supports this |
| 6 — Web App + Level Editor | A browser app: design custom track "levels" in a visual editor, race a post's commenters on them, preview live, export MP4. Physics ported to JS (planck.js), personal/local use. | Paste a URL → design/pick a level → watch commenters race → export MP4, all in the browser | **In progress** — architecture decided + level format started; see `staging/stage-6-web-editor-app/` |

Note: the commenters race (Stage 3's instagrapi adapter) is already working end-to-end and produced a real video. Stage 6 pulls Stages 1–3 into a browser app with an editor. Scheduled auto-posting to Instagram remains a later future-horizon item.

## Open Questions & Risks
- **Renderer complexity** (flagged as biggest risk) — resolved: Stage 2 shipped and a real 30-racer manifest renders correctly (verified via extracted frames). Simple flat 2D visuals held up fine; no further mitigation needed unless real Instagram avatars (Stage 3) reveal new issues.
- **Instagram ban/flag risk** on the `instagrapi` adapter — mitigated by keeping the official-export adapter as the zero-risk default path; `instagrapi` is opt-in per use.
- **Avatar count/track scaling** — how many marbles can realistically race at once before the track/physics/readability breaks down? Needs empirical testing in Stage 1.
- **Camera-follow logic** — "follows the leader" needs a concrete definition (furthest arc-length along track? simple Y-position?) — to be resolved in Stage 1.
- **Bracket seeding** — how are followers assigned to bracket groups (random? alphabetical? something else?) — to be resolved in Stage 5.
- Meta's Content Publishing API review process (needed for the future "scheduled posting" goal) is unscoped — not a v1 concern, but worth researching before committing to a 6-12mo timeline on that item.

## Glossary
- **Race manifest** — the JSON contract between the Python simulation and the Remotion renderer: frame-by-frame marble positions, a race-event stream, and final results.
- **FollowerSource** — the common interface both data adapters (official export, instagrapi) implement.
- **Panel** — one segment of an elimination race; when a gate's pass-through quota is hit, the race jumps to a new panel and remaining marbles restart at the top.
- **Gate** — the cutoff mechanism in elimination mode; allows only X marbles through before triggering a panel reset.
- **Bracket** — a group of marbles racing in a single race whose top X finishers advance to a later round/final.
