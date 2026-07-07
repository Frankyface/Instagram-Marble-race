import { describe, it, expect, beforeAll } from "vitest";
import classicFunnel from "../../levels/classic-funnel.json";
import { parseLevel } from "../level/schema";
import type { Level } from "../level/types";
import type { RaceConfig } from "./config";
import { buildRace, initPhysics, DEFAULT_MAX_FRAMES } from "./engine";

let level: Level;

beforeAll(async () => {
  await initPhysics();
  level = parseLevel(classicFunnel);
});

/** Run a full race and return every frame flattened to [x0,y0,x1,y1,...] plus summary. */
function runFull(config: RaceConfig, maxFrames = DEFAULT_MAX_FRAMES) {
  const race = buildRace(level, config, maxFrames);
  const frames: number[][] = [];
  while (!race.complete) {
    const f = race.step();
    const flat: number[] = [];
    for (const m of f.marbles) {
      flat.push(m.x, m.y);
    }
    frames.push(flat);
  }
  const result = {
    frames,
    frameCount: race.frame,
    finished: race.results().length,
    winner: race.results()[0]?.id ?? null,
  };
  race.dispose();
  return result;
}

describe("Race engine determinism", () => {
  it(
    "produces bit-identical frames for the same (level, seed)",
    () => {
      const config: RaceConfig = { ballCount: 16, seed: 12345 };
      const a = runFull(config);
      const b = runFull(config);
      expect(a.frameCount).toBe(b.frameCount);
      expect(a.frames).toEqual(b.frames); // exact float equality, frame by frame
    },
    20000,
  );

  it(
    "produces a different race for a different seed",
    () => {
      const a = runFull({ ballCount: 16, seed: 1 });
      const b = runFull({ ballCount: 16, seed: 2 });
      expect(a.frames).not.toEqual(b.frames);
    },
    20000,
  );
});

describe("Race engine finishability", () => {
  it(
    "terminates within the frame cap and marbles reach the finish line",
    () => {
      const r = runFull({ ballCount: 16, seed: 7 });
      expect(r.frameCount).toBeLessThan(DEFAULT_MAX_FRAMES);
      expect(r.finished).toBeGreaterThanOrEqual(1);
      expect(r.winner).not.toBeNull();
      // Well-formed track: nearly all marbles should finish (regression guard on tuning/geometry).
      // Deterministic seed => exact count; observed 16/16 for seed 7.
      expect(r.finished).toBeGreaterThanOrEqual(12);
    },
    20000,
  );

  it(
    "supports a large field (48 balls) without hanging",
    () => {
      const r = runFull({ ballCount: 48, seed: 3 });
      expect(r.frameCount).toBeLessThanOrEqual(DEFAULT_MAX_FRAMES);
      // Observed 48/48 for seed 3; guard against a large-field regression.
      expect(r.finished).toBeGreaterThanOrEqual(36);
    },
    30000,
  );
});
