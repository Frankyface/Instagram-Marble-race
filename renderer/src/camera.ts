import {Frame} from './types';

export const COMPOSITION_WIDTH = 1080;
export const COMPOSITION_HEIGHT = 1920;

export const getTrackScale = (trackWidth: number): number => COMPOSITION_WIDTH / trackWidth;

type Leader = {id: string; y: number};

/**
 * The "leader" is the marble still racing that's furthest down (largest y below
 * the finish line). Finished marbles are frozen exactly at `finishY`, so they're
 * excluded - otherwise the camera and the gold ring would lock onto the winner
 * frozen at the bottom while the actual race continues above. If everyone has
 * finished, fall back to the furthest-down overall.
 */
export const getLeader = (frame: Frame, finishY: number): Leader | undefined => {
  let live: Leader | undefined;
  let any: Leader | undefined;
  for (const p of frame.positions) {
    if (!any || p.y > any.y) any = {id: p.id, y: p.y};
    if (p.y >= finishY - 1) continue; // finished / frozen at the line
    if (!live || p.y > live.y) live = {id: p.id, y: p.y};
  }
  return live ?? any;
};

/**
 * Precompute a per-frame vertical camera offset that follows the live leader but
 * only ever scrolls DOWN (running max) - so when the current leader finishes and
 * the next live leader is higher up, the camera holds instead of snapping back up.
 * This is the continuous downward scroll of a real marble-race broadcast.
 */
export const computeCameraOffsets = (
  frames: Frame[],
  finishY: number,
  scale: number,
): number[] => {
  // Keep the leader near the BOTTOM of the frame so the chasing pack (which is
  // behind = higher up = smaller y) fills the view above it. Keeping the leader
  // high up instead wastes the whole lower frame on empty course ahead of it.
  const keepLeaderAt = COMPOSITION_HEIGHT * 0.8;
  let running = 0;
  return frames.map((frame) => {
    const leader = getLeader(frame, finishY);
    const target = Math.max((leader?.y ?? 0) * scale - keepLeaderAt, 0);
    running = Math.max(running, target);
    return running;
  });
};
