# Feature: Official Meta Export Adapter

## What it is
A parser that takes Meta's "Download Your Information" JSON export (requested manually per `help.md`) and produces a normalized follower list (avatars downloaded/cached locally, IDs/usernames extracted) matching the common `FollowerSource` output shape.

## Why it matters
This is the zero-ban-risk default path — always available for the project owner's own account(s), no automation/login risk involved.

## Behavior
- Input: path to an unzipped Meta data export.
- Parses the followers JSON within it (exact file path/structure needs confirming against a real export — see Open Questions).
- Meta's export typically does NOT include the actual avatar images, only profile references — so this adapter likely needs to fetch avatar images separately (e.g. via a lightweight public-profile-picture fetch) once usernames are known. Needs investigation.
- Outputs the common normalized shape: `{id, username, avatarImagePath}` per follower, avatars cached locally for the render pipeline to reference.

## Open Questions
- What's the exact file/folder structure and JSON schema inside a real Meta data export for followers? (Needs a real export — request it early per `help.md`, since Meta can take hours to generate one.)
- Does the export include avatar image URLs/files, or just usernames — if just usernames, what's the actual mechanism for fetching a profile picture per username without hitting the same ToS/ban concerns as the instagrapi path?
- How to handle followers whose accounts are deleted/deactivated/private by the time the export is processed?
