/**
 * Render a race manifest into a shareable MP4.
 *
 * Runs as a plain Node process (NOT bundled by webpack), which is why all the
 * filesystem work - reading the manifest, copying avatars into public/ -
 * lives here rather than inside src/. Composition code in src/ gets bundled
 * for the browser/headless-Chrome render context and cannot use `fs`/`path`
 * directly (discovered while wiring this up - see feature-remotion-setup.md).
 *
 * Usage: node scripts/render.mjs [--manifest <path>] [--out <path>]
 */
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
// Kept in sync by hand with src/types.ts's SUPPORTED_SCHEMA_VERSION - this
// script is a plain unbundled Node process and can't import a .ts file
// without adding a TS-execution layer, which isn't worth it for one constant.
// Bump both together whenever the manifest wire shape changes.
const SUPPORTED_SCHEMA_VERSION = 2;

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    manifest: path.join(projectRoot, '..', 'engine', 'output', 'sample_race.json'),
    out: path.join(projectRoot, 'output', 'race.mp4'),
  };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--manifest') options.manifest = path.resolve(args[i + 1]);
    if (args[i] === '--out') options.out = path.resolve(args[i + 1]);
  }
  return options;
}

/**
 * Beyond schemaVersion, checks just enough shape to fail with a clear message
 * here rather than as a confusing crash deep inside a bundled component (e.g.
 * "Cannot read properties of undefined") if a manifest is malformed or from a
 * buggy engine run. Not full schema validation - just the fields this script
 * and the composition assume are present.
 */
function validateManifestShape(manifest) {
  if (manifest.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error(
      `Race manifest schemaVersion ${manifest.schemaVersion} is not supported - ` +
        `this renderer expects ${SUPPORTED_SCHEMA_VERSION}.`,
    );
  }
  if (!Array.isArray(manifest.racers) || manifest.racers.length === 0) {
    throw new Error('Race manifest has no racers - nothing to render.');
  }
  if (!Array.isArray(manifest.frames) || manifest.frames.length === 0) {
    throw new Error('Race manifest has no frames - nothing to render.');
  }
  if (!manifest.track || typeof manifest.track.width !== 'number') {
    throw new Error('Race manifest is missing track geometry (manifest.track).');
  }
}

function prepareAssets(manifestPath) {
  const raw = fs.readFileSync(manifestPath, 'utf-8');
  const manifest = JSON.parse(raw);
  validateManifestShape(manifest);

  const publicAvatarsDir = path.join(projectRoot, 'public', 'avatars');
  fs.mkdirSync(publicAvatarsDir, {recursive: true});

  const avatarStaticPathById = {};
  for (const racer of manifest.racers) {
    const ext = path.extname(racer.avatarPath) || '.png';
    const fileName = `${racer.id}${ext}`;
    const destPath = path.join(publicAvatarsDir, fileName);
    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(racer.avatarPath, destPath);
    }
    avatarStaticPathById[racer.id] = `avatars/${fileName}`;
  }

  return {manifest, avatarStaticPathById};
}

async function main() {
  const {manifest: manifestPath, out} = parseArgs();
  console.log(`Loading manifest: ${manifestPath}`);
  const {manifest, avatarStaticPathById} = prepareAssets(manifestPath);
  console.log(`Prepared ${manifest.racers.length} avatars.`);

  console.log('Bundling Remotion project...');
  const bundleLocation = await bundle({
    entryPoint: path.join(projectRoot, 'src', 'index.ts'),
  });

  const inputProps = {manifest, avatarStaticPathById};

  console.log('Resolving composition...');
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'Race',
    inputProps,
  });

  fs.mkdirSync(path.dirname(out), {recursive: true});

  console.log(`Rendering ${composition.durationInFrames} frames at ${composition.fps}fps...`);
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: out,
    inputProps,
  });

  console.log(`Done: ${out}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
