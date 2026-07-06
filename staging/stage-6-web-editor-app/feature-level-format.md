# Feature W1: Level Format (the keystone)

## What it is
A JSON schema describing a **track level** as explicit geometry, replacing today's procedural-only track. It's the contract shared by the editor (writes it), the JS physics engine (simulates it), and the renderer (draws it).

## Why it matters
Everything in Stage 6 consumes this. Get it right first. It also generalizes the current `TrackInfo` (which only carried width/length/obstacles) into something an editor can author and that can express funnels and gates (feeding elimination/brackets later).

## Draft schema (v1)
```jsonc
{
  "schemaVersion": 1,
  "name": "Classic Funnel",
  "size": { "width": 720, "height": 3200 },        // world units; renderer scales to 1080 wide
  "marbleRadius": 32,
  "spawn": { "x": 60, "y": 0, "width": 600, "height": 200 }, // where marbles drop in
  "finishY": 3100,                                  // first marble to cross this wins
  "walls": [                                        // static polylines (the outer channel + custom walls)
    { "points": [[0,0],[0,3200]], "thickness": 20 },
    { "points": [[720,0],[720,3200]], "thickness": 20 }
  ],
  "pegs": [ { "x": 120, "y": 400, "radius": 22 } ], // static circles
  "funnels": [ { "x": 360, "y": 1200, "width": 500, "gap": 120, "height": 200 } ], // convenience piece -> compiled to walls
  "gates": [ { "y": 1600, "quota": 20 } ]           // reserved for elimination (Stage 4 concept), optional in v1
}
```

## Behavior / rules
- **Pieces vs primitives**: the editor works in high-level pieces (funnel, peg-grid, gate) for speed; on save they compile down to `walls`/`pegs` primitives the physics engine understands (funnels/peg-grids expand; gates stay as a typed field for later).
- **Win condition**: first marble whose center crosses `finishY` wins — this is the "first person down" rule the user confirmed. No time-budget straggler fallback needed if the level is finishable by construction; keep a max-sim-time safety cap anyway.
- **Coordinate system**: y increases downward (matches the current engine + canvas + video conventions).

## Open Questions
- Should the Python `raceengine` also parse Level JSON (so the CLI can run editor-made levels), or is the JS engine the sole consumer? (Cheap to add a Python loader; decide based on whether CLI use continues.)
- Do gates belong in v1 of the format, or add them when elimination mode is actually built? (Leaning: include the field in the schema now — it's free — but the editor doesn't have to expose gate-drawing in v1.)
- Units/scale: fix world width at 720 (matches the tuned commenter race) or make it fully free-form per level? Free-form is more editor-friendly; the renderer already scales `1080 / size.width`.
- Validation: a shared JSON Schema both the TS and Python sides validate against, so editor output can't desync from what the engines accept.
