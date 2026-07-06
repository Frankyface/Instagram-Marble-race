/**
 * Mirrors the race-manifest JSON schema produced by the Python engine
 * (see engine/raceengine/manifest.py). Keep in sync manually for now -
 * see staging/stage-1-core-engine/feature-event-system.md's "shared schema
 * validation" open question for when this should become generated/enforced.
 */

// Kept in sync by hand with scripts/render.mjs's own copy of this constant -
// see the comment there for why it isn't a single shared import.
export const SUPPORTED_SCHEMA_VERSION = 2;

export type Obstacle = {
  x: number;
  y: number;
  radius: number;
};

export type TrackInfo = {
  width: number;
  length: number;
  wallThickness: number;
  marbleRadius: number;
  obstacles: Obstacle[];
};

export type Racer = {
  id: string;
  username: string;
  avatarPath: string;
};

export type FramePosition = {
  id: string;
  x: number;
  y: number;
};

export type Frame = {
  t: number;
  positions: FramePosition[];
};

export type RaceEventType =
  | 'marble_finish'
  | 'race_complete'
  | 'collision'
  | 'gate_pass'
  | 'panel_reset';

export type RaceEvent = {
  t: number;
  type: RaceEventType;
  payload: Record<string, unknown>;
};

export type Placement = {
  id: string;
  place: number;
};

export type RaceManifest = {
  schemaVersion: number;
  raceId: string;
  seed: number;
  fps: number;
  track: TrackInfo;
  racers: Racer[];
  frames: Frame[];
  events: RaceEvent[];
  results: Placement[];
};
