import type { EditorPiece } from "./model";

interface PropertyPanelProps {
  piece: EditorPiece | null;
  onChange: (patch: Partial<EditorPiece>) => void;
}

function NumField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="prop-field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

/** Numeric controls for the currently-selected editor piece ("more options"). */
export function PropertyPanel({ piece, onChange }: PropertyPanelProps) {
  if (!piece) return null;
  const p = piece;
  return (
    <div className="prop-panel" data-testid="prop-panel">
      <span className="prop-title">{p.type}</span>
      {p.type === "peg" && (
        <NumField label="radius" value={p.radius} min={4} onChange={(v) => onChange({ radius: v })} />
      )}
      {p.type === "pegRow" && (
        <>
          <NumField label="count" value={p.count} min={1} max={20} onChange={(v) => onChange({ count: v })} />
          <NumField label="spacing" value={p.spacing} min={10} onChange={(v) => onChange({ spacing: v })} />
          <NumField label="radius" value={p.radius} min={4} onChange={(v) => onChange({ radius: v })} />
        </>
      )}
      {p.type === "funnel" && (
        <>
          <NumField label="width" value={p.width} min={40} onChange={(v) => onChange({ width: v })} />
          <NumField label="gap" value={p.gap} min={10} onChange={(v) => onChange({ gap: v })} />
          <NumField label="height" value={p.height} min={20} onChange={(v) => onChange({ height: v })} />
        </>
      )}
      {p.type === "wall" && (
        <NumField label="thickness" value={p.thickness} min={2} onChange={(v) => onChange({ thickness: v })} />
      )}
      {p.type === "gate" && (
        <NumField label="keep" value={p.quota} min={1} onChange={(v) => onChange({ quota: v })} />
      )}
      {p.type === "spinner" && (
        <>
          <NumField label="radius" value={p.radius} min={30} onChange={(v) => onChange({ radius: v })} />
          <NumField label="arms" value={p.arms} min={1} max={12} onChange={(v) => onChange({ arms: v })} />
          <NumField label="armWidth" value={p.armWidth} min={4} onChange={(v) => onChange({ armWidth: v })} />
          <NumField label="speed" value={p.speed} step={0.5} onChange={(v) => onChange({ speed: v })} />
        </>
      )}
    </div>
  );
}
