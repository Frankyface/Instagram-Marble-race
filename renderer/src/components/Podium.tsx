import {memo} from 'react';
import {Img, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Placement, Racer} from '../types';
import {COMPOSITION_HEIGHT, COMPOSITION_WIDTH} from '../camera';

type PodiumProps = {
  results: Placement[];
  racersById: Record<string, Racer>;
  avatarSrcById: Record<string, string>;
  /** Absolute frame at which the podium phase begins (= race frame count). */
  podiumStartFrame: number;
};

const TOP_N = 25;
const HEADER_HEIGHT = 200;
const ROW_HEIGHT = 132; // big + readable
const AVATAR = 88;

const PLACE_ACCENT_COLORS: Record<number, string> = {
  1: '#ffd700',
  2: '#c0c0c0',
  3: '#cd7f32',
};

/**
 * Results screen: shows the top 25 at a large, readable size and auto-scrolls
 * down through them over the podium phase (72+ tiny rows crammed on one screen
 * was unreadable). The header stays pinned; only the list scrolls.
 */
function PodiumComponent({results, racersById, avatarSrcById, podiumStartFrame}: PodiumProps) {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();

  const top = [...results].sort((a, b) => a.place - b.place).slice(0, TOP_N);
  const listViewport = COMPOSITION_HEIGHT - HEADER_HEIGHT;
  const contentHeight = top.length * ROW_HEIGHT;
  const maxScroll = Math.max(contentHeight - listViewport, 0);

  // Hold at the top briefly, scroll to the bottom, hold at the bottom.
  const podiumFrames = Math.max(durationInFrames - podiumStartFrame, 1);
  const local = frame - podiumStartFrame;
  const scroll = interpolate(
    local,
    [0, podiumFrames * 0.18, podiumFrames * 0.9, podiumFrames],
    [0, 0, maxScroll, maxScroll],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: '#1c1c28',
        fontFamily: 'sans-serif',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: COMPOSITION_WIDTH,
          height: HEADER_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 72,
          fontWeight: 800,
          letterSpacing: 6,
          zIndex: 2,
          background: 'linear-gradient(#1c1c28 70%, rgba(28,28,40,0))',
        }}
      >
        RESULTS
      </div>
      <div style={{position: 'absolute', top: HEADER_HEIGHT - scroll, left: 0, width: COMPOSITION_WIDTH}}>
        {top.map((placement) => {
          const racer = racersById[placement.id];
          const accent = PLACE_ACCENT_COLORS[placement.place];
          return (
            <div
              key={placement.id}
              style={{
                height: ROW_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                gap: 28,
                padding: '0 56px',
                borderBottom: '1px solid #2c2c40',
              }}
            >
              <div
                style={{
                  width: 96,
                  textAlign: 'right',
                  color: accent ?? '#8a8aa0',
                  fontSize: 60,
                  fontWeight: 800,
                }}
              >
                {placement.place}
              </div>
              <div
                style={{
                  width: AVATAR,
                  height: AVATAR,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: accent ? `5px solid ${accent}` : '3px solid #555',
                  flexShrink: 0,
                }}
              >
                <Img src={avatarSrcById[placement.id]} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              </div>
              <div style={{color: 'white', fontSize: 46, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
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
