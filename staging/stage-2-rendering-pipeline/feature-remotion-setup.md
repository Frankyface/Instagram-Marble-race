# Feature: Remotion Project Setup

## What it is
The Remotion (React + TypeScript) project scaffold: reading a race manifest JSON file, loading/cropping avatar images into circular marble textures, and exposing the manifest as typed data to the composition layer.

## Why it matters
This is the foundation the actual video composition builds on — get manifest-loading and avatar-texture prep right once, and every composition downstream just consumes clean typed data.

## Behavior
- Remotion project created via `npx create-video@latest` (per `help.md` — needs Node.js installed first).
- A typed loader reads the race-manifest JSON (matching Stage 1's schema) into TypeScript types.
- Avatar images (referenced by the manifest) get loaded and circular-cropped for marble textures — needs a decision on whether this cropping happens in Python (Stage 1/3) or in the Remotion layer (see Open Questions).

## Implementation (Stage 2 checkpoint)
Built in `renderer/`. Real architectural constraint discovered while building this: Remotion bundles everything under `src/` for the browser/headless-Chrome render context (via webpack), so **no file (`fs`/`path`) access is possible anywhere in composition code** - not in components, not in `calculateMetadata`. This forced a cleaner split than originally envisioned:
- `src/` (bundled): pure, side-effect-free composition code. `RaceComposition` takes an already-resolved `{manifest, avatarStaticPathById}` as props - no file paths, no I/O.
- `scripts/render.mjs` (plain Node process, NOT bundled): reads the manifest JSON, copies avatars into `public/avatars/`, then drives Remotion's programmatic render API (`bundle()` + `selectComposition()` + `renderMedia()` from `@remotion/bundler`/`@remotion/renderer`), passing the fully-resolved manifest in as `inputProps`.

Verified end-to-end: `node scripts/render.mjs` against the real Stage 1 sample manifest produced a 1080x1920 h264 MP4 with a full-length AAC audio track, correct duration (race frames + podium seconds), visually confirmed via extracted frames (track/marbles render correctly mid-race, camera follows the leader, full 30-racer results screen renders at the end).

## Open Questions — resolved
- **Avatar cropping**: happens in Remotion via CSS (`border-radius: 50%` + `overflow: hidden` in `Marble.tsx`/`Podium.tsx`), not in Python. Keeps the Python engine free of an image-processing dependency.
- **Where avatars live**: copied into `renderer/public/avatars/` by `scripts/render.mjs`, named `<racerId>.<ext>`, referenced via Remotion's `staticFile()`. Not committed to git. Correction after code review: copying is skip-if-already-present (keyed on filename), not actually "regenerated per render" as originally stated here — if a racer id is ever reused across two different manifests with different avatar images (not expected with Stage 1/3's id schemes, but not impossible), the stale cached file would silently be served. Known limitation, not yet hardened; revisit if Stage 3's real ids make this collision-prone.
- **CLI vs wrapper script**: a wrapper script (`scripts/render.mjs`, run via `npm run render`) - not optional, as it turned out; it's the only place manifest-loading and avatar-copying *can* happen, since that code can't live in the bundled `src/` tree (see above).
