import { describe, it, expect } from "vitest";
import classicFunnel from "../../levels/classic-funnel.json";
import { LevelSchema, parseLevel, safeParseLevel } from "./schema";
import { LEVEL_SCHEMA_VERSION } from "./types";

describe("LevelSchema", () => {
  it("validates the bundled classic-funnel sample level", () => {
    const level = parseLevel(classicFunnel);
    expect(level.name).toBe("Classic Funnel");
    expect(level.schemaVersion).toBe(LEVEL_SCHEMA_VERSION);
    expect(level.walls.length).toBeGreaterThan(0);
    expect(level.pegs.length).toBeGreaterThan(0);
  });

  it("round-trips parse -> serialize -> parse without loss", () => {
    const parsed = parseLevel(classicFunnel);
    const roundTripped = parseLevel(JSON.parse(JSON.stringify(parsed)));
    expect(roundTripped).toEqual(parsed);
    // parse strips nothing the fixture actually has, so it should equal the source.
    expect(parsed).toEqual(classicFunnel);
  });

  it("rejects a level missing finishY", () => {
    const { finishY, ...bad } = classicFunnel as Record<string, unknown>;
    void finishY;
    expect(safeParseLevel(bad).success).toBe(false);
  });

  it("rejects a non-positive marble radius", () => {
    const bad = { ...classicFunnel, marbleRadius: 0 };
    expect(safeParseLevel(bad).success).toBe(false);
  });

  it("rejects a wall with fewer than two points", () => {
    const bad = { ...classicFunnel, walls: [{ points: [[0, 0]], thickness: 20 }] };
    expect(safeParseLevel(bad).success).toBe(false);
  });

  it("rejects an unknown schemaVersion", () => {
    const bad = { ...classicFunnel, schemaVersion: 99 };
    expect(safeParseLevel(bad).success).toBe(false);
  });

  it("accepts a level with an omitted optional gates array", () => {
    const { gates, ...noGates } = classicFunnel as Record<string, unknown>;
    void gates;
    expect(safeParseLevel(noGates).success).toBe(true);
  });

  it("exposes the schema for reuse", () => {
    expect(LevelSchema).toBeDefined();
  });
});
