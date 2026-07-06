# Stage 3 — Real Data Sources

## Goal
Replace Stage 1's placeholder avatars with real Instagram data, via pluggable `FollowerSource` adapters behind a common interface. Three adapters planned/started: the official Meta data-export parser (zero ban risk, own accounts only), an `instagrapi`-based unofficial follower scraper (any public account, ToS/ban risk), and — added at the user's request — a `PostCommentersSource` that races the *commenters* of a specific post via `instaloader`.

## Features in this stage
- `feature-official-export-adapter.md` — parses Meta's "Download Your Information" JSON export into the common follower format. (Not started.)
- `feature-instagrapi-adapter.md` — logs in and scrapes followers/avatars for any public account via `instagrapi`. (Not started.)
- `feature-commenters-adapter.md` — races the commenters of one post via `instaloader`. **Built** (engine-side + tests); live run pending user's burner-account creds.

## Definition of Done
- [x] A common `FollowerSource` interface exists; adapters implement it and produce the same normalized `Racer` shape (`{id, username, avatar_path}`). — the interface (`sources/base.py`) exists; `PostCommentersSource` satisfies it.
- [ ] The official-export adapter successfully parses a real export and feeds a race end-to-end (fetch → simulate → render). (Not started.)
- [ ] The instagrapi adapter successfully fetches a public account's followers + avatars and feeds a race end-to-end, with basic rate-limiting/politeness built in to reduce ban risk. (Not started.)
- [~] The `PostCommentersSource` adapter is built + unit-tested (24 tests, 97% coverage, no live API in tests). A real end-to-end live run (fetch → simulate → render from a real post's commenters) is **blocked on the user** supplying a burner Instagram account's creds in `.env` and `pip install instaloader` — see `help.md`.
- [x] Switching between sources requires no changes to Stage 1/2 code — only the adapter selection (verified: the engine/renderer depend only on `tuple[Racer, ...]`).
