/**
 * Brackets / tournament mode (S10).
 *
 * The field is split into groups; each group races on the level and the top finishers advance.
 * Rounds repeat until few enough remain for a single final race, whose winner is champion.
 *
 * Each match is a normal deterministic `Race` over a subset of the original ball ids (so a ball
 * keeps its identity + colour across rounds). `runBracket` runs every match headlessly and
 * returns the full match plan + champion — this is pure/deterministic and drives both the tests
 * and the live player (which replays each recorded match by its ballIds + seed).
 */
import type { Level } from "../level/types";
import { buildRace, DEFAULT_MAX_FRAMES } from "./engine";

export interface BracketConfig {
  ballCount: number;
  seed: number;
  /** Marbles per match. */
  groupSize: number;
  /** How many advance from each match (clamped to groupSize-1 so the field always shrinks). */
  advancePerGroup: number;
}

export interface BracketMatch {
  round: number;
  matchIndex: number;
  /** Original ball ids competing in this match. */
  ballIds: number[];
  seed: number;
  /** Original ids ordered by finish (rank 1 first), then any non-finishers by id. */
  resultIds: number[];
  /** The subset of resultIds that advance to the next round. */
  advancingIds: number[];
  isFinal: boolean;
}

export interface BracketResult {
  matches: BracketMatch[];
  championId: number;
  rounds: number;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Deterministic per-match seed from the bracket seed + round + match index. */
function matchSeed(seed: number, round: number, matchIndex: number): number {
  let h = seed | 0;
  h = (Math.imul(h ^ round, 0x9e3779b1) ^ Math.imul(matchIndex + 1, 0x85ebca77)) | 0;
  h = Math.imul(h ^ (h >>> 15), 0xc2b2ae3d) | 0;
  return h >>> 0;
}

/** Race one group and return its original ids ordered best-first (finishers, then the rest). */
function raceGroup(level: Level, ballIds: number[], seed: number): number[] {
  const race = buildRace(level, { ballCount: ballIds.length, seed }, DEFAULT_MAX_FRAMES);
  while (!race.complete) race.step();
  const finishedLocal = race.results().map((r) => r.id); // local ids 0..n-1, rank order
  race.dispose();
  const ordered = finishedLocal.map((localId) => ballIds[localId]);
  // Append any that didn't finish within the cap, in original id order, so every id appears once.
  const seen = new Set(ordered);
  for (const id of ballIds) if (!seen.has(id)) ordered.push(id);
  return ordered;
}

export function runBracket(level: Level, config: BracketConfig): BracketResult {
  const groupSize = Math.max(2, Math.floor(config.groupSize));
  const advance = Math.max(1, Math.min(Math.floor(config.advancePerGroup), groupSize - 1));

  const matches: BracketMatch[] = [];
  let field = Array.from({ length: config.ballCount }, (_, i) => i);
  let round = 1;

  // Elimination rounds until the field fits a single final race.
  while (field.length > groupSize) {
    const groups = chunk(field, groupSize);
    const nextField: number[] = [];
    groups.forEach((group, matchIndex) => {
      const seed = matchSeed(config.seed, round, matchIndex);
      const resultIds = raceGroup(level, group, seed);
      const advancingIds = resultIds.slice(0, Math.min(advance, group.length));
      matches.push({ round, matchIndex, ballIds: group, seed, resultIds, advancingIds, isFinal: false });
      nextField.push(...advancingIds);
    });
    // Safety: if a round fails to shrink the field, stop before the final to avoid a loop.
    if (nextField.length >= field.length) {
      field = nextField.slice(0, groupSize);
      break;
    }
    field = nextField;
    round++;
  }

  // Final race.
  const finalSeed = matchSeed(config.seed, round, 0);
  const finalResults = raceGroup(level, field, finalSeed);
  const championId = finalResults[0] ?? field[0];
  matches.push({
    round,
    matchIndex: 0,
    ballIds: field,
    seed: finalSeed,
    resultIds: finalResults,
    advancingIds: [championId],
    isFinal: true,
  });

  return { matches, championId, rounds: round };
}
