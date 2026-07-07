import { describe, it, expect } from "vitest";
import classicFunnel from "../../levels/classic-funnel.json";
import { parseLevel } from "../level/schema";
import { compileToLevel, levelToDoc, nextPieceId, type EditorDoc } from "./model";

function baseDoc(pieces: EditorDoc["pieces"]): EditorDoc {
  return {
    name: "Test",
    size: { width: 720, height: 3200 },
    marbleRadius: 32,
    spawn: { x: 60, y: 0, width: 600, height: 200 },
    finishY: 3100,
    pieces,
  };
}

describe("editor model", () => {
  it("compiles to a Level that passes Zod validation", () => {
    const doc = baseDoc([
      { type: "wall", id: nextPieceId("wall"), points: [[0, 0], [0, 3200]], thickness: 20 },
      { type: "peg", id: nextPieceId("peg"), x: 200, y: 500, radius: 22 },
    ]);
    const level = compileToLevel(doc);
    expect(() => parseLevel(level)).not.toThrow();
  });

  it("expands a peg-row into N pegs", () => {
    const doc = baseDoc([
      { type: "pegRow", id: nextPieceId("row"), x: 100, y: 400, count: 5, spacing: 120, radius: 20 },
    ]);
    const level = compileToLevel(doc);
    expect(level.pegs).toHaveLength(5);
    expect(level.pegs[0]).toEqual({ x: 100, y: 400, radius: 20 });
    expect(level.pegs[4]).toEqual({ x: 100 + 4 * 120, y: 400, radius: 20 });
  });

  it("expands a funnel into two angled walls narrowing to the gap", () => {
    const doc = baseDoc([
      { type: "funnel", id: nextPieceId("funnel"), x: 360, y: 1000, width: 500, gap: 120, height: 200 },
    ]);
    const level = compileToLevel(doc);
    expect(level.walls).toHaveLength(2);
    // Left wall goes from the outer edge (x - 250) down to the gap edge (x - 60).
    expect(level.walls[0].points[0]).toEqual([360 - 250, 1000]);
    expect(level.walls[0].points[1]).toEqual([360 - 60, 1200]);
    // Right wall mirrors it.
    expect(level.walls[1].points[0]).toEqual([360 + 250, 1000]);
    expect(level.walls[1].points[1]).toEqual([360 + 60, 1200]);
  });

  it("round-trips a Level -> EditorDoc -> Level preserving walls and pegs", () => {
    const level = parseLevel(classicFunnel);
    const doc = levelToDoc(level);
    const recompiled = compileToLevel(doc);
    expect(recompiled.walls).toEqual(level.walls);
    expect(recompiled.pegs).toEqual(level.pegs);
    expect(recompiled.spawn).toEqual(level.spawn);
    expect(recompiled.finishY).toBe(level.finishY);
  });

  it("produces unique piece ids", () => {
    const a = nextPieceId("p");
    const b = nextPieceId("p");
    expect(a).not.toBe(b);
  });
});
