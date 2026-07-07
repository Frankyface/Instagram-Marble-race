/**
 * Client-side MP4 export (S5).
 *
 * Re-runs the deterministic sim from the same (level, seed) as the preview, renders each frame
 * with the SAME render() into a 1080x1920 OffscreenCanvas, and encodes to an H.264 MP4 entirely
 * in the browser via WebCodecs + Mediabunny. Runs faster-than-realtime (decoupled from the
 * display), and — because sim + render are deterministic and shared — the exported video is
 * frame-identical to what was previewed.
 *
 * Works on GitHub Pages: WebCodecs needs only a secure context (HTTPS), NOT cross-origin
 * isolation / SharedArrayBuffer, so no COOP/COEP headers are required. Mediabunny's CanvasSource
 * captures, encodes, AND closes each VideoFrame internally, so there is no VideoFrame-leak footgun;
 * awaiting `source.add()` applies encoder/writer backpressure.
 */
import {
  Output,
  Mp4OutputFormat,
  BufferTarget,
  CanvasSource,
  getFirstEncodableVideoCodec,
  QUALITY_HIGH,
  type VideoCodec,
  type Quality,
} from "mediabunny";
import { initPhysics, buildRace } from "../race/engine";
import { render } from "../render/render";
import { generateBallColors } from "../render/colors";
import type { Level } from "../level/types";
import type { RaceConfig } from "../race/config";

export const EXPORT_WIDTH = 1080;
export const EXPORT_HEIGHT = 1920;
export const EXPORT_FPS = 60;

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export interface Mp4SupportResult {
  supported: boolean;
  codec: VideoCodec | null;
  reason?: string;
}

/**
 * Gate for MP4 export: checks WebCodecs presence, finds an H.264 codec, AND does a real
 * one-frame encode dry-run — because `isConfigSupported` can false-positive (notably Firefox
 * reports AVC support then throws at encode time).
 */
export async function probeMp4Support(): Promise<Mp4SupportResult> {
  if (typeof VideoEncoder === "undefined") {
    return { supported: false, codec: null, reason: "WebCodecs VideoEncoder is unavailable in this browser." };
  }
  let codec: VideoCodec | null = null;
  try {
    codec = await getFirstEncodableVideoCodec(["avc"], { width: EXPORT_WIDTH, height: EXPORT_HEIGHT });
  } catch (e) {
    return { supported: false, codec: null, reason: errMessage(e) };
  }
  if (!codec) {
    return { supported: false, codec: null, reason: "No H.264 (AVC) encoder available for 1080×1920." };
  }
  try {
    const canvas = new OffscreenCanvas(EXPORT_WIDTH, EXPORT_HEIGHT);
    const ctx = canvas.getContext("2d");
    if (!ctx) return { supported: false, codec: null, reason: "OffscreenCanvas 2D context unavailable." };
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
    const source = new CanvasSource(canvas, { codec, bitrate: QUALITY_HIGH });
    output.addVideoTrack(source);
    await output.start();
    await source.add(0, 1 / EXPORT_FPS);
    await output.finalize();
    const ok = (output.target.buffer?.byteLength ?? 0) > 0;
    return ok
      ? { supported: true, codec }
      : { supported: false, codec: null, reason: "Encoder produced no output." };
  } catch (e) {
    return { supported: false, codec: null, reason: errMessage(e) };
  }
}

/** Headless pre-pass: run the deterministic sim to count its exact frame length (for progress). */
function countFrames(level: Level, config: RaceConfig, maxFrames?: number): number {
  const race = buildRace(level, config, maxFrames);
  while (!race.complete) race.step();
  const n = race.frame;
  race.dispose();
  return n;
}

export interface ExportOptions {
  fps?: number;
  bitrate?: number | Quality;
  maxFrames?: number;
  /** Pass the codec from a prior probeMp4Support() to skip re-detection. */
  codec?: VideoCodec;
  onProgress?: (fraction: number, frame: number, totalFrames: number) => void;
  signal?: AbortSignal;
}

/** Export a race to a 1080x1920 H.264 MP4 Blob, fully in the browser. */
export async function exportRaceToMp4(
  level: Level,
  config: RaceConfig,
  options: ExportOptions = {},
): Promise<Blob> {
  const fps = options.fps ?? EXPORT_FPS;
  await initPhysics();

  let codec = options.codec ?? null;
  if (!codec) {
    codec = await getFirstEncodableVideoCodec(["avc"], { width: EXPORT_WIDTH, height: EXPORT_HEIGHT });
  }
  if (!codec) throw new Error("No H.264 (AVC) encoder available in this browser.");

  const totalFrames = countFrames(level, config, options.maxFrames);

  const canvas = new OffscreenCanvas(EXPORT_WIDTH, EXPORT_HEIGHT);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("OffscreenCanvas 2D context unavailable.");

  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new BufferTarget(),
  });
  const source = new CanvasSource(canvas, {
    codec,
    bitrate: options.bitrate ?? QUALITY_HIGH,
    keyFrameInterval: 2,
  });
  output.addVideoTrack(source);
  await output.start();

  const colors = config.colors ?? generateBallColors(config.ballCount);
  const race = buildRace(level, config, options.maxFrames);
  let frame = 0;
  try {
    while (!race.complete) {
      if (options.signal?.aborted) throw new DOMException("Export aborted", "AbortError");
      const f = race.step();
      render(ctx, level, f, { width: EXPORT_WIDTH, height: EXPORT_HEIGHT, colors });
      await source.add(frame / fps, 1 / fps);
      frame++;
      options.onProgress?.(totalFrames > 0 ? Math.min(frame / totalFrames, 1) : 0, frame, totalFrames);
    }
    await output.finalize();
  } catch (e) {
    try {
      if (output.state === "started") await output.cancel();
    } catch {
      /* ignore cleanup errors */
    }
    race.dispose();
    throw e;
  }
  race.dispose();

  const buffer = output.target.buffer;
  if (!buffer) throw new Error("Export produced no output buffer.");
  return new Blob([buffer], { type: "video/mp4" });
}
