import { useMemo, useState } from "react";
import Konva from "konva";
import { Stage, Layer, Circle, Line, Rect, Group, Text } from "react-konva";
import type { Level } from "../level/types";
import { parseLevel } from "../level/schema";
import {
  compileToLevel,
  levelToDoc,
  nextPieceId,
  type EditorDoc,
  type EditorPiece,
} from "./model";
import { PropertyPanel } from "./PropertyPanel";

const STAGE_W = 400;
const STAGE_H = 680;
const SELECT_COLOR = "#5b8cff";
const WALL_COLOR = "#8a92a8";
const PEG_COLOR = "#c9cfe0";
const SPAWN_FILL = "rgba(91,140,255,0.18)";
const FINISH_COLOR = "#ffd34d";

interface EditorProps {
  initialLevel: Level;
  onTestRace: (level: Level) => void;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

export function Editor({ initialLevel, onTestRace }: EditorProps) {
  const [doc, setDoc] = useState<EditorDoc>(() => levelToDoc(initialLevel));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panY, setPanY] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const scale = STAGE_W / doc.size.width;
  const minPanY = Math.min(0, -(doc.size.height * scale - STAGE_H));
  const viewCenterWorldY = (STAGE_H / 2 - panY) / scale;

  const patchPiece = (id: string, patch: Partial<EditorPiece>) =>
    setDoc((d) => ({
      ...d,
      pieces: d.pieces.map((p) => (p.id === id ? ({ ...p, ...patch } as EditorPiece) : p)),
    }));

  const addPiece = (piece: EditorPiece) => {
    setDoc((d) => ({ ...d, pieces: [...d.pieces, piece] }));
    setSelectedId(piece.id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setDoc((d) => ({ ...d, pieces: d.pieces.filter((p) => p.id !== selectedId) }));
    setSelectedId(null);
  };

  const cx = doc.size.width / 2;
  const cy = Math.round(clamp(viewCenterWorldY, 100, doc.size.height - 100));

  const addPeg = () => addPiece({ type: "peg", id: nextPieceId("peg"), x: cx, y: cy, radius: 22 });
  const addPegRow = () =>
    addPiece({ type: "pegRow", id: nextPieceId("row"), x: cx - 240, y: cy, count: 5, spacing: 120, radius: 22 });
  const addFunnel = () =>
    addPiece({ type: "funnel", id: nextPieceId("funnel"), x: cx, y: cy, width: 520, gap: 130, height: 220 });
  const addWall = () =>
    addPiece({
      type: "wall",
      id: nextPieceId("wall"),
      points: [[doc.size.width * 0.25, cy], [doc.size.width * 0.75, cy]],
      thickness: 18,
    });
  const addGate = () => addPiece({ type: "gate", id: nextPieceId("gate"), y: cy, quota: 8 });
  const addSpinner = () =>
    addPiece({ type: "spinner", id: nextPieceId("spinner"), x: cx, y: cy, radius: 150, arms: 3, armWidth: 16, speed: 3 });

  const selectedPiece = doc.pieces.find((p) => p.id === selectedId) ?? null;

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    setPanY((p) => clamp(p - e.evt.deltaY, minPanY, 0));
  };

