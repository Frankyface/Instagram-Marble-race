# Feature: instagrapi Unofficial Adapter

## What it is
An adapter that logs into Instagram (via `instagrapi`) as a real account and fetches a target public account's followers + avatar images automatically — works for any public account, not just the project owner's own.

## Why it matters
This is what makes the tool actually flexible (race any public account's followers, not just your own export), but it carries real ToS/ban risk that needs deliberate mitigation.

## Behavior
- Input: a target Instagram username (any public account).
- Logs in via `instagrapi` using credentials from a local `.env` file (never committed — see `help.md` and `.gitignore`).
- Fetches the follower list and avatar images for the target account, normalized to the common `FollowerSource` shape.
- Includes basic rate-limiting/politeness (delays between requests, reasonable batch sizes) to reduce the chance of the logged-in account getting flagged.

## Open Questions
- What specific rate-limit/delay strategy is "safe enough" — is there community consensus (from instagrapi's docs/issues) on request patterns less likely to trigger flags?
- Should this adapter use a dedicated secondary account rather than the project owner's primary account, given the ban risk (flagged in `help.md` as a decision to make)?
- How does this adapter behave against a private account (can't fetch followers at all) or an account with a huge follower count (pagination, and the practical cap on how many marbles a race can hold from Stage 1)?
- Does `instagrapi`'s current version still work reliably against Instagram's current anti-automation measures at the time Stage 3 actually starts? Worth a quick sanity check before building on it — these unofficial libraries can break when Instagram changes its internals.
