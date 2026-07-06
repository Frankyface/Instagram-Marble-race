import {memo} from 'react';
import {Img} from 'remotion';
import {Placement, Racer} from '../types';
import {COMPOSITION_HEIGHT, COMPOSITION_WIDTH} from '../camera';

type PodiumProps = {
  results: Placement[];
  racersById: Record<string, Racer>;
  avatarSrcById: Record<string, string>;
};

const PLACE_ACCENT_COLORS: Record<number, string> = {
  1: '#ffd700',
  2: '#c0c0c0',
  3: '#cd7f32',
};

/**
 * Resolves feature-video-composition.md's podium open question: a simple
 * ranked list (not a literal podium graphic with stands), showing every
 * racer's placement per the v1 scope decision, not just the top 3. Row
 * height is derived from the result count so it always fits the fixed
 * video height regardless of how many racers were in the field.
 *
 * Memoized: props are constant across the whole podium phase (~150 frames),
 * so without this every frame was rebuilding ~30 identical row elements.
 */
function PodiumComponent({results, racersById, avatarSrcById}: PodiumProps) {
  const headerHeight = 160;
  const availableHeight = COMPOSITION_HEIGHT - headerHeight - 40;
  const rowHeight = Math.min(availableHeight / results.length, 90);
  const avatarSize = Math.min(rowHeight * 0.75, 64);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: '#1c1c28',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          height: headerHeight,
          display: 'flex',
          alignItems: 'center',
          color: 'white',
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: 4,
        }}
      >
        RESULTS
      </div>
      <div style={{width: COMPOSITION_WIDTH - 80}}>
        {results.map((placement) => {
          const racer = racersById[placement.id];
          const avatarSrc = avatarSrcById[placement.id];
          const accent = PLACE_ACCENT_COLORS[placement.place];
          return (
            <div
              key={placement.id}
              style={{
                height: rowHeight,
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                borderBottom: '1px solid #33334a',
                padding: '0 12px',
              }}
            >
              <div
                style={{
                  width: 56,
                  textAlign: 'right',
                  color: accent ?? '#aaaaaa',
                  fontSize: Math.min(rowHeight * 0.4, 36),
                  fontWeight: 700,
                }}
              >
                {placement.place}
              </div>
              <div
                style={{
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: accent ? `3px solid ${accent}` : '2px solid #555555',
                  flexShrink: 0,
                }}
              >
                <Img src={avatarSrc} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              </div>
              <div style={{color: 'white', fontSize: Math.min(rowHeight * 0.35, 32)}}>
                {racer?.username ?? placement.id}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const Podium = memo(PodiumComponent);
