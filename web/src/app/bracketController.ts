/**
 * BracketController (S10) — plays a whole tournament in the canvas, match by match.
 *
 * It runs the deterministic `runBracket` plan up front, then replays each recorded match live
 * (a normal Race over that match's ball subset + seed), pausing briefly between matches. Because
 * each match reuses the recorded seed, the live outcome matches the plan. Ball colours stay tied
 * to the original ball id across rounds, so you can follow "your" marble through the bracket.
 */
import { initPhysics, buildRace, Race, FIXED_TIMESTEP } from "../race/engine";
import type { Level } from "../level/types";
import type { RaceFrame } from "../race/types";
import { render } from "../render/render";
import { generateBallColors } from "../render/colors";
import { runBracket, type BracketConfig, type BracketResult } from "../race/brackets";

const MAX_STEPS_PER_FRAME = 8;
const INTERMISSION_FRAMES = 66; // ~1.1s pause between matches

export interface BracketStatus {
  ready: boolean;
  phase: "playing" | "intermission" | "done";
  round: number;
  matchNumber: number; // 1-based across all matches
  totalMatches: number;
  isFinal: boolean;
  championId: number | null;
  championColor: string | null;
}

export class BracketController {
  private ctx: CanvasRenderingContext2D;
  private level: Level;
  private config: BracketConfig;

  private result: BracketResult | null = null;
  private globalColors: string[] = [];
  private race: Race | null = null;
  private matchColors: string[] = [];
  private lastFrame: RaceFrame | null = null;
  private matchPtr = 0;
  private intermission = 0;

  private rafId: number | null = null;
  private acc = 0;
  private lastTime = 0;
  private playing = false;
  private disposed = false;

  onStatus?: (status: BracketStatus) => void;

  constructor(canvas: HTMLCanvasElement, level: Level, config: BracketConfig) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
    this.level = level;
    this.config = config;
  }

  async init(): Promise<void> {
    await initPhysics();
    if (this.disposed) return;
    this.globalColors = generateBallColors(this.config.ballCount);
    this.result = runBracket(this.level, this.config);
    this.matchPtr = 0;
    this.startMatch(0);
    this.play();
  }

  private startMatch(ptr: number): void {
    if (!this.result) return;
    this.race?.dispose();
    const m = this.result.matches[ptr];
    this.matchColors = m.ballIds.map((id) => this.globalColors[id]);
    this.race = buildRace(this.level, { ballCount: m.ballIds.length, seed: m.seed });
    this.lastFrame = this.race.current();
    this.acc = 0;
    this.draw();
    this.emit("playing");
  }

  play(): void {
    if (this.playing || this.disposed || !this.result) return;
    this.playing = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  pause(): void {
    this.playing = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  private loop = (now: number): void => {
    if (!this.playing || !this.race || !this.result) return;

    if (this.intermission > 0) {
      this.intermission -= 1;
      this.emit("intermission");
      if (this.intermission === 0) {
        this.matchPtr += 1;
        if (this.matchPtr >= this.result.matches.length) {
          this.finish();
          return;
        }
        this.startMatch(this.matchPtr);
      }
      this.rafId = requestAnimationFrame(this.loop);
      return;
    }

    const dt = Math.min((now - this.lastTime) / 1000, 0.25);
    this.lastTime = now;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= FIXED_TIMESTEP && steps < MAX_STEPS_PER_FRAME && !this.race.complete) {
      this.lastFrame = this.race.step();
      this.acc -= FIXED_TIMESTEP;
      steps += 1;
    }
    this.draw();
    this.emit("playing");

    if (this.race.complete) this.intermission = INTERMISSION_FRAMES;
    this.rafId = requestAnimationFrame(this.loop);
  };

  private finish(): void {
    this.playing = false;
    this.rafId = null;
    this.emit("done");
  }

  private draw(): void {
    if (!this.lastFrame) return;
    render(this.ctx, this.level, this.lastFrame, {
      width: this.ctx.canvas.width,
      height: this.ctx.canvas.height,
      colors: this.matchColors,
    });
  }

  private emit(phase: BracketStatus["phase"]): void {
    if (!this.onStatus || !this.result) return;
    const m = this.result.matches[Math.min(this.matchPtr, this.result.matches.length - 1)];
    const done = phase === "done";
    this.onStatus({
      ready: true,
      phase,
      round: m.round,
      matchNumber: this.matchPtr + 1,
      totalMatches: this.result.matches.length,
      isFinal: m.isFinal,
      championId: done ? this.result.championId : null,
      championColor: done ? this.globalColors[this.result.championId] ?? null : null,
    });
  }

  dispose(): void {
    this.disposed = true;
    this.playing = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.race?.dispose();
    this.race = null;
  }
}
