import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiveWinnersTicker } from '../components/LiveWinnersTicker';
import { VaultLock } from '../components/VaultLock';
import { PrizeTicker } from '../components/PrizeTicker';
import { useSound } from '../hooks/useSound';
import { UserData } from '../types';
import '../styles/Roulette.css';

interface RoulettePageProps {
  user: UserData | null;
}

export const RoulettePage = ({ user }: RoulettePageProps) => {
  const [gameState, setGameState] = useState<'idle' | 'spinning' | 'near-miss' | 'landed' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const { playSound, initAudio } = useSound();

  // Refs for hold logic
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHoldingRef = useRef(false);

  // --- "INCEPTION ALGORITHM" ---
  const startHolding = () => {
    if (gameState !== 'idle') return;
    initAudio(); // Ensure audio is ready
    isHoldingRef.current = true;
    playSound('turbine');

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 1.5; // ~2 seconds to fill
        if (next >= 100) {
          clearInterval(intervalRef.current!);
          triggerSpin();
          return 100;
        }
        return next;
      });
    }, 30);
  };

  const stopHolding = () => {
    if (gameState !== 'idle') return;
    isHoldingRef.current = false;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setProgress(0);
  };

  const triggerSpin = async () => {
    setGameState('spinning');
    setProgress(0);

    // 1. Violent Spin Phase (3s)
    setTimeout(async () => {
      // 2. Near Miss Phase (The "Hook")
      setGameState('near-miss');
      setHighlightId('dip'); // 'Diploma' (Legendary)
      playSound('heavy_latch');

      // 3. The Hesitation (0.8s)
      setTimeout(() => {
        // 4. The Payoff
        playSound('glitch');
        setGameState('landed');
        setHighlightId('dsc'); // 'Discount' (Target)
        playSound('success');
      }, 800);

    }, 3000);
  };

  // --- HAPTIC FEEDBACK ---
  useEffect(() => {
    if (progress > 0 && progress < 100) {
      if (Math.random() > 0.7) {
        // Try Telegram Haptics first (Best for mobile)
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.HapticFeedback) {
          try {
            tg.HapticFeedback.impactOccurred('light');
          } catch (e) {
            // Ignore haptic errors
          }
        }
        // Fallback to navigator.vibrate (Android Chrome)
        else if (navigator.vibrate) {
          navigator.vibrate(5);
        }
      }
    }
  }, [progress]);

  return (
    <div className="relative w-full min-h-[100dvh] bg-[var(--roulette-bg)] overflow-hidden flex flex-col items-center font-sans text-[var(--roulette-text)]">
      {/* AMBIENT EFFECTS */}
      <div className="god-rays opacity-30"></div>
      <div className="scanlines opacity-20"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--roulette-bg)]/80 via-transparent to-[var(--roulette-bg)]/80 pointer-events-none z-10"></div>

      {/* MATRIX RAIN EFFECT (CSS ONLY FOR PERFORMANCE) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none z-0" style={{
        backgroundImage: 'linear-gradient(0deg, transparent 24%, var(--roulette-hacker) 25%, var(--roulette-hacker) 26%, transparent 27%, transparent 74%, var(--roulette-hacker) 75%, var(--roulette-hacker) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, var(--roulette-hacker) 25%, var(--roulette-hacker) 26%, transparent 27%, transparent 74%, var(--roulette-hacker) 75%, var(--roulette-hacker) 76%, transparent 77%, transparent)',
        backgroundSize: '50px 50px'
      }}></div>

      {/* TOP TICKER */}
      <LiveWinnersTicker />

      <main className="flex-1 w-full flex flex-col items-center justify-center relative z-20 pt-8 pb-48 px-4">

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-2"
        >
          <h1 className="text-2xl font-black tracking-[0.2em] metallic-text uppercase drop-shadow-lg">
            Система Взлома
          </h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-[var(--roulette-hacker)] animate-pulse shadow-[0_0_10px_var(--roulette-hacker)]"></div>
            <div className="text-[10px] text-[var(--roulette-text)]/50 font-mono tracking-widest">
              ЗАЩИЩЕННЫЙ_КАНАЛ :: <span className="text-[var(--roulette-danger)] animate-pulse">REC</span>
            </div>
          </div>
        </motion.div>

        {/* 3D VAULT */}
        <div className="mb-4 scale-90 md:scale-100 relative">
          {/* Holographic Circle Behind */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-[var(--roulette-gold)]/10 animate-[spin_10s_linear_infinite]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full border border-dashed border-[var(--roulette-gold)]/20 animate-[spin_15s_linear_infinite_reverse]"></div>

          <VaultLock
            state={gameState === 'landed' ? 'success' : gameState === 'spinning' ? 'spinning' : gameState === 'failed' ? 'failed' : 'idle'}
            userPhotoUrl={undefined}
          />
        </div>

        {/* PRIZE SCROLLER */}
        <div className="w-full max-w-md mb-4">
          <PrizeTicker highlightId={highlightId} state={gameState} />
        </div>

        {/* INTERACTION AREA */}
        <div className="mt-auto relative w-full max-w-xs flex flex-col items-center justify-center gap-3">

          {/* Session Timer - Urgency */}
          <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--roulette-danger)] tracking-widest bg-[var(--roulette-danger)]/10 px-3 py-1 rounded border border-[var(--roulette-danger)]/20">
            <span>СЕССИЯ_ИСТЕКАЕТ:</span>
            <span className="font-bold countdown-urgent">00:59</span>
          </div>

          {gameState === 'idle' && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-[10px] font-mono text-[var(--roulette-gold)] tracking-[0.3em] uppercase animate-pulse drop-shadow-[0_0_5px_rgba(212,175,55,0.8)]"
            >
              ▼ УДЕРЖИВАЙТЕ КНОПКУ ▼
            </motion.div>
          )}

          <div className="w-full h-16 relative z-30">
            <AnimatePresence mode='wait'>
              {gameState === 'idle' ? (
                <motion.button
                  key="hack-btn"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative group w-full h-full overflow-hidden rounded-lg border-2 border-[var(--roulette-gold)] bg-black shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                  onMouseDown={startHolding}
                  onMouseUp={stopHolding}
                  onMouseLeave={stopHolding}
                  onTouchStart={startHolding}
                  onTouchEnd={stopHolding}
                >
                  {/* Animated Background Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--roulette-gold)]/20 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>

                  {/* Progress Fill */}
                  <motion.div
                    className="absolute bottom-0 left-0 h-full bg-[var(--roulette-gold)]"
                    style={{ width: `${progress}%` }}
                  />

                  {/* Text */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 mix-blend-difference">
                    <span className={`text-xl font-black tracking-[0.2em] ${progress > 0 ? 'glitch-text' : ''}`} data-text="ВЗЛОМАТЬ">
                      {progress > 0 ? `ВЗЛОМ ${Math.floor(progress)}%` : 'ВЗЛОМАТЬ'}
                    </span>
                  </div>
                </motion.button>
              ) : (
                <motion.div
                  key="status"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center w-full h-full flex items-center justify-center"
                >
                  {gameState === 'spinning' && (
                    <div className="text-[var(--roulette-gold)] tracking-widest text-xs font-mono animate-pulse bg-black/50 px-4 py-2 rounded border border-[var(--roulette-gold)]/30">
                      &gt; ПОДБОР_ПАРОЛЯ...
                    </div>
                  )}
                  {gameState === 'near-miss' && (
                    <div className="text-[var(--roulette-danger)] tracking-widest text-xs font-bold font-mono bg-[var(--roulette-danger)]/10 px-4 py-2 rounded border border-[var(--roulette-danger)]/30 animate-shake">
                      ⚠ ОБНАРУЖЕН ФАЕРВОЛ ⚠
                    </div>
                  )}
                  {gameState === 'landed' && (
                    <motion.button
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full h-full bg-gradient-to-r from-[var(--roulette-gold)] via-[var(--roulette-gold-bright)] to-[var(--roulette-gold)] text-black font-black tracking-widest shadow-[0_0_40px_rgba(212,175,55,0.8)] rounded-lg uppercase border-2 border-white/50 relative overflow-hidden"
                      onClick={() => console.log('Claimed')}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        ЗАБРАТЬ АКТИВ <span className="text-xl">➔</span>
                      </span>
                      {/* Shine Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* FOOTER DECORATION */}
      <div className="fixed bottom-4 text-[8px] text-[var(--roulette-text)]/20 font-mono tracking-widest z-10 pointer-events-none text-center w-full">
        ID: {user?.id || 'ANONYMOUS'} :: ШИФРОВАНИЕ_V4.0
      </div>
    </div>
  );
};
