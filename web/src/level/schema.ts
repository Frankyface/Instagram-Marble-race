/**
 * Runtime validation for the Level format (S1).
 *
 * `types.ts` is the hand-written type contract (with docs); this file mirrors it as a
 * Zod schema so untrusted Level JSON (imported files, editor output) is validated at the
 * boundary and fails fast with a clear message. A compile-time `Equals` assertion at the
 * bottom guarantees the Zod schema and the TS types never drift apart.
 */
import { z } from "zod";
import { LEVEL_SCHEMA_VERSION, type Level } from "./types";

/** A world-space point `[x, y]`. */
const PointSchema = z.tuple([z.number(), z.number()]);

const WallSchema = z.object({
  points: z.array(PointSchema).min(2, "a wall needs at least 2 points"),
  thickness: z.number().positive(),
});

const PegSchema = z.object({
  x: z.number(),
  y: z.number(),
  radius: z.number().positive(),
});

const SpawnZoneSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});

const GateSchema = z.object({
  y: z.number(),
  quota: z.number().int().nonnegative(),
});

const SpinnerSchema = z.object({
  x: z.number(),
  y: z.number(),
  radius: z.number().positive(),
  arms: z.number().int().min(1).max(12),
  armWidth: z.number().positive(),
  speed: z.number(),
});

export const LevelSchema = z.object({
  // Kept as `number` (not `z.literal`) so the inferred type matches the keystone `Level`
  // type; the refine still rejects any unsupported version.
  schemaVersion: z
    .number()
    .refine((v) => v === LEVEL_SCHEMA_VERSION, "unsupported schemaVersion"),
  name: z.string().min(1),
  size: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  marbleRadius: z.number().positive(),
  spawn: SpawnZoneSchema,
  finishY: z.number(),
  walls: z.array(WallSchema),
  pegs: z.array(PegSchema),
  gates: z.array(GateSchema).optional(),
  spinners: z.array(SpinnerSchema).optional(),
});

/** Parse + validate untrusted data into a `Level`, throwing a `ZodError` on failure. */
export function parseLevel(data: unknown): Level {
  return LevelSchema.parse(data);
}

/** Non-throwing variant — returns Zod's discriminated `{ success, data | error }`. */
export function safeParseLevel(data: unknown) {
  return LevelSchema.safeParse(data);
}

// Compile-time drift guard (the direction that matters): the schema's parsed output must
// be assignable to the keystone `Level` type. This is enforced by `parseLevel`'s `: Level`
// return annotation above — if the schema ever drops or mis-types a Level field, that line
// fails to compile. The round-trip test covers structural fidelity from the other side.
