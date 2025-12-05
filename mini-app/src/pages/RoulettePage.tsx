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
  const { playSound } = useSound();

  // Refs for hold logic
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHoldingRef = useRef(false);

  // --- "INCEPTION ALGORITHM" ---
  const startHolding = () => {
    if (gameState !== 'idle') return;
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
    if (progress > 0 && progress < 100 && navigator.vibrate) {
      if (Math.random() > 0.7) navigator.vibrate(5);
    }
  }, [progress]);

  return (
    <div className="relative w-full h-[100dvh] bg-[#050505] overflow-hidden flex flex-col items-center font-sans text-[#D4AF37]">
      {/* AMBIENT EFFECTS */}
      <div className="god-rays opacity-30"></div>
      <div className="scanlines opacity-20"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 pointer-events-none z-10"></div>

      {/* TOP TICKER */}
      <LiveWinnersTicker />

      <main className="flex-1 w-full flex flex-col items-center justify-center relative z-20 pt-12 pb-32 px-4">

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <h1 className="text-2xl font-black tracking-[0.2em] metallic-text uppercase drop-shadow-lg">
            Система Взлома
          </h1>
          <div className="text-[10px] text-[#D4AF37]/50 font-mono tracking-widest mt-1">
            SECURE_CHANNEL_ESTABLISHED
          </div>
        </motion.div>

        {/* 3D VAULT */}
        <div className="mb-6 scale-90 md:scale-100">
          <VaultLock
            state={gameState === 'landed' ? 'success' : gameState === 'spinning' ? 'spinning' : gameState === 'failed' ? 'failed' : 'idle'}
            userPhotoUrl={undefined}
          />
        </div>

        {/* PRIZE SCROLLER */}
        <div className="w-full max-w-md">
          <PrizeTicker highlightId={highlightId} state={gameState} />
        </div>

        {/* INTERACTION AREA */}
        <div className="mt-auto relative w-full max-w-xs flex flex-col items-center justify-center gap-2">
          {gameState === 'idle' && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-[10px] font-mono text-[#D4AF37]/60 tracking-[0.3em] uppercase animate-pulse"
            >
              Удерживайте для взлома
            </motion.div>
          )}

          <div className="w-full h-16 relative">
            <AnimatePresence mode='wait'>
              {gameState === 'idle' ? (
                <motion.button
                  key="hack-btn"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="relative group w-full h-full overflow-hidden rounded-sm"
                  onMouseDown={startHolding}
                  onMouseUp={stopHolding}
                  onMouseLeave={stopHolding}
                  onTouchStart={startHolding}
                  onTouchEnd={stopHolding}
                >
                  {/* Button Background */}
                  <div className="absolute inset-0 bg-[#09090b] border border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)] group-active:scale-95 transition-transform duration-100"></div>

                  {/* Progress Fill */}
                  <motion.div
                    className="absolute bottom-0 left-0 h-full bg-[#D4AF37] mix-blend-difference"
                    style={{ width: `${progress}%` }}
                  />

                  {/* Text */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <span className={`text-lg font-bold tracking-[0.2em] transition-colors ${progress > 50 ? 'text-black' : 'text-[#D4AF37]'} ${progress > 0 ? 'glitch-text' : ''}`} data-text="ВЗЛОМАТЬ">
                      {progress > 0 ? `HACKING ${Math.floor(progress)}%` : 'ВЗЛОМАТЬ СИСТЕМУ'}
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
                    <div className="text-[#D4AF37] tracking-widest text-xs font-mono animate-pulse">
                      BRUTE FORCE ATTACK IN PROGRESS...
                    </div>
                  )}
                  {gameState === 'near-miss' && (
                    <div className="text-[#FF3B30] tracking-widest text-xs font-bold font-mono">
                      WARNING: FIREWALL DETECTED
                    </div>
                  )}
                  {gameState === 'landed' && (
                    <motion.button
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full h-full bg-gradient-to-r from-[#D4AF37] to-[#FBF5B7] text-black font-black tracking-widest shadow-[0_0_30px_rgba(212,175,55,0.6)] rounded-sm uppercase"
                      onClick={() => console.log('Claimed')}
                    >
                      ЗАБРАТЬ ВЫИГРЫШ
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* FOOTER DECORATION */}
      <div className="fixed bottom-2 text-[8px] text-[#D4AF37]/20 font-mono tracking-widest z-10 pointer-events-none">
        ID: {user?.id || 'ANONYMOUS'} :: SESSION_KEY: {Math.random().toString(36).substring(7).toUpperCase()}
      </div>
    </div>
  );
};
