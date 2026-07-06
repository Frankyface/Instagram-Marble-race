import {RaceEvent} from './types';

export interface AudioCue {
  key: string;
  src: string;
  volume: number;
  loop: boolean;
}

/**
 * An audio subscriber inspects the race-event stream and returns cues to
 * play. v1 ships exactly one subscriber (background music, which doesn't
 * need a specific trigger - it just plays for the whole render). Future SFX
 * subscribers (collision thud, gate ding, finish stinger) plug in here by
 * reading their own event type out of `events` and returning more cues -
 * this is the "build once, extend later" seam from the kickoff interview.
 * Adding one should never require touching backgroundMusic or RaceComposition.
 */
export type AudioSubscriber = (events: RaceEvent[]) => AudioCue[];

const backgroundMusic: AudioSubscriber = () => [
  {
    key: 'background-music',
    src: 'audio/background.wav',
    volume: 0.5,
    loop: true,
  },
];

export const audioSubscribers: AudioSubscriber[] = [backgroundMusic];

export const buildAudioCues = (events: RaceEvent[]): AudioCue[] =>
  audioSubscribers.flatMap((subscriber) => subscriber(events));
