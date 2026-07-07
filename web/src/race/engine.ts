/**
 * Deterministic marble-race physics core (S2).
 *
 * Compiles a Level + RaceConfig into a Rapier2D world and steps it at a FIXED timestep.
 * Determinism (same seed => bit-identical frames) is what lets the live preview and the
 * exported MP4 be the same video, so every source of variation is pinned:
 *   - fixed world.timestep (never a wall-clock delta)
 *   - all randomness via a seeded PRNG (never Math.random)
 *   - fixed body/collider creation order
 *
 * Rapier's wasm must be initialised once (`await initPhysics()`) before constructing a Race.
 */
import RAPIER from "@dimforge/rapier2d-compat";
import type { Level } from "../level/types";
import type { RaceConfig } from "./config";
import type { MarbleState, RaceFrame } from "./types";
import { mulberry32, seededShuffle } from "./prng";

// --- Tunable physics constants (empirical; refined visually in S4). ---
export const GRAVITY_Y = 2000; // +y is downward in level space
export const FIXED_TIMESTEP = 1 / 60;
export const MARBLE_RESTITUTION = 0.25;
export const MARBLE_FRICTION = 0.1;
export const MARBLE_DENSITY = 1;
export const MARBLE_LINEAR_DAMPING = 0.04;
export const PEG_RESTITUTION = 0.4;
export const WALL_RESTITUTION = 0.15;
export const OBSTACLE_FRICTION = 0.1;
/** Hard safety cap so a stuck marble can never hang the sim (90s @ 60fps). */
export const DEFAULT_MAX_FRAMES = 60 * 90;

let initPromise: Promise<void> | null = null;
/** Idempotently initialise Rapier's wasm. Await once before building any Race. */
export function initPhysics(): Promise<void> {
  if (!initPromise) initPromise = RAPIER.init();
  return initPromise;
}

interface Marble {
  id: number;
  body: RAPIER.RigidBody | null; // nulled once finished + removed
  x: number;
  y: number;
  finished: boolean;
  rank: number | null;
  finishFrame: number | null;
}

export class Race {
  readonly level: Level;
  readonly config: RaceConfig;
  readonly maxFrames: number;

  private world: RAPIER.World;
  private marbles: Marble[] = [];
  private frameIndex = 0;
  private finishCount = 0;
  private lastLeaderId: number | null = null;
  private cameraTargetY = 0;

  constructor(level: Level, config: RaceConfig, maxFrames: number = DEFAULT_MAX_FRAMES) {
    this.level = level;
    this.config = config;
    this.maxFrames = maxFrames;

    this.world = new RAPIER.World({ x: 0, y: GRAVITY_Y });
    this.world.timestep = FIXED_TIMESTEP;

    this.buildStatics();
    this.spawnMarbles();
  }

  /** Walls (polylines) + pegs (circles), all on a single fixed body at the origin. */
  private buildStatics(): void {
    const staticBody = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());

    for (const wall of this.level.walls) {
      const verts = new Float32Array(wall.points.length * 2);
      for (let i = 0; i < wall.points.length; i++) {
        verts[i * 2] = wall.points[i][0];
        verts[i * 2 + 1] = wall.points[i][1];
      }
      const desc = RAPIER.ColliderDesc.polyline(verts)
        .setRestitution(WALL_RESTITUTION)
        .setFriction(OBSTACLE_FRICTION);
      this.world.createCollider(desc, staticBody);
    }

