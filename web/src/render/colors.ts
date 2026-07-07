/**
 * Auto-distinct ball colours (S4).
 *
 * Walks the hue wheel by the golden-ratio conjugate (0.618) in OKLCH — a perceptually uniform
 * space — so any number of balls get maximally-spread, evenly-bright colours that stay
 * distinguishable far better than naive HSL. Lightness/chroma alternate in bands to separate
 * adjacent hues further. Pure function of `count`, so it's deterministic and cache-friendly.
 */
import { formatHex } from "culori";

const GOLDEN_CONJUGATE = 0.6180339887498949;
const START_HUE = 0.08;
const L_BANDS = [0.74, 0.64, 0.82];
const C_BANDS = [0.16, 0.2, 0.13];

export function generateBallColors(count: number): string[] {
  const colors: string[] = [];
  let hue = START_HUE;
  for (let i = 0; i < count; i++) {
    hue = (hue + GOLDEN_CONJUGATE) % 1;
    const band = i % L_BANDS.length;
    const hex = formatHex({
      mode: "oklch",
      l: L_BANDS[band],
      c: C_BANDS[band],
      h: hue * 360,
    });
    colors.push(hex ?? "#cccccc");
  }
  return colors;
}
