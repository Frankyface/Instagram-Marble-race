/**
 * The shared "Level" format — the keystone of the web app (Stage 6).
 *
 * The editor writes this, the JS physics engine (planck.js) simulates it, and the
 * renderer draws it. High-level pieces (funnels, peg-grids) are authored in the
 * editor and compiled down to the `walls`/`pegs` primitives the physics understands.
 *
 * y increases downward (matches the engine, canvas, and video conventions).
 * See staging/stage-6-web-editor-app/feature-level-format.md for the spec + open questions.
 */

export const LEVEL_SCHEMA_VERSION = 1;

export type Vec2 = { x: number; y: number };

/** A static wall as a polyline of world-space points with a stroke thickness. */
export type Wall = {
  points: [number, number][];
  thickness: number;
};

/** A static circular peg (Pachinko-style obstacle). */
export type Peg = {
  x: number;
  y: number;
  radius: number;
};

/** Where marbles drop in at the start (they spawn spread across this box). */
export type SpawnZone = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Reserved for elimination mode: only `quota` marbles pass this y-line before the
 * race cuts to a new panel. Optional in v1 — present in the schema, not yet simulated.
 */
export type Gate = {
  y: number;
  quota: number;
};

/**
 * A rotating "pinwheel" obstacle: a kinematic body at (x,y) with `arms` radial paddles that
 * spin at `speed` radians/second. Deterministic — its angle is a pure function of the frame.
 */
export type Spinner = {
  x: number;
  y: number;
  /** Arm length from the centre (world units). */
  radius: number;
  /** Number of radial arms. */
  arms: number;
  /** Half-thickness of each arm (world units). */
  armWidth: number;
  /** Rotation speed in radians per second (may be negative to reverse). */
  speed: number;
};

export type Level = {
  schemaVersion: number;
  name: string;
  size: { width: number; height: number };
  /** Marble radius in world units; the renderer scales the whole world to 1080 wide. */
  marbleRadius: number;
  spawn: SpawnZone;
  /** First marble whose center crosses this y wins ("first person down"). */
  finishY: number;
  walls: Wall[];
  pegs: Peg[];
  gates?: Gate[];
  spinners?: Spinner[];
};
