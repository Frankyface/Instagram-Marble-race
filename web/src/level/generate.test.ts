import { describe, it, expect } from "vitest";
import { parseLevel } from "./schema";
import { generateLevel } from "./generate";

describe("generateLevel", () => {
  it("produces a valid, Zod-passing level for many seeds", () => {
    for (const seed of [0, 1, 42, 1000, 999999]) {
      expect(() => parseLevel(generateLevel(seed))).not.toThrow();
    }
  });

  it("is deterministic for a given seed", () => {
    expect(generateLevel(7)).toEqual(generateLevel(7));
  });

  it("varies across seeds", () => {
    expect(generateLevel(1)).not.toEqual(generateLevel(2));
  });

  it("always keeps the side walls, spawn at top, and finish above the floor", () => {
    const lvl = generateLevel(99);
    expect(lvl.walls.length).toBeGreaterThanOrEqual(2);
    expect(lvl.spawn.y).toBe(0);
    expect(lvl.finishY).toBeLessThan(lvl.size.height);
    expect(lvl.finishY).toBeGreaterThan(lvl.spawn.height);
  });
});
