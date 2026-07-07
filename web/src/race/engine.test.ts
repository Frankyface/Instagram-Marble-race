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
function runFull(config: RaceConfig, maxFrames = DEFAULT_MAX_FRAMES, lvl: Level = level) {
  const race = buildRace(lvl, config, maxFrames);
  const frames: number[][] = [];
  let last: ReturnType<typeof race.step> | null = null;
  while (!race.complete) {
    const f = race.step();
    last = f;
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
    eliminated: last ? last.marbles.filter((m) => m.eliminated).length : 0,
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

describe("Race engine elimination gates", () => {
  it(
    "knocks out non-qualifiers at a survival gate, deterministically",
    () => {
      const gated: Level = { ...level, gates: [{ y: 1000, quota: 6 }] };
      const a = runFull({ ballCount: 16, seed: 7 }, DEFAULT_MAX_FRAMES, gated);
      const b = runFull({ ballCount: 16, seed: 7 }, DEFAULT_MAX_FRAMES, gated);
      expect(a.eliminated).toBeGreaterThan(0); // the gate closed on stragglers
      expect(a.finished).toBeLessThan(16); // not everyone got through
      expect(a.finished).toBeGreaterThanOrEqual(1); // someone still won
      expect(a.frames).toEqual(b.frames); // elimination stays deterministic
    },
    20000,
  );

  it(
    "with no gates, nobody is eliminated (unchanged single-race behaviour)",
    () => {
      const r = runFull({ ballCount: 16, seed: 7 });
      expect(r.eliminated).toBe(0);
    },
    20000,
  );
});
