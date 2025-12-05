import { motion, useAnimation } from 'framer-motion';
import { useSound } from '../hooks/useSound';
import { useEffect } from 'react';

interface SpinButtonProps {
  onMouseDown: () => void;
  onMouseUp: () => void;
  disabled: boolean;
  progress: number;
}

export const SpinButton = ({
  onMouseDown,
  onMouseUp,
  disabled,
  progress,
}: SpinButtonProps) => {
  const { playSound } = useSound();
  const glowControls = useAnimation();

  // Animate inner glow based on progress
  useEffect(() => {
    if (progress > 0) {
      glowControls.start({
        opacity: 0.3 + (progress / 100) * 0.7,
        scale: 1 + (progress / 100) * 0.1,
      });
    } else {
      glowControls.start({
        opacity: 0,
        scale: 1,
      });
    }
  }, [progress, glowControls]);

  const handlePress = () => {
    if (disabled) return;
    playSound('click');
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
    }
    onMouseDown();
  };

  const handleRelease = () => {
    if (disabled) return;
    onMouseUp();
  };

  return (
    <motion.button
      disabled={disabled}
      onMouseDown={handlePress}
      onMouseUp={handleRelease}
      onMouseLeave={handleRelease}
      onTouchStart={handlePress}
      onTouchEnd={handleRelease}
      whileHover={!disabled ? { scale: 1.03 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      className={`
        jewel-button relative w-full h-16 rounded-full overflow-hidden
        flex items-center justify-center
        transition-all duration-300 cursor-pointer
        ${disabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}
      `}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          INNER GLOW — Intensifies on hover/press
          ═══════════════════════════════════════════════════════════════════════ */}

      <motion.div
        className="jewel-inner-glow"
        animate={glowControls}
        initial={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
          PROGRESS OVERLAY — Liquid Fill Effect
          ═══════════════════════════════════════════════════════════════════════ */}

      <motion.div
        className="absolute inset-0 origin-left pointer-events-none"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: progress / 100 }}
        transition={{
          type: 'spring',
          stiffness: 120,
          damping: 25,
        }}
        style={{
          background: `linear-gradient(
            90deg,
            rgba(251, 245, 183, 0.3) 0%,
            rgba(212, 175, 55, 0.5) 50%,
            rgba(251, 245, 183, 0.6) 100%
          )`,
        }}
      />

      {/* Progress Glow Edge */}
      {progress > 0 && (
        <motion.div
          className="absolute top-0 bottom-0 w-2 pointer-events-none"
          initial={{ left: '0%' }}
          animate={{ left: `${progress - 2}%` }}
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(251, 245, 183, 0.8), transparent)',
            boxShadow: '0 0 20px rgba(251, 245, 183, 0.6)',
          }}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SHIMMER OVERLAY — Continuous shine effect
          ═══════════════════════════════════════════════════════════════════════ */}

      <div className="shimmer-overlay" />

      {/* ═══════════════════════════════════════════════════════════════════════
          BUTTON CONTENT
          ═══════════════════════════════════════════════════════════════════════ */}

      <div className="relative z-10 flex items-center justify-center gap-3">
        {/* Icon */}
        <motion.div
          className="relative"
          animate={
            progress > 0
              ? {
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1],
                }
              : {}
          }
          transition={{
            duration: 0.3,
            repeat: progress > 0 ? Infinity : 0,
          }}
        >
          {/* Lock/Unlock Icon SVG */}
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill="none"
            stroke="var(--r-bg-base)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {progress > 50 ? (
              // Unlocking animation
              <>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </>
            ) : (
              // Locked state
              <>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </>
            )}
          </svg>
        </motion.div>

        {/* Text */}
        <div className="flex flex-col items-start leading-none">
          <span className="text-base font-serif font-black tracking-[0.15em] uppercase text-[var(--r-bg-base)] drop-shadow-sm">
            {progress > 0 ? `ВЗЛОМ ${Math.floor(progress)}%` : 'ВЗЛОМАТЬ'}
          </span>
          {progress === 0 && (
            <span className="text-[8px] font-sans tracking-[0.2em] text-[var(--r-gold-800)] mt-0.5">
              УДЕРЖИВАЙТЕ
            </span>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          BORDER GLOW — Pulse on interaction
          ═══════════════════════════════════════════════════════════════════════ */}

      {progress > 0 && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
            boxShadow: [
              '0 0 20px rgba(212, 175, 55, 0.4), inset 0 0 20px rgba(212, 175, 55, 0.2)',
              '0 0 40px rgba(212, 175, 55, 0.6), inset 0 0 30px rgba(212, 175, 55, 0.3)',
              '0 0 20px rgba(212, 175, 55, 0.4), inset 0 0 20px rgba(212, 175, 55, 0.2)',
            ],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
          }}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          CONCAVE HIGHLIGHT — Top reflection
          ═══════════════════════════════════════════════════════════════════════ */}

      <div
        className="absolute top-0 left-0 right-0 h-1/2 rounded-t-full pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
          CONCAVE SHADOW — Bottom depth
          ═══════════════════════════════════════════════════════════════════════ */}

      <div
        className="absolute bottom-0 left-0 right-0 h-1/3 rounded-b-full pointer-events-none"
        style={{
          background:
            'linear-gradient(0deg, rgba(0,0,0,0.3) 0%, transparent 100%)',
        }}
      />
    </motion.button>
  );
};
