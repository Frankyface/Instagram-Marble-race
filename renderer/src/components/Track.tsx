import {memo} from 'react';
import {TrackInfo} from '../types';

type TrackProps = {
  track: TrackInfo;
  scale: number;
};

/**
 * Deliberately simple flat 2D geometry (per the kickoff interview's "keep the
 * renderer simple" mandate) - two side walls and the peg obstacles, all flat
 * fills, no textures or shading.
 *
 * Memoized: `track`/`scale` are constant for an entire race (~1800 frames),
 * so without this every frame was rebuilding the same wall/obstacle divs from
 * scratch for zero visual change.
 */
function TrackComponent({track, scale}: TrackProps) {
  const wallWidth = track.wallThickness * scale;
  const trackHeight = track.length * scale;
  // pymunk's wall Segments are centered ON x=0 and x=track.width (a capsule
  // extending wallThickness/2 to each side of that centerline), not walls
  // that start there and extend inward - drawing them as inset rectangles
  // (as an earlier version of this file did) put the rendered wall visibly
  // offset from where marbles actually collide with it. Center the rendered
  // walls on the same lines the physics engine uses.
  const halfWallWidth = wallWidth / 2;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: -halfWallWidth,
          top: 0,
          width: wallWidth,
          height: trackHeight,
          backgroundColor: '#3a3a4a',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: track.width * scale - halfWallWidth,
          top: 0,
          width: wallWidth,
          height: trackHeight,
          backgroundColor: '#3a3a4a',
        }}
      />
      {track.obstacles.map((obstacle, index) => {
        const size = obstacle.radius * 2 * scale;
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: (obstacle.x - obstacle.radius) * scale,
              top: (obstacle.y - obstacle.radius) * scale,
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: '#6a6a7a',
            }}
          />
        );
      })}
    </>
  );
}

export const Track = memo(TrackComponent);