    for (const peg of this.level.pegs) {
      const desc = RAPIER.ColliderDesc.ball(peg.radius)
        .setTranslation(peg.x, peg.y)
        .setRestitution(PEG_RESTITUTION)
        .setFriction(OBSTACLE_FRICTION);
      this.world.createCollider(desc, staticBody);
    }
  }

  /** Place N marbles in a packed grid at the top of the spawn zone, seeded-jittered + shuffled. */
  private spawnMarbles(): void {
    const rng = mulberry32(this.config.seed);
    const r = this.level.marbleRadius;
    const diameter = r * 2;
    const spawn = this.level.spawn;

    const cols = Math.max(1, Math.floor(spawn.width / (diameter * 1.05)));
    const cellW = spawn.width / cols;
    const cellH = diameter * 1.1;

    // Build one slot per marble, packed row by row, then shuffle which id lands where
    // so no id gets a permanent positional advantage.
    const slots: { x: number; y: number }[] = [];
    for (let i = 0; i < this.config.ballCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const jitterX = (rng() - 0.5) * cellW * 0.3;
      const jitterY = (rng() - 0.5) * cellH * 0.3;
      slots.push({
        x: spawn.x + cellW * (col + 0.5) + jitterX,
        y: spawn.y + r + cellH * row + jitterY,
      });
    }
    seededShuffle(slots, rng);

    for (let id = 0; id < this.config.ballCount; id++) {
      const slot = slots[id];
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(slot.x, slot.y)
        .setCcdEnabled(true)
        .setLinearDamping(MARBLE_LINEAR_DAMPING);
      const body = this.world.createRigidBody(bodyDesc);
      const colliderDesc = RAPIER.ColliderDesc.ball(r)
        .setRestitution(MARBLE_RESTITUTION)
        .setFriction(MARBLE_FRICTION)
        .setDensity(MARBLE_DENSITY);
      this.world.createCollider(colliderDesc, body);
      this.marbles.push({
        id,
        body,
        x: slot.x,
        y: slot.y,
        finished: false,
        rank: null,
        finishFrame: null,
      });
    }
  }

  get complete(): boolean {
    return this.finishCount >= this.marbles.length || this.frameIndex >= this.maxFrames;
  }

  get frame(): number {
    return this.frameIndex;
  }

  /** Current state WITHOUT advancing — used to draw the starting grid before play begins. */
  current(): RaceFrame {
    return this.snapshot([]);
  }

  /** Advance exactly one fixed timestep and return the resulting frame state. */
  step(): RaceFrame {
    this.world.step();
    this.frameIndex++;

    const newlyFinished: number[] = [];
    // Collect finishers first (in stable id order), then rank by how far past the line they
    // crossed, so same-frame finishers get a deterministic, fair order.
    const crossedThisFrame: Marble[] = [];
    for (const m of this.marbles) {
      if (m.finished || !m.body) continue;
      const t = m.body.translation();
      m.x = t.x;
      m.y = t.y;
      if (m.y >= this.level.finishY) crossedThisFrame.push(m);
    }
    crossedThisFrame.sort((a, b) => (b.y - a.y) || (a.id - b.id));
    for (const m of crossedThisFrame) {
      m.finished = true;
      m.finishFrame = this.frameIndex;
      m.rank = ++this.finishCount;
      newlyFinished.push(m.id);
      if (m.body) {
        this.world.removeRigidBody(m.body);
        m.body = null;
      }
    }

    return this.snapshot(newlyFinished);
  }

  private snapshot(newlyFinished: number[]): RaceFrame {
    const marbles: MarbleState[] = this.marbles.map((m) => ({
      id: m.id,
      x: m.x,
      y: m.y,
      finished: m.finished,
      rank: m.rank,
    }));

    // Leader = furthest-down still-racing marble; drives the camera.
    let leaderId: number | null = null;
    let leaderY = -Infinity;
    for (const m of this.marbles) {
      if (m.finished) continue;
      if (m.y > leaderY) {
        leaderY = m.y;
        leaderId = m.id;
      }
    }
    if (leaderId === null) {
      leaderId = this.lastLeaderId;
      leaderY = this.level.finishY;
    } else {
      this.lastLeaderId = leaderId;
      // Only advance the camera target with the LIVE leader, and never backward.
      this.cameraTargetY = Math.max(this.cameraTargetY, leaderY);
    }

    return {
      frame: this.frameIndex,
      marbles,
      leaderId,
      leaderY,
      cameraTargetY: this.cameraTargetY,
      newlyFinished,
    };
  }

  /** Final finishing order (id, rank, finishFrame), ranked; unfinished excluded. */
  results(): { id: number; rank: number; finishFrame: number }[] {
    return this.marbles
      .filter((m) => m.finished && m.rank !== null && m.finishFrame !== null)
      .map((m) => ({ id: m.id, rank: m.rank as number, finishFrame: m.finishFrame as number }))
      .sort((a, b) => a.rank - b.rank);
  }

  /** Free the wasm-side world. Call when done with a Race instance. */
  dispose(): void {
    this.world.free();
  }
}

/** Convenience constructor mirroring the planned API. */
export function buildRace(level: Level, config: RaceConfig, maxFrames?: number): Race {
  return new Race(level, config, maxFrames);
}
