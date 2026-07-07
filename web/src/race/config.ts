/**
 * RaceConfig — the per-run inputs that are NOT part of the (colour-agnostic) Level.
 * Ball count, seed, and colours live here so the same Level can be raced many ways.
 */
export interface RaceConfig {
  /** Number of marbles to race. */
  ballCount: number;
  /** Seed for all randomness (spawn jitter + slot shuffle). Same seed => same race. */
  seed: number;
  /** Optional per-ball CSS colours (id-indexed). Generated in S4 if absent. */
  colors?: string[];
}

export const DEFAULT_BALL_COUNT = 16;
export const MIN_BALL_COUNT = 2;
export const MAX_BALL_COUNT = 64;
