# Stage 3 — Real Data Sources

## Goal
Replace Stage 1's placeholder avatars with real Instagram follower data, via two pluggable `FollowerSource` adapters behind a common interface: the official Meta data-export parser (zero ban risk, own accounts only), and an `instagrapi`-based unofficial scraper (any public account, ToS/ban risk).

## Features in this stage
- `feature-official-export-adapter.md` — parses Meta's "Download Your Information" JSON export into the common follower format.
- `feature-instagrapi-adapter.md` — logs in and scrapes followers/avatars for any public account via `instagrapi`.

## Definition of Done
- [ ] A common `FollowerSource` interface exists; both adapters implement it and produce the same normalized output shape (list of `{id, username, avatarImagePath}`).
- [ ] The official-export adapter successfully parses a real export and feeds a race end-to-end (fetch → simulate → render).
- [ ] The instagrapi adapter successfully fetches a public account's followers + avatars and feeds a race end-to-end, with basic rate-limiting/politeness built in to reduce ban risk.
- [ ] Switching between the two sources requires no changes to Stage 1/2 code — only the adapter selection.
