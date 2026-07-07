/**
 * RaceController (S4) — drives the LIVE preview: owns a Race, a canvas 2D context, the ball
 * colours, and a requestAnimationFrame loop with a fixed-timestep accumulator.
 *
 * The accumulator decouples the fixed 1/60 physics step from the display refresh rate, so the
 * race runs at the same speed on a 60Hz or 144Hz screen. It calls the SAME `render()` the MP4
 * export (S5) uses, so preview and export are the same picture.
 */
import { initPhysics, buildRace, Race, FIXED_TIMESTEP } from "../race/engine";
import type { Level } from "../level/types";
import type { RaceConfig } from "../race/config";
import type { RaceFrame } from "../race/types";
import { render } from "../render/render";
import { generateBallColors } from "../render/colors";

const MAX_STEPS_PER_FRAME = 8; // clamp so a slow frame can't spiral the sim

export interface RaceStatus {
  ready: boolean;
  playing: boolean;
  complete: boolean;
  frame: number;
  finished: number;
  total: number;
}

export class RaceController {
  private ctx: CanvasRenderingContext2D;
  private level: Level;
  private ballCount: number;
  private seed: number;

  private race: Race | null = null;
  private colors: string[] = [];
  private lastFrame: RaceFrame | null = null;
  private rafId: number | null = null;
  private acc = 0;
  private lastTime = 0;
  private playing = false;
  private disposed = false;

  onStatus?: (status: RaceStatus) => void;

  constructor(canvas: HTMLCanvasElement, level: Level, ballCount: number, seed: number) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
    this.level = level;
    this.ballCount = ballCount;
    this.seed = seed;
  }

  /** Initialise Rapier's wasm, build the first race, and start playing. */
  async init(): Promise<void> {
    await initPhysics();
    if (this.disposed) return;
    this.rebuild();
    this.play();
  }

  private rebuild(): void {
    this.race?.dispose();
    this.colors = generateBallColors(this.ballCount);
    this.race = buildRace(this.level, {
      ballCount: this.ballCount,
      seed: this.seed,
      colors: this.colors,
    });
    this.lastFrame = this.race.current();
    this.acc = 0;
    this.draw();
    this.emit();
  }

  setBallCount(count: number): void {
    if (count === this.ballCount) return;
    this.ballCount = count;
    if (this.race) {
      this.rebuild();
      this.play();
    }
  }

  /** Replay the same race (same seed) from the start. */
  restart(): void {
    if (!this.race) return;
    this.rebuild();
    this.play();
  }

  /** Roll a new seed -> a different race outcome on the same level. */
  shuffle(): void {
    this.seed = (this.seed + 0x9e3779b1) | 0;
    if (this.race) {
      this.rebuild();
      this.play();
    }
  }

  play(): void {
    if (this.playing || this.disposed || !this.race || this.race.complete) return;
    this.playing = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
    this.emit();
  }

  pause(): void {
    this.playing = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.emit();
  }

  togglePlay(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  /** Config for the CURRENTLY-shown race, so an export reproduces exactly what's previewed. */
  exportConfig(): RaceConfig {
    return {
      ballCount: this.ballCount,
      seed: this.seed,
      colors: this.colors.length ? this.colors : generateBallColors(this.ballCount),
    };
  }

  private loop = (now: number): void => {
    if (!this.playing || !this.race) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.25);
    this.lastTime = now;
    this.acc += dt;

    let steps = 0;
    while (this.acc >= FIXED_TIMESTEP && steps < MAX_STEPS_PER_FRAME && !this.race.complete) {
      this.lastFrame = this.race.step();
      this.acc -= FIXED_TIMESTEP;
      steps++;
    }

    this.draw();
    this.emit();

    if (this.race.complete) {
      this.playing = false;
      this.rafId = null;
      return;
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  private draw(): void {
    if (!this.lastFrame) return;
    render(this.ctx, this.level, this.lastFrame, {
      width: this.ctx.canvas.width,
      height: this.ctx.canvas.height,
      colors: this.colors,
    });
  }

  private emit(): void {
    if (!this.onStatus || !this.race) return;
    this.onStatus({
      ready: true,
      playing: this.playing,
      complete: this.race.complete,
      frame: this.lastFrame?.frame ?? 0,
      finished: this.race.results().length,
      total: this.ballCount,
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
