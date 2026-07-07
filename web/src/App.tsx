import { useState } from "react";
import classicFunnel from "../levels/classic-funnel.json";
import { parseLevel } from "./level/schema";
import type { Level } from "./level/types";
import { RacePreview } from "./app/RacePreview";
import { BracketView } from "./app/BracketView";
import { Editor } from "./editor/Editor";

const initialLevel = parseLevel(classicFunnel);

type Mode = "preview" | "bracket" | "editor";

export default function App() {
  const [mode, setMode] = useState<Mode>("preview");
  const [level, setLevel] = useState<Level>(initialLevel);

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
