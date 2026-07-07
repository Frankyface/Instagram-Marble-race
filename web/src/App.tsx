import { useState } from "react";
import classicFunnel from "../levels/classic-funnel.json";
import { parseLevel } from "./level/schema";
import type { Level } from "./level/types";
import { RacePreview } from "./app/RacePreview";
import { Editor } from "./editor/Editor";

const initialLevel = parseLevel(classicFunnel);

type Mode = "preview" | "editor";

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
            Preview
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

      {mode === "preview" ? (
        <RacePreview level={level} />
      ) : (
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
