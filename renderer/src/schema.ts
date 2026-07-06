import {z} from 'zod';
import {RaceManifest} from './types';

/**
 * Remotion's <Composition> wants a Zod object schema to type its input props.
 * The manifest shape is already fully typed in types.ts; re-validating its
 * internals at the Zod level would just duplicate that, so the manifest field
 * is typed via a cast rather than a full parallel schema. This means Zod does
 * NOT validate the manifest shape at runtime - real validation (schemaVersion
 * + presence of racers/frames/track) happens once, in scripts/render.mjs's
 * validateManifestShape(), before this ever reaches the bundle. A manifest
 * passed directly via `remotion render --props` (bypassing render.mjs) would
 * skip that check - not a currently-supported workflow, but worth knowing.
 */
export const raceInputPropsSchema = z.object({
  manifest: z.any() as unknown as z.ZodType<RaceManifest>,
  avatarStaticPathById: z.record(z.string(), z.string()),
});
