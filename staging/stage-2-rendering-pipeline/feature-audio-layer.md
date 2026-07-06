# Feature: Event-Driven Audio Layer (Music in v1)

## What it is
An audio system built around the Stage 1 race-event stream — subscribers react to events (`race_complete`, `gate_pass`, etc.) to trigger audio. v1 wires up exactly one subscriber: a looping background music track under the whole race. SFX subscribers (collision thud, gate ding, finish stinger) are meant to slot in later against the same events, without restructuring this system.

## Why it matters
Per the kickoff interview, this was explicitly called out as a "build once, extend later" architecture decision — the music is just the first audio source, not a special case.

## Behavior
- A single background-music track plays for the race's duration, trimmed/looped to match manifest length.
- Music selection: a small local library of a few royalty-free tracks (sourced per `help.md`), one used per render (fixed choice or simple random pick from the library — TBD).
- Audio subscribers are structured against the same event types Stage 1 defines (`race_complete`, `gate_pass`, `collision`, `panel_reset`), even though only music (which doesn't need a specific event trigger, just plays for the render's duration) ships in v1.

## Implementation (Stage 2 checkpoint)
Built `src/audio.ts`: an `AudioSubscriber` is a function `(events: RaceEvent[]) => AudioCue[]`; `audioSubscribers` is an array of them, and `buildAudioCues()` flat-maps across all of them. v1 ships exactly one subscriber (`backgroundMusic`, ignores its `events` argument entirely since music just plays for the whole render). `RaceComposition` renders one Remotion `<Audio>` per cue, looped. Verified in a real render: the output MP4 has a full-length AAC audio track matching the video's total duration.

Since a real royalty-free track hasn't been sourced yet (see `help.md`), a **placeholder silent WAV** (`public/audio/background.wav`, 10s, generated via Python's stdlib `wave` module) stands in. Swapping in a real track later is a one-line change (`audio.ts`'s `backgroundMusic` subscriber's `src` field) - no restructuring needed.

**Correction after code review**: the "no restructuring needed for SFX later" claim is only fully true for *another whole-duration* audio source (e.g. a second background layer) - it does NOT yet hold for genuinely event-triggered SFX (a gate ding that should play *at* the moment of a `gate_pass` event, not from frame 0). `AudioCue` currently has no timing field, and `RaceComposition` renders every cue as an unconditional whole-composition `<Audio>` - a real gate-ding subscriber would compile and "integrate" with zero changes to `RaceComposition.tsx`, but the sound would incorrectly play from the very start of the video instead of at the gate-pass timestamp. Adding real per-event timing (converting `event.t` into a Remotion `<Sequence from={...}>` wrapper per cue) is a small but real addition needed before Stage 4+'s SFX actually lands correctly - noting this now so it isn't a surprise later.

## Open Questions — resolved
- **Music selection variability**: single fixed track for v1 (no randomization/selection UI). Revisit if/when multiple tracks are sourced.
- **Music licensing**: unresolved - still needs the user to actually source and confirm a real track (tracked in `help.md`). The current WAV is silent/placeholder, not a licensing risk itself.
- **Ducking around future SFX**: deferred to whenever SFX subscribers are actually added (Stage 4+ polish) - not needed for music-only v1.
