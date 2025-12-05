import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE GOLDEN REVEAL — Cinematic Splash Screen
 * Award-Winning Motion Design
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number; // Minimum time to show splash (ms)
}

export const SplashScreen = ({ onComplete, minDuration = 4500 }: SplashScreenProps) => {
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);
  const [shouldAnimate, setShouldAnimate] = useState(true);

  // Check if user has seen intro this session
  useEffect(() => {
    const hasSeenIntro = sessionStorage.getItem('as_intro_seen');
    if (hasSeenIntro) {
      setShouldAnimate(false);
      // Quick fade for returning users
      setTimeout(() => onComplete(), 600);
      return;
    }

    // Mark as seen for this session
    sessionStorage.setItem('as_intro_seen', 'true');

    // === THE GOLDEN REVEAL SEQUENCE ===
    const runSequence = async () => {
      // Stage 0: Initial render (text appears)
      await delay(300);

      // Stage 1: Text shimmer plays (2 seconds)
      setStage(1);
      await delay(2000);

      // Stage 2: Line draws + Seal appears (2 seconds)
      setStage(2);
      await delay(2200);

      // Stage 3: Portal exit
      setStage(3);
      await delay(1000); // Exit animation duration

      onComplete();
    };

    runSequence();
  }, [onComplete]);

  // Quick exit for returning users
  if (!shouldAnimate) {
    return (
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#030303]"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <GoldenMonogram />
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      {stage < 3 ? (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{ background: '#030303' }}
          exit={{
            scale: 15,
            opacity: 0,
          }}
          transition={{
            duration: 0.9,
            ease: [0.76, 0, 0.24, 1], // Custom easeInOutQuart
          }}
        >
          {/* === VIGNETTE OVERLAY === */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.8) 100%)',
            }}
          />

          {/* === AMBIENT GLOW === */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: stage >= 1 ? 0.6 : 0 }}
            transition={{ duration: 1.5 }}
            style={{
              background: 'radial-gradient(ellipse 60% 40% at 50% 45%, rgba(212,175,55,0.08) 0%, transparent 70%)',
            }}
          />

          {/* === MAIN CONTENT GROUP === */}
          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {/* === STAGE 1: SHIMMERING TEXT === */}
            <ShimmeringTitle active={stage >= 1} />

            {/* === STAGE 2: THE GOLDEN LINE === */}
            <motion.div
              className="relative h-[1px] mt-6 mb-8 overflow-hidden"
              initial={{ width: 0 }}
              animate={{ width: stage >= 2 ? 280 : 0 }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Line glow */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, #FCF6BA 50%, transparent 100%)',
                  boxShadow: '0 0 20px rgba(252,246,186,0.5)',
                }}
              />
            </motion.div>

            {/* === STAGE 2: THE GOLDEN SEAL === */}
            <AnimatePresence>
              {stage >= 2 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.8,
                    ease: [0.25, 0.46, 0.45, 0.94],
                    delay: 0.3
                  }}
                >
                  <GoldenSeal />
                </motion.div>
              )}
            </AnimatePresence>

            {/* === TAGLINE === */}
            <motion.p
              className="mt-8 font-serif text-xs tracking-[0.4em] uppercase"
              style={{ color: 'rgba(212,175,55,0.4)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: stage >= 2 ? 1 : 0 }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              Премиум Клуб
            </motion.p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

/**
 * SHIMMERING TITLE COMPONENT
 * Text with moving light reflection effect
 */
const ShimmeringTitle = ({ active }: { active: boolean }) => {
  return (
    <div className="relative">
      {/* Base text (darker gold) */}
      <h1
        className="font-serif text-3xl md:text-5xl font-bold tracking-[0.2em] md:tracking-[0.3em]"
        style={{
          color: '#5C4915',
          textShadow: '0 2px 10px rgba(0,0,0,0.5)',
        }}
      >
        ACADEMIC SALOON
      </h1>

      {/* Shimmer overlay */}
      <motion.h1
        className="absolute inset-0 font-serif text-3xl md:text-5xl font-bold tracking-[0.2em] md:tracking-[0.3em]"
        style={{
          background: 'linear-gradient(90deg, #46351D 0%, #46351D 40%, #FCF6BA 50%, #46351D 60%, #46351D 100%)',
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
        initial={{ backgroundPosition: '-100% 0' }}
        animate={active ? { backgroundPosition: '200% 0' } : {}}
        transition={{
          duration: 2,
          ease: 'easeInOut',
          repeat: active ? Infinity : 0,
          repeatDelay: 0.5,
        }}
      >
        ACADEMIC SALOON
      </motion.h1>

      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: active ? [0.3, 0.6, 0.3] : 0 }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(252,246,186,0.3), transparent)',
        }}
      />
    </div>
  );
};

/**
 * GOLDEN SEAL COMPONENT
 * Rotating typographic emblem with AS monogram
 */
const GoldenSeal = () => {
  return (
    <div className="relative w-32 h-32 md:w-40 md:h-40">
      {/* Ambient glow */}
      <div
        className="absolute inset-[-20px] rounded-full blur-2xl"
        style={{
          background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 70%)',
        }}
      />

      {/* Rotating text ring */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{
          duration: 12,
          ease: 'linear',
          repeat: Infinity,
        }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <linearGradient id="sealGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#BF953F" />
              <stop offset="50%" stopColor="#FCF6BA" />
              <stop offset="100%" stopColor="#B38728" />
            </linearGradient>
          </defs>

          {/* Circular path for text */}
          <path
            id="sealCirclePath"
            d="M 100, 100 m -70, 0 a 70,70 0 1,1 140,0 a 70,70 0 1,1 -140,0"
            fill="none"
          />

          {/* Rotating text */}
          <text
            className="font-serif text-[11px] font-semibold"
            style={{ letterSpacing: '0.25em' }}
          >
            <textPath
              href="#sealCirclePath"
              startOffset="0%"
              fill="url(#sealGoldGradient)"
            >
              ACADEMIC • SALOON • PREMIUM • CLUB •
            </textPath>
          </text>
        </svg>
      </motion.div>

      {/* Center monogram */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Inner ring */}
        <motion.div
          className="absolute w-16 h-16 md:w-20 md:h-20 rounded-full"
          style={{
            border: '1px solid rgba(252,246,186,0.3)',
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Monogram */}
        <motion.span
          className="font-serif text-2xl md:text-3xl font-bold"
          style={{
            background: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 50%, #B38728 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            textShadow: '0 0 30px rgba(212,175,55,0.3)',
          }}
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          AS
        </motion.span>
      </div>
    </div>
  );
};

/**
 * GOLDEN MONOGRAM (Quick version for returning users)
 */
const GoldenMonogram = () => (
  <div className="flex flex-col items-center">
    <span
      className="font-serif text-4xl font-bold"
      style={{
        background: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 50%, #B38728 100%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
      }}
    >
      AS
    </span>
  </div>
);

/**
 * Helper: Delay function
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default SplashScreen;
