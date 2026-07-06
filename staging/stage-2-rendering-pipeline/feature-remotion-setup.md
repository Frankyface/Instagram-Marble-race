# Feature: Remotion Project Setup

## What it is
The Remotion (React + TypeScript) project scaffold: reading a race manifest JSON file, loading/cropping avatar images into circular marble textures, and exposing the manifest as typed data to the composition layer.

## Why it matters
This is the foundation the actual video composition builds on — get manifest-loading and avatar-texture prep right once, and every composition downstream just consumes clean typed data.

## Behavior
- Remotion project created via `npx create-video@latest` (per `help.md` — needs Node.js installed first).
- A typed loader reads the race-manifest JSON (matching Stage 1's schema) into TypeScript types.
- Avatar images (referenced by the manifest) get loaded and circular-cropped for marble textures — needs a decision on whether this cropping happens in Python (Stage 1/3) or in the Remotion layer (see Open Questions).

## Open Questions
- Should avatar circular-cropping happen upstream (Python, when the manifest is built) or here in Remotion at render time? Cropping upstream keeps Remotion simpler; cropping here keeps Python from needing an image-processing dependency.
- Where do avatar image files actually live for Remotion to reference — copied into the Remotion project's `public/` folder per race, or read from an absolute path shared between the Python and Remotion projects?
- Do we render via Remotion's CLI (`npx remotion render`) as a one-off per race, or eventually wrap that in a small script that goes fetch → simulate → render in one command?
