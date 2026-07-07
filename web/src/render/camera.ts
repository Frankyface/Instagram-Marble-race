/**
 * Camera transform (S3) — maps world (level) coordinates to screen (canvas) pixels.
 *
 * The whole level width fits the canvas width (uniform scale, so circles stay round). The
 * vertical window follows the leader (frame.cameraTargetY), clamped to the level bounds. The
 * transform is a PURE function of (level, cameraTargetY, width, height) with NO pixel literals,
 * so rendering at a small preview size and at 1080x1920 export size produce the SAME geometry,
 * just scaled — which is what keeps the exported video identical to the preview.
 */
import type { Level } from "../level/types";

/** Where the leader sits vertically in the frame (0 = top, 1 = bottom). 0.66 => lower third. */
export const LEADER_SCREEN_FRACTION = 0.66;

export interface CameraTransform {
  /** pixels per world unit (uniform on both axes) */
  scale: number;
  /** world-y at the top edge of the visible window */
  viewTopWorldY: number;
  worldToScreenX(x: number): number;
  worldToScreenY(y: number): number;
}

export function getCameraTransform(
  level: Level,
  cameraTargetY: number,
  width: number,
  height: number,
): CameraTransform {
  const scale = width / level.size.width;
  const visibleWorldHeight = height / scale;
  const maxTop = Math.max(0, level.size.height - visibleWorldHeight);
  const rawTop = cameraTargetY - visibleWorldHeight * LEADER_SCREEN_FRACTION;
  const viewTopWorldY = Math.min(Math.max(rawTop, 0), maxTop);
  return {
    scale,
    viewTopWorldY,
    worldToScreenX: (x: number) => x * scale,
    worldToScreenY: (y: number) => (y - viewTopWorldY) * scale,
  };
}
