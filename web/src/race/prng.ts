/**
 * mulberry32 — a tiny, fast, fully deterministic seeded PRNG.
 *
 * ALL randomness in the simulation must flow through this (never Math.random), so that a
 * given (level, seed) reproduces bit-for-bit — which is what makes the exported MP4 identical
 * to the live preview and keeps races fair/reproducible.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** In-place deterministic Fisher–Yates shuffle driven by a seeded rng. Returns the array. */
export function seededShuffle<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}
