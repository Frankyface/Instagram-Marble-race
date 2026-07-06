# Followers Marble Race

A personal tool that turns an Instagram account's followers into marbles in a physics-simulated marble race, rendered as a shareable vertical video (Reels/Stories format).

Give it an Instagram handle → it pulls the account's followers' profile photos → simulates a physics-based marble race (single race, elimination heats, or full bracket tournaments) → renders a finished, shareable vertical MP4.

## Status
Early scaffolding — see [`handoff.md`](handoff.md) for current state and [`docs/master_plan.md`](docs/master_plan.md) for the full vision.

## Stack
- **Python** — follower fetching (pluggable: official Meta data export, or `instagrapi` unofficial scraper) + `pymunk` physics simulation
- **Remotion** (React/TypeScript) — renders the simulated race into a finished MP4
