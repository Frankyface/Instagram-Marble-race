/** The state of one marble at one frame. */
export interface MarbleState {
  id: number;
  x: number;
  y: number;
  /** True once the marble's center has crossed the finish line. */
  finished: boolean;
  /** 1-based finishing position, or null if not finished. */
  rank: number | null;
}

/** A single simulated frame: every marble's position plus this-frame events. */
export interface RaceFrame {
  frame: number;
  marbles: MarbleState[];
  /** The furthest-along still-racing marble (drives the camera). Null if all finished. */
  leaderId: number | null;
  leaderY: number;
  /**
   * Monotonic (non-decreasing) camera follow target in world-y. Tracks the deepest the
   * live leader has reached, so the camera never scrolls backward when a leader finishes.
   * Kept in the deterministic engine so preview and export frame identically.
   */
  cameraTargetY: number;
  /** Ids that crossed the finish line on this exact frame (for future SFX/events). */
  newlyFinished: number[];
}
