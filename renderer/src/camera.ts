import {Frame} from './types';

export const COMPOSITION_WIDTH = 1080;
export const COMPOSITION_HEIGHT = 1920;

export const getTrackScale = (trackWidth: number): number => COMPOSITION_WIDTH / trackWidth;

type Leader = {id: string; y: number};

/**
 * The leader for camera-follow purposes is whoever has the largest y in this
 * frame - this is Stage 1's resolved progress metric (see
 * feature-race-engine.md), carried through to screen space here.
 *
 * Single pass shared by both the camera offset and the "who gets the gold
 * ring" check - originally these were two separate max-by-y scans (one via
 * Math.max, one via reduce), which a code review flagged as a DRY risk (the
 * two could silently diverge if a tie-break rule were ever added to one but
 * not the other).
 */
export const getLeader = (frame: Frame): Leader | undefined =>
  frame.positions.reduce<Leader | undefined>((leader, position) => {
    if (!leader || position.y > leader.y) {
      return {id: position.id, y: position.y};
    }
    return leader;
  }, undefined);

/**
 * Vertical scroll offset (in screen pixels) that keeps the current leader
 * roughly a third of the way down the frame, so the track scrolls upward as
 * the race progresses - a continuous scroll, no hard cuts.
 */
export const getCameraOffsetY = (leader: Leader | undefined, scale: number): number => {
  const leaderScreenY = (leader?.y ?? 0) * scale;
  const keepLeaderAt = COMPOSITION_HEIGHT / 3;
  return Math.max(leaderScreenY - keepLeaderAt, 0);
};
