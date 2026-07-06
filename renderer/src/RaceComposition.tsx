import {useMemo} from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {RaceManifest} from './types';
import {COMPOSITION_WIDTH, computeCameraOffsets, getLeader, getTrackScale} from './camera';
import {Track} from './components/Track';
import {Marble} from './components/Marble';
import {Podium} from './components/Podium';
import {buildAudioCues} from './audio';

export type RaceCompositionProps = {
  manifest: RaceManifest;
  /** Racer id -> avatar path relative to public/ (e.g. "avatars/local-0.png").
   * Resolved to an actual served URL here via staticFile(), not by the caller -
   * staticFile()'s resolution depends on the bundling context, so it must run
   * inside the bundled composition, not in the Node script that prepares this map. */
  avatarStaticPathById: Record<string, string>;
};

export function RaceComposition({manifest, avatarStaticPathById}: RaceCompositionProps) {
  const frameIndex = useCurrentFrame();
  const scale = getTrackScale(manifest.track.width);
  const raceFrameCount = manifest.frames.length;
  const isPodiumPhase = frameIndex >= raceFrameCount;

  const racersById = useMemo(
    () => Object.fromEntries(manifest.racers.map((racer) => [racer.id, racer])),
    [manifest.racers],
  );
  const audioCues = useMemo(() => buildAudioCues(manifest.events), [manifest.events]);
  const resolvedAvatarSrcById = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(avatarStaticPathById).map(([id, relativePath]) => [
          id,
          staticFile(relativePath),
        ]),
      ),
    [avatarStaticPathById],
  );
  // Precomputed once: a monotonic downward camera track following the live leader.
  const cameraOffsets = useMemo(
    () => computeCameraOffsets(manifest.frames, manifest.track.length, scale),
    [manifest.frames, manifest.track.length, scale],
  );

  // raceFrameCount can be 0 for a degenerate manifest (e.g. zero racers) - guard
  // against indexing frames[-1], which would otherwise crash below.
  const currentFrame = raceFrameCount > 0 ? manifest.frames[Math.min(frameIndex, raceFrameCount - 1)] : null;
  const leader = currentFrame ? getLeader(currentFrame, manifest.track.length) : undefined;
  const cameraOffsetY = raceFrameCount > 0 ? cameraOffsets[Math.min(frameIndex, raceFrameCount - 1)] : 0;

  return (
    <AbsoluteFill style={{backgroundColor: '#0e0e18', overflow: 'hidden'}}>
      {audioCues.map((cue) => (
        <Audio key={cue.key} src={staticFile(cue.src)} volume={cue.volume} loop={cue.loop} />
      ))}
      {isPodiumPhase || !currentFrame ? (
        <Podium
          results={manifest.results}
          racersById={racersById}
          avatarSrcById={resolvedAvatarSrcById}
          podiumStartFrame={raceFrameCount}
        />
      ) : (
        <div style={{position: 'absolute', left: 0, top: -cameraOffsetY, width: COMPOSITION_WIDTH}}>
          <Track track={manifest.track} scale={scale} />
          {currentFrame.positions.map((position) => (
            <Marble
              key={position.id}
              x={position.x}
              y={position.y}
              radius={manifest.track.marbleRadius}
              scale={scale}
              avatarSrc={resolvedAvatarSrcById[position.id]}
              isLeader={position.id === leader?.id}
            />
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
}
