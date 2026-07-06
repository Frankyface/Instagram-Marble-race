# web/ — Followers Marble Race web app (Stage 6, in progress)

The browser app: design track **levels** in a visual editor, race an Instagram post's
commenters on them, preview live, and export an MP4. Personal/local use.

**Architecture & plan:** `staging/stage-6-web-editor-app/overview.md`.

## Status
Just started. So far:
- `src/level/types.ts` — the shared **Level format** (the keystone; editor writes it, JS
  physics simulates it, renderer draws it).
- `levels/classic-funnel.json` — a sample level conforming to the schema.

## Decisions (locked)
- Physics runs **in the browser**, ported from the Python `raceengine` to **planck.js**.
- **One app** (editor + URL→video flow). **Personal use** (one Instagram session, no auth).
- Only two things stay server-side: the Instagram fetch (`instagrapi`, Python — see
  `engine/sources/post_commenters.py`) and MP4 encoding (the Node Remotion renderer in
  `renderer/`). Everything else is client-side.

## Next steps (see the stage overview for the full plan)
1. Scaffold the Vite + React + TS project here (`npm create vite@latest`), add `planck` (JS
   physics) and `@remotion/player`.
2. W2: JS physics engine — simulate a Level + N marbles → frame positions + events (same
   "race manifest" shape the Python engine already produces).
3. W3: app shell that loads a level, runs the sim, and plays it via the Remotion Player.
4. W4: the canvas level editor.
5. W5: thin local Python `/commenters` API wrapping the Stage 3 instagrapi adapter.
6. W6: MP4 export (reuse the Node Remotion renderer).
