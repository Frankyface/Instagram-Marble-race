import { describe, it, expect, beforeAll } from "vitest";
import classicFunnel from "../../levels/classic-funnel.json";
import { parseLevel } from "../level/schema";
import type { Level } from "../level/types";
import { initPhysics } from "./engine";
import { runBracket, type BracketConfig } from "./brackets";

let level: Level;

beforeAll(async () => {
  await initPhysics();
  level = parseLevel(classicFunnel);
});

const CONFIG: BracketConfig = { ballCount: 16, seed: 1, groupSize: 4, advancePerGroup: 1 };

describe("runBracket", () => {
  it(
    "reduces the field round by round to a single champion",
    () => {
      const r = runBracket(level, CONFIG);
      // 16 -> groups of 4 -> 4 matches (1 advances each) -> 4 finalists -> 1 final = 5 matches.
      expect(r.matches.filter((m) => m.round === 1)).toHaveLength(4);
      expect(r.matches.filter((m) => m.isFinal)).toHaveLength(1);
      const final = r.matches.find((m) => m.isFinal)!;
      expect(final.ballIds).toHaveLength(4); // the 4 group winners
      expect(final.ballIds).toContain(r.championId);
      expect(r.championId).toBeGreaterThanOrEqual(0);
      expect(r.championId).toBeLessThan(16);
    },
    30000,
  );

  it(
    "covers every ball exactly once in round 1",
    () => {
      const r = runBracket(level, CONFIG);
      const round1Ids = r.matches.filter((m) => m.round === 1).flatMap((m) => m.ballIds);
      expect(round1Ids.slice().sort((a, b) => a - b)).toEqual(
        Array.from({ length: 16 }, (_, i) => i),
      );
    },
    30000,
  );

  it(
    "is deterministic — same config yields the same champion and match plan",
    () => {
      const a = runBracket(level, CONFIG);
      const b = runBracket(level, CONFIG);
      expect(a.championId).toBe(b.championId);
      expect(a.matches.map((m) => m.resultIds)).toEqual(b.matches.map((m) => m.resultIds));
    },
    30000,
  );

  it(
    "advances exactly advancePerGroup finishers from each non-final match",
    () => {
      const r = runBracket(level, { ballCount: 16, seed: 9, groupSize: 4, advancePerGroup: 2 });
      for (const m of r.matches) {
        if (!m.isFinal) expect(m.advancingIds.length).toBe(Math.min(2, m.ballIds.length));
      }
    },
    30000,
  );
});
