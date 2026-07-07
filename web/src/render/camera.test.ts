import { describe, it, expect } from "vitest";
import classicFunnel from "../../levels/classic-funnel.json";
import { parseLevel } from "../level/schema";
import { getCameraTransform, LEADER_SCREEN_FRACTION } from "./camera";

const level = parseLevel(classicFunnel); // width 720, height 3200

describe("getCameraTransform", () => {
  it("renders identical geometry at 2x resolution (resolution-parameterized)", () => {
    const cameraTargetY = 1500;
    const a = getCameraTransform(level, cameraTargetY, 360, 640);
    const b = getCameraTransform(level, cameraTargetY, 720, 1280);

    // Scale doubles; the world window (viewTop) is identical at both resolutions.
    expect(b.scale).toBeCloseTo(a.scale * 2, 10);
    expect(b.viewTopWorldY).toBeCloseTo(a.viewTopWorldY, 10);

    // Every mapped point at 2x is exactly 2x the point at 1x -> same picture, scaled.
    for (const [x, y] of [
      [0, 0],
      [360, 1500],
      [720, 3200],
      [180, 700],
    ]) {
      expect(b.worldToScreenX(x)).toBeCloseTo(a.worldToScreenX(x) * 2, 8);
      expect(b.worldToScreenY(y)).toBeCloseTo(a.worldToScreenY(y) * 2, 8);
    }
  });

  it("frames the leader at LEADER_SCREEN_FRACTION when unclamped", () => {
    const cameraTargetY = 1500;
    const t = getCameraTransform(level, cameraTargetY, 720, 1280);
    const visibleWorldHeight = 1280 / t.scale; // 1280
    const expectedTop = cameraTargetY - visibleWorldHeight * LEADER_SCREEN_FRACTION;
    expect(t.viewTopWorldY).toBeCloseTo(expectedTop, 8);
    // The leader's screen-y should land at LEADER_SCREEN_FRACTION of the canvas height.
    expect(t.worldToScreenY(cameraTargetY)).toBeCloseTo(1280 * LEADER_SCREEN_FRACTION, 6);
  });

  it("clamps the view to the top of the level", () => {
    const t = getCameraTransform(level, 0, 720, 1280);
    expect(t.viewTopWorldY).toBe(0);
  });

  it("clamps the view to the bottom of the level", () => {
    const t = getCameraTransform(level, level.size.height * 10, 720, 1280);
    const visibleWorldHeight = 1280 / t.scale;
    expect(t.viewTopWorldY).toBeCloseTo(level.size.height - visibleWorldHeight, 8);
  });
});
