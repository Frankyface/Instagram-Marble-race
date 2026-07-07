/**
 * The ONE render path (S3). A single pure function draws a race frame onto a Canvas 2D
 * context. It is used unchanged by BOTH the live preview loop (S4) and the offline MP4 export
 * loop (S5) — so what you export is exactly what you previewed. Every size is expressed in
 * world units multiplied by the camera scale; there are no raw pixel literals, so the same
 * frame renders identically at any canvas resolution.
 */
import type { Level } from "../level/types";
import type { RaceFrame } from "../race/types";
import { FIXED_TIMESTEP } from "../race/engine";
import { getCameraTransform } from "./camera";

export interface RenderOptions {
  /** canvas width in pixels */
  width: number;
  /** canvas height in pixels */
  height: number;
  /** per-ball CSS colour, indexed by marble id */
  colors: string[];
  background?: string;
  wallColor?: string;
  pegColor?: string;
  finishColor?: string;
  gateColor?: string;
  spinnerColor?: string;
  bumperColor?: string;
  boxColor?: string;
}

const DEFAULT_BG = "#0f1115";
const DEFAULT_WALL = "#4a5169";
const DEFAULT_PEG = "#727a94";
const DEFAULT_FINISH = "#ffd34d";
const DEFAULT_GATE = "#ff8c42";
const DEFAULT_SPINNER = "#9d84e0";
const DEFAULT_BUMPER = "#ff5c8a";
const DEFAULT_BOX = "#626b82";
const FALLBACK_BALL = "#cccccc";

// World-space line thicknesses (× scale at draw time -> resolution independent).
const FINISH_LINE_WORLD_THICKNESS = 5;
const GATE_LINE_WORLD_THICKNESS = 4;
const BALL_OUTLINE_FRACTION = 0.08; // of ball radius

/** Either an on-screen (preview) or off-screen (export) 2D context — same draw API. */
export type Render2DContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function render(
  ctx: Render2DContext,
  level: Level,
  frame: RaceFrame,
  opts: RenderOptions,
): void {
  const { width, height } = opts;
  const cam = getCameraTransform(level, frame.cameraTargetY, width, height);
  const sx = cam.worldToScreenX;
  const sy = cam.worldToScreenY;

  // Background
  ctx.fillStyle = opts.background ?? DEFAULT_BG;
  ctx.fillRect(0, 0, width, height);

  // Walls (thick round-capped polylines)
  ctx.strokeStyle = opts.wallColor ?? DEFAULT_WALL;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const wall of level.walls) {
    if (wall.points.length < 2) continue;
    ctx.beginPath();
    ctx.lineWidth = wall.thickness * cam.scale;
    ctx.moveTo(sx(wall.points[0][0]), sy(wall.points[0][1]));
    for (let i = 1; i < wall.points.length; i++) {
      ctx.lineTo(sx(wall.points[i][0]), sy(wall.points[i][1]));
    }
    ctx.stroke();
  }

  // Finish line (dashed, across the full width)
  const finishScreenY = sy(level.finishY);
  ctx.save();
  ctx.strokeStyle = opts.finishColor ?? DEFAULT_FINISH;
  ctx.lineWidth = FINISH_LINE_WORLD_THICKNESS * cam.scale;
  ctx.setLineDash([18 * cam.scale, 14 * cam.scale]);
  ctx.beginPath();
  ctx.moveTo(0, finishScreenY);
  ctx.lineTo(width, finishScreenY);
  ctx.stroke();
  ctx.restore();

  // Elimination gates (orange dashed lines across the width)
  if (level.gates && level.gates.length > 0) {
    ctx.save();
    ctx.strokeStyle = opts.gateColor ?? DEFAULT_GATE;
    ctx.lineWidth = GATE_LINE_WORLD_THICKNESS * cam.scale;
    ctx.setLineDash([10 * cam.scale, 8 * cam.scale]);
    for (const gate of level.gates) {
      const gy = sy(gate.y);
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Pegs
  ctx.fillStyle = opts.pegColor ?? DEFAULT_PEG;
  for (const peg of level.pegs) {
    ctx.beginPath();
    ctx.arc(sx(peg.x), sy(peg.y), peg.radius * cam.scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // Boxes (solid rotatable blocks)
  if (level.boxes && level.boxes.length > 0) {
    ctx.fillStyle = opts.boxColor ?? DEFAULT_BOX;
    for (const box of level.boxes) {
      ctx.save();
      ctx.translate(sx(box.x), sy(box.y));
      ctx.rotate(box.angle);
      const w = box.width * cam.scale;
      const h = box.height * cam.scale;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }

  // Bumpers (bouncy — bright inner ring)
  if (level.bumpers && level.bumpers.length > 0) {
    for (const bumper of level.bumpers) {
      const r = bumper.radius * cam.scale;
      const bxs = sx(bumper.x);
      const bys = sy(bumper.y);
      ctx.beginPath();
      ctx.fillStyle = opts.bumperColor ?? DEFAULT_BUMPER;
      ctx.arc(bxs, bys, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,255,255,0.65)";
      ctx.lineWidth = Math.max(1, r * 0.16);
      ctx.arc(bxs, bys, r * 0.58, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Spinners (rotating pinwheels — angle derived from the frame so preview == export)
  if (level.spinners && level.spinners.length > 0) {
    ctx.fillStyle = opts.spinnerColor ?? DEFAULT_SPINNER;
    for (const spin of level.spinners) {
      const angle = frame.frame * spin.speed * FIXED_TIMESTEP;
      const armLen = spin.radius * cam.scale;
      const armW = spin.armWidth * cam.scale;
      ctx.save();
      ctx.translate(sx(spin.x), sy(spin.y));
      const armCount = Math.max(1, Math.floor(spin.arms));
      for (let i = 0; i < armCount; i++) {
        ctx.save();
        ctx.rotate(angle + (Math.PI * 2 * i) / armCount);
        ctx.fillRect(0, -armW, armLen, armW * 2);
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, armW * 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Marbles
  const ballRadius = level.marbleRadius * cam.scale;
  const outline = Math.max(1, ballRadius * BALL_OUTLINE_FRACTION);
  for (const m of frame.marbles) {
    if (m.eliminated) continue; // knocked out at a gate -> no longer drawn
    const color = opts.colors[m.id] ?? FALLBACK_BALL;
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(sx(m.x), sy(m.y), ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = outline;
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.stroke();
  }
}
