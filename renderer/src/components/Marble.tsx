import {Img} from 'remotion';

type MarbleProps = {
  x: number;
  y: number;
  radius: number;
  scale: number;
  avatarSrc: string;
  isLeader: boolean;
};

/**
 * Avatar-textured circle. Circular cropping happens here via CSS
 * (border-radius + overflow: hidden) rather than upstream in Python -
 * resolves feature-remotion-setup.md's cropping open question in favor of
 * keeping the Python engine free of an image-processing dependency.
 */
export function Marble({x, y, radius, scale, avatarSrc, isLeader}: MarbleProps) {
  const size = radius * 2 * scale;
  return (
    <div
      style={{
        position: 'absolute',
        left: x * scale - size / 2,
        top: y * scale - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        border: isLeader ? `${Math.max(size * 0.06, 2)}px solid #ffd700` : '2px solid white',
        boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
        backgroundColor: '#ccc',
      }}
    >
      <Img src={avatarSrc} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
    </div>
  );
}
