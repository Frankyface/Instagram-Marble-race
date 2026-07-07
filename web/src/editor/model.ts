/**
 * Editor model (S6). The editor's source of truth is an `EditorDoc` of high-level PIECES
 * (walls, single pegs, peg-rows, funnels) plus spawn/finish/size. `compileToLevel` expands
 * those pieces down to the flat `walls`/`pegs` primitives the physics engine understands, so
 * the editor never simulates and there is a single source of truth: EditorDoc -> Level -> sim.
 */
import type { Level, Wall, Peg, Gate, Spinner, Bumper, Box, SpawnZone } from "../level/types";
import { LEVEL_SCHEMA_VERSION } from "../level/types";

export type EditorPiece =
  | { type: "wall"; id: string; points: [number, number][]; thickness: number }
  | { type: "peg"; id: string; x: number; y: number; radius: number }
  | { type: "pegRow"; id: string; x: number; y: number; count: number; spacing: number; radius: number }
  | { type: "funnel"; id: string; x: number; y: number; width: number; gap: number; height: number }
  | { type: "gate"; id: string; y: number; quota: number }
  | { type: "spinner"; id: string; x: number; y: number; radius: number; arms: number; armWidth: number; speed: number }
  | { type: "bumper"; id: string; x: number; y: number; radius: number }
  | { type: "box"; id: string; x: number; y: number; width: number; height: number; angle: number };

export interface EditorDoc {
  name: string;
  size: { width: number; height: number };
  marbleRadius: number;
  spawn: SpawnZone;
  finishY: number;
  pieces: EditorPiece[];
}

let idCounter = 0;
/** Session-unique id for a piece (used for React keys + selection; not sim-relevant). */
export function nextPieceId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export const FUNNEL_WALL_THICKNESS = 18;

/** Expand a single piece to the wall/peg primitives it represents. */
function expandPiece(piece: EditorPiece, walls: Wall[], pegs: Peg[]): void {
  switch (piece.type) {
    case "wall":
      walls.push({ points: piece.points.map((p) => [p[0], p[1]]), thickness: piece.thickness });
      break;
    case "peg":
      pegs.push({ x: piece.x, y: piece.y, radius: piece.radius });
      break;
    case "pegRow":
      for (let i = 0; i < piece.count; i++) {
        pegs.push({ x: piece.x + i * piece.spacing, y: piece.y, radius: piece.radius });
      }
      break;
    case "funnel": {
      const halfW = piece.width / 2;
      const halfGap = piece.gap / 2;
      const bottom = piece.y + piece.height;
      walls.push({
        points: [
          [piece.x - halfW, piece.y],
          [piece.x - halfGap, bottom],
        ],
        thickness: FUNNEL_WALL_THICKNESS,
      });
      walls.push({
        points: [
          [piece.x + halfW, piece.y],
          [piece.x + halfGap, bottom],
        ],
        thickness: FUNNEL_WALL_THICKNESS,
      });
      break;
    }
    case "gate":
    case "spinner":
    case "bumper":
    case "box":
      // These map to their own Level arrays — handled in compileToLevel, not here.
      break;
  }
}

/** Compile the editor document to a runnable Level (still needs Zod validation before use). */
export function compileToLevel(doc: EditorDoc): Level {
  const walls: Wall[] = [];
  const pegs: Peg[] = [];
  const gates: Gate[] = [];
  const spinners: Spinner[] = [];
  const bumpers: Bumper[] = [];
  const boxes: Box[] = [];
  for (const piece of doc.pieces) {
    if (piece.type === "gate") {
      gates.push({ y: piece.y, quota: piece.quota });
    } else if (piece.type === "spinner") {
      spinners.push({
        x: piece.x,
        y: piece.y,
        radius: piece.radius,
        arms: piece.arms,
        armWidth: piece.armWidth,
        speed: piece.speed,
      });
    } else if (piece.type === "bumper") {
      bumpers.push({ x: piece.x, y: piece.y, radius: piece.radius });
    } else if (piece.type === "box") {
      boxes.push({ x: piece.x, y: piece.y, width: piece.width, height: piece.height, angle: piece.angle });
    } else {
      expandPiece(piece, walls, pegs);
    }
  }
  return {
    schemaVersion: LEVEL_SCHEMA_VERSION,
    name: doc.name,
    size: { width: doc.size.width, height: doc.size.height },
    marbleRadius: doc.marbleRadius,
    spawn: { ...doc.spawn },
    finishY: doc.finishY,
    walls,
    pegs,
    gates,
    spinners,
    bumpers,
    boxes,
  };
}

/** Import an existing Level into the editor (walls/pegs become individual pieces). */
export function levelToDoc(level: Level): EditorDoc {
  const pieces: EditorPiece[] = [
    ...level.walls.map<EditorPiece>((w) => ({
      type: "wall",
      id: nextPieceId("wall"),
      points: w.points.map((p) => [p[0], p[1]] as [number, number]),
      thickness: w.thickness,
    })),
    ...level.pegs.map<EditorPiece>((p) => ({
      type: "peg",
      id: nextPieceId("peg"),
      x: p.x,
      y: p.y,
      radius: p.radius,
    })),
    ...(level.gates ?? []).map<EditorPiece>((g) => ({
      type: "gate",
      id: nextPieceId("gate"),
      y: g.y,
      quota: g.quota,
    })),
    ...(level.spinners ?? []).map<EditorPiece>((s) => ({
      type: "spinner",
      id: nextPieceId("spinner"),
      x: s.x,
      y: s.y,
      radius: s.radius,
      arms: s.arms,
      armWidth: s.armWidth,
      speed: s.speed,
    })),
    ...(level.bumpers ?? []).map<EditorPiece>((b) => ({
      type: "bumper",
      id: nextPieceId("bumper"),
      x: b.x,
      y: b.y,
      radius: b.radius,
    })),
    ...(level.boxes ?? []).map<EditorPiece>((b) => ({
      type: "box",
      id: nextPieceId("box"),
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      angle: b.angle,
    })),
  ];
  return {
    name: level.name,
    size: { ...level.size },
    marbleRadius: level.marbleRadius,
    spawn: { ...level.spawn },
    finishY: level.finishY,
    pieces,
  };
}
