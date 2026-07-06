# Handoff — Followers Marble Race
_Last updated: 2026-07-06 · Current stage: Stage 1 — Core Race Engine_

## 🎯 Goals
Stand up the core continuous-scroll race engine (physics sim + event stream + JSON manifest output) using mock/local avatar images, so every later stage (rendering, real data sources, elimination, brackets) has something solid to build on.

## 📍 Current State
Project just scaffolded from the kickoff interview. No code written yet — docs and the full stage plan exist, nothing implemented.

## 📂 Files I'm Working On
None yet — Stage 1 hasn't started.

## ✅ Things I've Changed
- 2026-07-06: Project scaffolded (CLAUDE.md, docs/master_plan.md, 5-stage plan under staging/, help.md) from the kickoff interview.

## ❌ Tried But Failed
Nothing yet.

## ➡️ Next Up
1. Read `staging/stage-1-core-engine/overview.md` and its feature files.
2. Set up the Python project skeleton (pymunk, project structure for the `FollowerSource` interface + physics engine + event system).
3. Build the single continuous-scroll race primitive against a handful of local placeholder avatar images (no real Instagram data yet — that's Stage 3).
4. Get a JSON race manifest exporting successfully for one race.
5. Resolve Stage 1's open questions (camera-follow metric, track shape, stall/timeout condition) before or during implementation.

## 🔗 Pointer
→ Current stage folder: `staging/stage-1-core-engine/` · Active feature file: `staging/stage-1-core-engine/feature-race-engine.md`
