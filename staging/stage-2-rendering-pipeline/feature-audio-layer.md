# Feature: Event-Driven Audio Layer (Music in v1)

## What it is
An audio system built around the Stage 1 race-event stream — subscribers react to events (`race_complete`, `gate_pass`, etc.) to trigger audio. v1 wires up exactly one subscriber: a looping background music track under the whole race. SFX subscribers (collision thud, gate ding, finish stinger) are meant to slot in later against the same events, without restructuring this system.

## Why it matters
Per the kickoff interview, this was explicitly called out as a "build once, extend later" architecture decision — the music is just the first audio source, not a special case.

## Behavior
- A single background-music track plays for the race's duration, trimmed/looped to match manifest length.
- Music selection: a small local library of a few royalty-free tracks (sourced per `help.md`), one used per render (fixed choice or simple random pick from the library — TBD).
- Audio subscribers are structured against the same event types Stage 1 defines (`race_complete`, `gate_pass`, `collision`, `panel_reset`), even though only music (which doesn't need a specific event trigger, just plays for the render's duration) ships in v1.

## Open Questions
- Does background music selection need to vary (e.g. randomly picked per render, or user-selectable), or is a single fixed track acceptable for v1?
- Music licensing — confirm the sourced tracks (see `help.md`) are actually safe to use on content posted to Instagram (some royalty-free libraries have platform-specific restrictions).
- Should music volume duck automatically around a future finish-stinger SFX, or is that a Stage-4+/polish-later concern?
