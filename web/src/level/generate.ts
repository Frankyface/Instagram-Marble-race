/**
 * Procedural level generator — turns a seed into a custom, finishable race course.
 *
 * Walks down the track in bands, dropping a random obstacle in each (peg rows, funnels,
 * spinners, bumpers, boxes, angled deflectors) using a seeded PRNG, so the same seed always
 * produces the same course (shareable/reproducible). Obstacles are kept partial / gapped so
 * the channel is never fully blocked and marbles can always reach the finish.
 */
import type { Level, Wall, Peg, Spinner, Bumper, Box } from "./types";
import { LEVEL_SCHEMA_VERSION } from "./types";
import { mulberry32 } from "../race/prng";

const WIDTH = 720;

export function generateLevel(seed: number): Level {
  const rng = mulberry32(seed >>> 0);
  const range = (min: number, max: number): number => min + rng() * (max - min);
  const rint = (min: number, max: number): number => Math.floor(range(min, max + 1));
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  const height = rint(3200, 4400);
  const finishY = height - 140;

  const walls: Wall[] = [
    { points: [[0, 0], [0, height]], thickness: 20 },
    { points: [[WIDTH, 0], [WIDTH, height]], thickness: 20 },
  ];
  const pegs: Peg[] = [];
  const spinners: Spinner[] = [];
  const bumpers: Bumper[] = [];
  const boxes: Box[] = [];

  const kinds = ["pegRow", "pegRow", "funnel", "spinner", "bumpers", "box", "angledWall"];
  let y = 500;
  const bandEnd = finishY - 300;
  while (y < bandEnd) {
    switch (pick(kinds)) {
      case "pegRow": {
        const count = rint(3, 6);
        const spacing = WIDTH / (count + 1);
        const r = rint(18, 26);
        const offset = range(-spacing * 0.3, spacing * 0.3);
        for (let i = 0; i < count; i++) pegs.push({ x: spacing * (i + 1) + offset, y, radius: r });
        break;
      }
      case "funnel": {
        const gap = rint(110, 180);
        const fw = rint(420, 620);
        const fh = rint(180, 260);
        const cx = WIDTH / 2 + range(-60, 60);
        walls.push({ points: [[cx - fw / 2, y], [cx - gap / 2, y + fh]], thickness: 18 });
        walls.push({ points: [[cx + fw / 2, y], [cx + gap / 2, y + fh]], thickness: 18 });
        y += fh;
        break;
      }
      case "spinner": {
        spinners.push({
          x: WIDTH / 2 + range(-120, 120),
          y,
          radius: rint(110, 190),
          arms: rint(2, 5),
          armWidth: rint(12, 20),
          speed: pick([1, -1]) * range(1.5, 4),
        });
        break;
      }
      case "bumpers": {
        const n = rint(2, 4);
        for (let i = 0; i < n; i++) {
          bumpers.push({ x: range(130, WIDTH - 130), y: y + range(-40, 40), radius: rint(24, 38) });
        }
        break;
      }
      case "box": {
        boxes.push({
          x: range(190, WIDTH - 190),
          y,
          width: rint(160, 300),
          height: rint(28, 46),
          angle: pick([1, -1]) * range(0.2, 0.6),
        });
        break;
      }
      case "angledWall": {
        const len = range(WIDTH * 0.4, WIDTH * 0.58);
        const drop = range(120, 200);
        if (rng() < 0.5) walls.push({ points: [[0, y], [len, y + drop]], thickness: 18 });
        else walls.push({ points: [[WIDTH, y], [WIDTH - len, y + drop]], thickness: 18 });
        y += drop * 0.5;
        break;
      }
    }
    y += rint(320, 480);
  }

  return {
    schemaVersion: LEVEL_SCHEMA_VERSION,
    name: `Random #${seed}`,
    size: { width: WIDTH, height },
    marbleRadius: 30,
    spawn: { x: 60, y: 0, width: WIDTH - 120, height: 220 },
    finishY,
    walls,
    pegs,
    gates: [],
    spinners,
    bumpers,
    boxes,
  };
}
