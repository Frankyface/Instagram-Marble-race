import { useEffect, useRef, useState } from "react";
import type { Level } from "../level/types";
import { BracketController, type BracketStatus } from "./bracketController";
import type { BracketConfig } from "../race/brackets";

const PREVIEW_W = 450;
const PREVIEW_H = 800;
const BASE_SEED = 24680;

interface BracketViewProps {
  level: Level;
}

export function BracketView({ level }: BracketViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<BracketController | null>(null);
  const [ballCount, setBallCount] = useState(16);
  const [groupSize, setGroupSize] = useState(4);
  const [runId, setRunId] = useState(0);
  const [status, setStatus] = useState<BracketStatus | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = PREVIEW_W;
    canvas.height = PREVIEW_H;
    const config: BracketConfig = { ballCount, seed: BASE_SEED + runId, groupSize, advancePerGroup: 1 };
    const controller = new BracketController(canvas, level, config);
    controller.onStatus = setStatus;
    controllerRef.current = controller;
    void controller.init();
    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, [level, ballCount, groupSize, runId]);

  let statusText = "loading…";
  if (status) {
    if (status.phase === "done") statusText = "🏆 Champion decided!";
    else if (status.phase === "intermission") statusText = "Next match…";
    else statusText = status.isFinal ? "FINAL" : `Round ${status.round}`;
    if (status.phase !== "done") statusText += ` · match ${status.matchNumber}/${status.totalMatches}`;
  }

  return (
    <div className="race-preview">
      <canvas ref={canvasRef} className="race-canvas" data-testid="bracket-canvas" />
      <div className="race-controls" data-testid="bracket-controls">
        <label className="ball-count">
          <span>
            Field: <strong>{ballCount}</strong>
          </span>
          <input
            type="range"
            min={4}
            max={64}
            value={ballCount}
            onChange={(e) => setBallCount(Number(e.target.value))}
            aria-label="Field size"
          />
        </label>
        <label className="ball-count">
          <span>Group</span>
          <select value={groupSize} onChange={(e) => setGroupSize(Number(e.target.value))}>
            <option value={2}>2</option>
            <option value={4}>4</option>
            <option value={8}>8</option>
          </select>
        </label>
        <button className="btn btn-primary" onClick={() => setRunId((r) => r + 1)}>
          New tournament
        </button>
        <span className="race-status" data-testid="bracket-status">
          {statusText}
        </span>
        {status?.phase === "done" && status.championColor && (
          <span
            className="champion-swatch"
            data-testid="champion-swatch"
            style={{ background: status.championColor }}
            title={`Champion: ball #${status.championId}`}
          />
        )}
      </div>
    </div>
  );
}
