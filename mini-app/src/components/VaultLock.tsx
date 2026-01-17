import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { isImageAvatar, normalizeAvatarUrl } from '../utils/avatar';

interface VaultLockProps {
  state: 'idle' | 'spinning' | 'near-miss' | 'landed' | 'success' | 'failed';
  userPhotoUrl?: string;
}

export const VaultLock = ({ state, userPhotoUrl }: VaultLockProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const hasMountedRef = useRef(false);
  const avatarSrc = useMemo(() => {
    if (isImageAvatar(userPhotoUrl)) {
      return normalizeAvatarUrl(userPhotoUrl);
    }
    return undefined;
  }, [userPhotoUrl]);
  const shouldShowAvatar = Boolean(avatarSrc && !avatarError);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    setAvatarLoaded(false);
    setAvatarError(false);
  }, [avatarSrc]);

  // Parallax Effect (Gyroscope/Mouse) — Subtle 3D tilt
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || state === 'spinning') return;
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX - innerWidth / 2) / 30;
      const y = (e.clientY - innerHeight / 2) / 30;
      containerRef.current.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!containerRef.current || state === 'spinning') return;
      const x = (e.gamma || 0) / 4;
      const y = (e.beta || 0) / 4;
      containerRef.current.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [state]);

  // Determine animation states
  const isSpinning = state === 'spinning' || state === 'near-miss';
  const isSuccess = state === 'success' || state === 'landed';
  const isFailed = state === 'failed';

  return (
    <div className="vault-container w-80 h-80 relative flex items-center justify-center">
      <div
        ref={containerRef}
        className="vault-lock w-full h-full relative"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* ═══════════════════════════════════════════════════════════════════════
            OUTER CASE — Watch Bezel
            ═══════════════════════════════════════════════════════════════════════ */}

        <div className="absolute inset-0 rounded-full">
          {/* Outer Shadow Ring */}
          <div className="absolute inset-[-4px] rounded-full bg-gradient-to-b from-[var(--r-gold-800)] via-[var(--r-gold-900)] to-black opacity-80" />

          {/* Main Bezel - Brushed Gold */}
          <div
            className={`absolute inset-0 rounded-full border-[14px] border-[var(--r-gold-600)] shadow-2xl brushed-metal-ring ${isSpinning ? 'animate-[spin_1.5s_linear_infinite]' : 'idle-rotate'
              }`}
          >
            {/* Bezel Markers (12 hour positions) */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-full h-full"
                style={{ transform: `rotate(${i * 30}deg)` }}
              >
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-3 bg-[var(--r-gold-300)] rounded-full shadow-sm" />
              </div>
            ))}
          </div>

          {/* Inner Bezel Ring - Polished */}
          <div className="absolute inset-4 rounded-full border-2 border-[var(--r-gold-400)] shadow-inner" />
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            MIDDLE MECHANISM — Rotating Gear Ring
            ═══════════════════════════════════════════════════════════════════════ */}

        <div className="absolute inset-8 rounded-full">
          {/* Gear Teeth Ring - анимация только при spinning */}
          <motion.div
            className="absolute inset-0 rounded-full border-[3px] border-dashed border-[var(--r-gold-500)] opacity-60"
            animate={{
              rotate: isSpinning ? 360 : 0,
            }}
            transition={{
              duration: isSpinning ? 2 : 0.5,
              repeat: isSpinning ? Infinity : 0,
              ease: 'linear',
            }}
          />

          {/* Brass Middle Ring - убрана бесконечная анимация в idle состоянии */}
          <motion.div
            className={`absolute inset-2 rounded-full bg-gradient-to-br from-[var(--r-gold-600)] via-[var(--r-gold-700)] to-[var(--r-gold-800)] shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.3)]`}
            animate={{
              rotate: isSpinning ? -720 : 0,
            }}
            transition={{
              duration: isSpinning ? 2.5 : 0.5,
              repeat: isSpinning ? Infinity : 0,
              ease: 'linear',
            }}
          >
            {/* Geneva Stripes Decoration */}
            <div className="absolute inset-0 rounded-full geneva-stripes opacity-30" />

            {/* Screw Decorations */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-full h-full"
                style={{ transform: `rotate(${i * 60}deg)` }}
              >
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gradient-to-br from-[var(--r-gold-400)] to-[var(--r-gold-700)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]">
                  <div className="absolute inset-0.5 rounded-full border-t border-[var(--r-gold-300)]" />
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            INNER MECHANISM — Obsidian Chamber
            ═══════════════════════════════════════════════════════════════════════ */}

        <div className="absolute inset-14 rounded-full">
          {/* Obsidian Background */}
          <div className="absolute inset-0 rounded-full bg-[var(--r-bg-deep)] border-4 border-[var(--r-gold-600)] shadow-[inset_0_0_30px_rgba(0,0,0,0.9),inset_0_0_60px_rgba(0,0,0,0.5)]">
            {/* Refraction Layer */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-[var(--r-glass-shine)] to-transparent opacity-40 pointer-events-none" />

            {/* Subtle Inner Glow */}
            <div
              className={`absolute inset-0 rounded-full transition-opacity duration-500 ${isSuccess ? 'opacity-100' : isFailed ? 'opacity-100' : 'opacity-0'
                }`}
              style={{
                background: isSuccess
                  ? 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)'
                  : isFailed
                    ? 'radial-gradient(circle, rgba(220,38,38,0.3) 0%, transparent 70%)'
                    : 'none',
              }}
            />
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════
              CENTER HUB — The Jewel
              ═══════════════════════════════════════════════════════════════════════ */}

          <div className="absolute inset-4 flex items-center justify-center">
            <motion.div
              className="w-28 h-28 rounded-full overflow-hidden relative"
              animate={{
                scale: isSpinning ? [1, 1.05, 1] : 1,
              }}
              transition={{
                duration: 0.5,
                repeat: isSpinning ? Infinity : 0,
              }}
            >
              {/* Hub Border Ring */}
              <div className="absolute inset-0 rounded-full border-2 border-[var(--r-gold-300)] shadow-2xl" />

              {/* Hub Content */}
              <div className="absolute inset-1 rounded-full overflow-hidden">
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--r-bg-deep)] via-black to-[var(--r-bg-deep)]">
                  {/* Jewel Lock Icon with Refraction */}
                  <div className="relative jewel-refraction">
                    {/* Base Glow */}
                    <div className="absolute inset-0 blur-xl bg-[var(--r-gold-300)] opacity-40" />

                    {/* The Jewel SVG */}
                    <svg
                      viewBox="0 0 64 64"
                      className="relative w-14 h-14 drop-shadow-[0_0_15px_rgba(212,175,55,0.6)]"
                    >
                      {/* Diamond Shape */}
                      <polygon
                        points="32,4 58,28 32,60 6,28"
                        fill="none"
                        stroke="var(--r-gold-300)"
                        strokeWidth="2"
                        className="opacity-90"
                      />
                      {/* Top Facets */}
                      <polygon
                        points="32,4 58,28 32,32 6,28"
                        fill="url(#jewelGradientTop)"
                        className="opacity-80"
                      />
                      {/* Bottom Facets */}
                      <polygon
                        points="32,32 58,28 32,60 6,28"
                        fill="url(#jewelGradientBottom)"
                        className="opacity-60"
                      />
                      {/* Center Line */}
                      <line
                        x1="6"
                        y1="28"
                        x2="58"
                        y2="28"
                        stroke="var(--r-gold-200)"
                        strokeWidth="1"
                        className="opacity-50"
                      />
                      {/* Vertical Lines */}
                      <line
                        x1="32"
                        y1="4"
                        x2="32"
                        y2="60"
                        stroke="var(--r-gold-200)"
                        strokeWidth="0.5"
                        className="opacity-30"
                      />
                      {/* Gradients */}
                      <defs>
                        <linearGradient
                          id="jewelGradientTop"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor="var(--r-gold-100)" />
                          <stop offset="50%" stopColor="var(--r-gold-300)" />
                          <stop offset="100%" stopColor="var(--r-gold-500)" />
                        </linearGradient>
                        <linearGradient
                          id="jewelGradientBottom"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor="var(--r-gold-500)" />
                          <stop offset="50%" stopColor="var(--r-gold-600)" />
                          <stop offset="100%" stopColor="var(--r-gold-700)" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
                {shouldShowAvatar ? (
                  <img
                    src={avatarSrc}
                    alt="User avatar"
                    loading="lazy"
                    className="w-full h-full object-cover mix-blend-luminosity"
                    referrerPolicy="no-referrer"
                    style={{
                      opacity: avatarLoaded ? 0.9 : 0,
                      transition: 'opacity 200ms ease',
                    }}
                    onLoad={() => setAvatarLoaded(true)}
                    onError={() => setAvatarError(true)}
                  />
                ) : null}

                {/* Scanning Line Effect */}
                <div
                  className={`absolute inset-0 pointer-events-none ${isSpinning ? 'opacity-50' : 'opacity-20'
                    }`}
                >
                  <div
                    className="absolute w-full h-1/3 bg-gradient-to-b from-transparent via-[var(--r-gold-100)] to-transparent animate-[scan_2s_linear_infinite]"
                    style={{ top: '-33%' }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            STATUS PLAQUE — Engraved Indicator
            ═══════════════════════════════════════════════════════════════════════ */}

        <motion.div
          className="absolute -bottom-20 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="glass-panel gold-edge px-8 py-3 rounded-full">
            <span
              className={`text-[10px] font-serif tracking-[0.25em] whitespace-nowrap laser-etched ${isSuccess
                  ? 'text-[var(--r-success)]'
                  : isFailed
                    ? 'text-[var(--r-danger)]'
                    : ''
                }`}
            >
              {state === 'idle' && 'ЗАЩИТА АКТИВНА'}
              {(state === 'spinning' || state === 'near-miss') && 'ДЕШИФРОВКА...'}
              {(state === 'success' || state === 'landed') && 'ДОСТУП РАЗРЕШЁН'}
              {state === 'failed' && 'ДОСТУП ЗАПРЕЩЁН'}
            </span>
          </div>

          {/* Decorative Dots */}
          <div className="flex items-center justify-center gap-2 mt-3">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`w-1 h-1 rounded-full ${isSpinning
                    ? 'bg-[var(--r-gold-300)]'
                    : isSuccess
                      ? 'bg-[var(--r-success)]'
                      : isFailed
                        ? 'bg-[var(--r-danger)]'
                        : 'bg-[var(--r-gold-600)]'
                  }`}
                animate={
                  isSpinning
                    ? {
                      opacity: [0.3, 1, 0.3],
                      scale: [0.8, 1.2, 0.8],
                    }
                    : {}
                }
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
