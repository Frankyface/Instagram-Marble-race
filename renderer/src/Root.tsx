import {Composition} from 'remotion';
import {RaceComposition} from './RaceComposition';
import {COMPOSITION_HEIGHT, COMPOSITION_WIDTH} from './camera';
import {raceInputPropsSchema} from './schema';
import {RaceManifest} from './types';

const PODIUM_DURATION_SECONDS = 5;

// Minimal placeholder so `remotion studio` has something valid to preview
// without needing a Node-side manifest load (this file gets bundled for the
// browser - no fs access here, see scripts/render.mjs for the real path).
// Pass a real manifest via --props when rendering for an actual race.
const PLACEHOLDER_MANIFEST: RaceManifest = {
  schemaVersion: 2,
  raceId: 'placeholder',
  seed: 0,
  fps: 30,
  track: {width: 800, length: 1200, wallThickness: 20, marbleRadius: 15, obstacles: []},
  racers: [{id: 'placeholder-1', username: 'placeholder', avatarPath: ''}],
  frames: [{t: 0, positions: [{id: 'placeholder-1', x: 400, y: 0}]}],
  events: [{t: 0, type: 'race_complete', payload: {}}],
  results: [{id: 'placeholder-1', place: 1}],
};

export function RemotionRoot() {
  return (
    <Composition
      id="Race"
      component={RaceComposition}
      schema={raceInputPropsSchema}
      durationInFrames={300}
      fps={30}
      width={COMPOSITION_WIDTH}
      height={COMPOSITION_HEIGHT}
      defaultProps={{manifest: PLACEHOLDER_MANIFEST, avatarStaticPathById: {}}}
      calculateMetadata={({props}) => {
        const podiumFrames = Math.round(PODIUM_DURATION_SECONDS * props.manifest.fps);
        return {
          durationInFrames: props.manifest.frames.length + podiumFrames,
          fps: props.manifest.fps,
          width: COMPOSITION_WIDTH,
          height: COMPOSITION_HEIGHT,
        };
      }}
    />
  );
}
