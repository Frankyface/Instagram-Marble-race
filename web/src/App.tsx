import { useState } from "react";
import classicFunnel from "../levels/classic-funnel.json";
import { parseLevel } from "./level/schema";
import type { Level } from "./level/types";
import { RacePreview } from "./app/RacePreview";
import { BracketView } from "./app/BracketView";
import { Editor } from "./editor/Editor";
import { generateLevel } from "./level/generate";

const initialLevel = parseLevel(classicFunnel);

type Mode = "preview" | "bracket" | "editor";

export default function App() {
  const [mode, setMode] = useState<Mode>("preview");
  const [level, setLevel] = useState<Level>(initialLevel);
  const [seedField, setSeedField] = useState("");

  const loadSeed = (s: number) => {
    setLevel(generateLevel(s));
    setSeedField(String(s));
    setMode("preview");
  };
  const randomTrack = () => loadSeed(Math.floor(Math.random() * 1_000_000_000));

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1 data-testid="app-title">Marble Race</h1>
        <div className="mode-tabs" role="tablist">
          <button
            className={mode === "preview" ? "tab active" : "tab"}
            onClick={() => setMode("preview")}
            data-testid="tab-preview"
          >
            Race
          </button>
          <button
            className={mode === "bracket" ? "tab active" : "tab"}
            onClick={() => setMode("bracket")}
            data-testid="tab-bracket"
          >
            Bracket
          </button>
          <button
            className={mode === "editor" ? "tab active" : "tab"}
            onClick={() => setMode("editor")}
            data-testid="tab-editor"
          >
            Editor
          </button>
        </div>
        <div className="track-gen">
          <button className="btn" onClick={randomTrack} data-testid="random-btn">
            🎲 Random race
          </button>
          <label className="seed-field">
            seed
            <input
              type="number"
              value={seedField}
              placeholder="—"
              onChange={(e) => setSeedField(e.target.value)}
              aria-label="Track seed"
            />
          </label>
          <button
            className="btn btn-mini"
            onClick={() => {
              if (seedField !== "") loadSeed(Number(seedField));
            }}
          >
            Load
          </button>
        </div>
      </header>

      {mode === "preview" && <RacePreview level={level} />}
      {mode === "bracket" && <BracketView level={level} />}
      {mode === "editor" && (
        <Editor
          initialLevel={level}
          onTestRace={(lvl) => {
            setLevel(lvl);
            setMode("preview");
          }}
        />
      )}
    </main>
  );
}