  const handleTestRace = () => {
    try {
      const level = parseLevel(compileToLevel(doc));
      setError(null);
      onTestRace(level);
    } catch (e) {
      setError(`Invalid level: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleSave = () => {
    try {
      const level = parseLevel(compileToLevel(doc));
      const blob = new Blob([JSON.stringify(level, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.name.replace(/\s+/g, "-").toLowerCase() || "level"}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      setError(`Cannot save: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleLoad = (file: File) => {
    file
      .text()
      .then((text) => {
        const level = parseLevel(JSON.parse(text));
        setDoc(levelToDoc(level));
        setSelectedId(null);
        setError(null);
      })
      .catch((e) => setError(`Cannot load: ${e instanceof Error ? e.message : String(e)}`));
  };

  const selectedType = useMemo(
    () => doc.pieces.find((p) => p.id === selectedId)?.type ?? null,
    [doc.pieces, selectedId],
  );

  return (
    <div className="editor">
      <div className="editor-toolbar" data-testid="editor-toolbar">
        <button className="btn" onClick={addPeg}>+ Peg</button>
        <button className="btn" onClick={addPegRow}>+ Peg Row</button>
        <button className="btn" onClick={addFunnel}>+ Funnel</button>
        <button className="btn" onClick={addWall}>+ Wall</button>
        <button className="btn" onClick={addGate}>+ Gate</button>
        <button className="btn" onClick={addSpinner}>+ Spinner</button>
        <button className="btn" onClick={deleteSelected} disabled={!selectedId}>Delete</button>
        <button className="btn btn-primary" onClick={handleTestRace} data-testid="test-race-btn">
          Test Race
        </button>
        <button className="btn" onClick={handleSave}>Save JSON</button>
        <label className="btn" style={{ cursor: "pointer" }}>
          Load JSON
          <input
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleLoad(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="editor-stage">
        <Stage
          width={STAGE_W}
          height={STAGE_H}
          scaleX={scale}
          scaleY={scale}
          y={panY}
          onWheel={handleWheel}
          onMouseDown={(e) => {
            if (e.target === e.target.getStage()) setSelectedId(null);
          }}
        >
          <Layer>
            {/* Spawn zone */}
            <Rect
              x={doc.spawn.x}
              y={doc.spawn.y}
              width={doc.spawn.width}
              height={doc.spawn.height}
              fill={SPAWN_FILL}
              stroke={SELECT_COLOR}
              strokeWidth={2 / scale}
              draggable
              onDragEnd={(e) =>
                setDoc((d) => ({ ...d, spawn: { ...d.spawn, x: e.target.x(), y: e.target.y() } }))
              }
            />

            {/* Pieces */}
            {doc.pieces.map((piece) => {
              const selected = piece.id === selectedId;
              const stroke = selected ? SELECT_COLOR : undefined;
              if (piece.type === "peg") {
                return (
                  <Circle
                    key={piece.id}
                    x={piece.x}
                    y={piece.y}
                    radius={piece.radius}
                    fill={PEG_COLOR}
                    stroke={stroke}
                    strokeWidth={selected ? 4 / scale : 0}
                    draggable
                    onClick={() => setSelectedId(piece.id)}
                    onTap={() => setSelectedId(piece.id)}
                    onDragEnd={(e) => patchPiece(piece.id, { x: e.target.x(), y: e.target.y() })}
                  />
                );
              }
              if (piece.type === "pegRow") {
                return (
                  <Group
                    key={piece.id}
                    x={piece.x}
                    y={piece.y}
                    draggable
                    onClick={() => setSelectedId(piece.id)}
                    onTap={() => setSelectedId(piece.id)}
                    onDragEnd={(e) => patchPiece(piece.id, { x: e.target.x(), y: e.target.y() })}
                  >
                    {Array.from({ length: piece.count }, (_, i) => (
                      <Circle
                        key={i}
                        x={i * piece.spacing}
                        y={0}
                        radius={piece.radius}
                        fill={PEG_COLOR}
                        stroke={stroke}
                        strokeWidth={selected ? 4 / scale : 0}
                      />
                    ))}
                  </Group>
                );
              }
              if (piece.type === "funnel") {
                const halfW = piece.width / 2;
                const halfGap = piece.gap / 2;
                return (
                  <Group
                    key={piece.id}
                    x={piece.x}
                    y={piece.y}
                    draggable
                    onClick={() => setSelectedId(piece.id)}
                    onTap={() => setSelectedId(piece.id)}
                    onDragEnd={(e) => patchPiece(piece.id, { x: e.target.x(), y: e.target.y() })}
                  >
                    <Line
                      points={[-halfW, 0, -halfGap, piece.height]}
                      stroke={selected ? SELECT_COLOR : WALL_COLOR}
                      strokeWidth={18}
                      lineCap="round"
                    />
                    <Line
                      points={[halfW, 0, halfGap, piece.height]}
                      stroke={selected ? SELECT_COLOR : WALL_COLOR}
                      strokeWidth={18}
                      lineCap="round"
                    />
                  </Group>
                );
              }
              if (piece.type === "gate") {
                return (
                  <Group
                    key={piece.id}
                    x={0}
                    y={piece.y}
                    draggable
                    dragBoundFunc={(pos) => ({ x: 0, y: pos.y })}
                    onClick={() => setSelectedId(piece.id)}
                    onTap={() => setSelectedId(piece.id)}
                    onDragEnd={(e) => patchPiece(piece.id, { y: Math.round(e.target.y()) })}
                  >
                    <Line
                      points={[0, 0, doc.size.width, 0]}
                      stroke={selected ? SELECT_COLOR : "#ff8c42"}
                      strokeWidth={6 / scale}
                      dash={[16 / scale, 10 / scale]}
                      hitStrokeWidth={40 / scale}
                    />
                    <Text x={12} y={-56} text={`keep ${piece.quota}`} fontSize={44} fill="#ff8c42" />
                  </Group>
                );
              }
              if (piece.type === "spinner") {
                const armCount = Math.max(1, piece.arms);
                return (
                  <Group
                    key={piece.id}
                    x={piece.x}
                    y={piece.y}
                    draggable
                    onClick={() => setSelectedId(piece.id)}
                    onTap={() => setSelectedId(piece.id)}
                    onDragEnd={(e) =>
                      patchPiece(piece.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) })
                    }
                  >
                    <Circle x={0} y={0} radius={piece.radius} stroke="#9d84e055" strokeWidth={2 / scale} />
                    {Array.from({ length: armCount }, (_, i) => {
                      const theta = (Math.PI * 2 * i) / armCount;
                      return (
                        <Line
                          key={i}
                          points={[0, 0, piece.radius * Math.cos(theta), piece.radius * Math.sin(theta)]}
                          stroke={selected ? SELECT_COLOR : "#9d84e0"}
                          strokeWidth={piece.armWidth * 2}
                          lineCap="round"
                        />
                      );
                    })}
                    <Circle x={0} y={0} radius={piece.armWidth * 1.7} fill={selected ? SELECT_COLOR : "#9d84e0"} />
                  </Group>
                );
              }
              // wall
              return (
                <Line
                  key={piece.id}
                  points={piece.points.flat()}
                  stroke={selected ? SELECT_COLOR : WALL_COLOR}
                  strokeWidth={piece.thickness}
                  lineCap="round"
                  lineJoin="round"
                  hitStrokeWidth={Math.max(piece.thickness, 20)}
                  draggable
                  onClick={() => setSelectedId(piece.id)}
                  onTap={() => setSelectedId(piece.id)}
                  onDragEnd={(e) => {
                    const dx = e.target.x();
                    const dy = e.target.y();
                    patchPiece(piece.id, {
                      points: piece.points.map(([x, y]) => [x + dx, y + dy] as [number, number]),
                    });
                    e.target.position({ x: 0, y: 0 });
                  }}
                />
              );
            })}

            {/* Wall endpoint handles — grab an end of the selected wall to reshape it. */}
            {selectedPiece?.type === "wall" &&
              selectedPiece.points.map((pt, i) => (
                <Circle
                  key={`handle-${i}`}
                  x={pt[0]}
                  y={pt[1]}
                  radius={14 / scale}
                  fill="#ffffff"
                  stroke={SELECT_COLOR}
                  strokeWidth={3 / scale}
                  draggable
                  onDragEnd={(e) => {
                    const np = selectedPiece.points.map((p, j) =>
                      j === i
                        ? ([Math.round(e.target.x()), Math.round(e.target.y())] as [number, number])
                        : p,
                    );
                    patchPiece(selectedPiece.id, { points: np });
                  }}
                />
              ))}

            {/* Finish line */}
            <Line
              points={[0, 0, doc.size.width, 0]}
              x={0}
              y={doc.finishY}
              stroke={FINISH_COLOR}
              strokeWidth={5 / scale}
              dash={[18 / scale, 12 / scale]}
              draggable
              dragBoundFunc={(pos) => ({ x: 0, y: pos.y })}
              onDragEnd={(e) => setDoc((d) => ({ ...d, finishY: Math.round(e.target.y()) }))}
            />
          </Layer>
        </Stage>
      </div>

      <PropertyPanel
        piece={selectedPiece}
        onChange={(patch) => {
          if (selectedId) patchPiece(selectedId, patch);
        }}
      />

      <p className="editor-hint muted">
        Scroll to pan · click a piece to select · drag to move · {selectedType ? `selected: ${selectedType}` : "nothing selected"}
      </p>
      {error && (
        <p className="editor-error" data-testid="editor-error">
          {error}
        </p>
      )}
    </div>
  );
}
