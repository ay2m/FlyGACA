import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import styles from './CaptainAvatar.module.css';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
/** Generated expression variants (256px) that map to specific UI states. */
export type AvatarPose = 'default' | 'wave' | 'thinking' | 'hold' | 'smile';

const sizeClass: Record<AvatarSize, string> = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
  xl: styles.xl,
};

const poseSrc: Record<Exclude<AvatarPose, 'default'>, string> = {
  wave: '/img/captain/wave-256.png',
  thinking: '/img/captain/thinking-256.png',
  hold: '/img/captain/hold-256.png',
  smile: '/img/captain/smile-256.png',
};

/** The idle loop — his canonical neutral portrait, breathing/blinking. */
const liveSrc = '/img/captain/avatar-live.webp';

interface CaptainAvatarProps {
  /** Visual footprint: sm (chat reply), md (cards), lg/xl (hero/welcome). */
  size?: AvatarSize;
  /** Expression variant. `default` is the canonical neutral portrait. */
  pose?: AvatarPose;
  /** Adds the live "online" ring glow — for surfaces that present him as active. */
  glow?: boolean;
  /** Presents him as live: a subtle idle "breathing" motion + an online status dot. */
  live?: boolean;
  /**
   * Plays the animated idle loop (`avatar-live.webp`) instead of the still — the
   * real "alive" portrait. Only takes effect when `live` and motion is allowed;
   * reserve it for a single focal avatar (welcome / the most-recent reply) so a
   * long thread never runs many photoreal loops at once. Falls back to the still
   * under reduced-motion or if the loop fails to load.
   */
  animated?: boolean;
  /** Decorative use (label already supplied by adjacent text) hides it from AT. */
  decorative?: boolean;
  className?: string;
}

/**
 * Captain Adel's portrait — the one place his face is wired in, so every surface
 * (chat welcome, each reply, the home hero) draws from the same official art.
 * `pose` swaps in a generated expression (wave/thinking/hold/smile) for stateful
 * surfaces; `default` uses the canonical neutral portrait (256px inline, the full
 * 500px render at hero sizes). All ship under `public/img/captain/`. The brand
 * ring is token-driven and the glow honours reduced-motion via CSS.
 */
export function CaptainAvatar({
  size = 'md',
  pose = 'default',
  glow = false,
  live = false,
  animated = false,
  decorative = false,
  className,
}: CaptainAvatarProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  // If the loop ever fails to load (missing/oversized), drop to the still for good.
  const [loopFailed, setLoopFailed] = useState(false);

  const stillSrc =
    pose !== 'default'
      ? poseSrc[pose]
      : size === 'lg' || size === 'xl'
        ? '/img/captain/avatar.png'
        : '/img/captain/avatar-256.png';

  // The animated idle is the neutral portrait, so it overrides the pose still
  // only when asked for, the surface is live, motion is allowed, and it loads.
  const playLoop = live && animated && !reduceMotion && !loopFailed;
  const src = playLoop ? liveSrc : stillSrc;
  const alt = decorative ? '' : t('chat.avatarAlt');

  const img = (
    <img
      src={src}
      alt={alt}
      aria-hidden={decorative || undefined}
      width={256}
      height={256}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={playLoop ? () => setLoopFailed(true) : undefined}
      // CSS breathing only when live but *not* playing the loop — the WebP carries
      // its own motion, so layering the keyframe on top would double it up.
      className={`${styles.avatar} ${sizeClass[size]} ${glow ? styles.glow : ''} ${
        live && !playLoop ? styles.alive : ''
      } ${live ? '' : (className ?? '')}`}
    />
  );

  // When live, wrap so we can anchor an "online" status dot in the corner; the
  // wrapper carries the caller's layout className so existing margins still apply.
  if (live) {
    return (
      <span className={`${styles.liveWrap} ${sizeClass[size]} ${className ?? ''}`}>
        {img}
        <span className={styles.statusDot} aria-hidden="true" />
      </span>
    );
  }

  return img;
}
