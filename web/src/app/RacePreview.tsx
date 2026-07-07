import { useEffect, useRef, useState } from "react";
import type { Level } from "../level/types";
import { RaceController, type RaceStatus } from "./raceController";
import { DEFAULT_BALL_COUNT, MIN_BALL_COUNT, MAX_BALL_COUNT } from "../race/config";
import { exportRaceToMp4, probeMp4Support } from "../export/exportMp4";

// Preview backing-store resolution (9:16, same aspect as the 1080x1920 export).
const PREVIEW_W = 450;
const PREVIEW_H = 800;
const INITIAL_SEED = 12345;

interface RacePreviewProps {
  level: Level;
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function RacePreview({ level }: RacePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<RaceController | null>(null);
  const [ballCount, setBallCount] = useState(DEFAULT_BALL_COUNT);
  const [status, setStatus] = useState<RaceStatus | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportPct, setExportPct] = useState(0);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = PREVIEW_W;
    canvas.height = PREVIEW_H;
    const controller = new RaceController(canvas, level, DEFAULT_BALL_COUNT, INITIAL_SEED);
    controller.onStatus = setStatus;
    controllerRef.current = controller;
    void controller.init();

    // Verification hook: run an export and hand back the Blob (used by the S5 preview check).
    (window as unknown as { __marbleExportMp4?: () => Promise<Blob> }).__marbleExportMp4 = () => {
      const c = controllerRef.current;
      if (!c) return Promise.reject(new Error("controller not ready"));
      return exportRaceToMp4(level, c.exportConfig());
    };

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, [level]);

  useEffect(() => {
    controllerRef.current?.setBallCount(ballCount);
  }, [ballCount]);

  async function handleExport(): Promise<void> {
    const controller = controllerRef.current;
    if (!controller || exporting) return;
    setExporting(true);
    setExportPct(0);
    setExportMsg(null);
    controller.pause();
    try {
      const support = await probeMp4Support();
      if (!support.supported) {
        setExportMsg(`MP4 export unavailable: ${support.reason ?? "unsupported browser"}`);
        return;
      }
      const blob = await exportRaceToMp4(level, controller.exportConfig(), {
        codec: support.codec ?? undefined,
        onProgress: (frac) => setExportPct(Math.round(frac * 100)),
      });
      downloadBlob(blob, "marble-race.mp4");
      setExportMsg(`Exported ${(blob.size / 1e6).toFixed(1)} MB MP4`);
    } catch (e) {
      setExportMsg(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExporting(false);
    }
  }

  const playing = status?.playing ?? false;
  const ready = status?.ready ?? false;

  return (
    <div className="race-preview">
      <canvas ref={canvasRef} className="race-canvas" data-testid="race-canvas" />
      <div className="race-controls" data-testid="race-controls">
        <button
          className="btn btn-primary"
          onClick={() => controllerRef.current?.togglePlay()}
          disabled={!ready || exporting}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          className="btn"
          onClick={() => controllerRef.current?.restart()}
          disabled={!ready || exporting}
        >
          Restart
        </button>
        <button
          className="btn"
          onClick={() => controllerRef.current?.shuffle()}
          disabled={!ready || exporting}
        >
          Shuffle
        </button>
        <label className="ball-count">
          <span>
            Balls: <strong data-testid="ball-count-value">{ballCount}</strong>
          </span>
          <input
            type="range"
            min={MIN_BALL_COUNT}
            max={MAX_BALL_COUNT}
            value={ballCount}
            onChange={(e) => setBallCount(Number(e.target.value))}
            disabled={exporting}
            aria-label="Ball count"
          />
        </label>
        <button
          className="btn btn-export"
          onClick={handleExport}
          disabled={!ready || exporting}
          data-testid="export-btn"
        >
          {exporting ? `Exporting ${exportPct}%` : "Export MP4"}
        </button>
        <span className="race-status" data-testid="race-status">
          {exportMsg ??
            (status ? `${status.finished}/${status.total} finished · frame ${status.frame}` : "loading…")}
        </span>
      </div>
    </div>
  );
}
