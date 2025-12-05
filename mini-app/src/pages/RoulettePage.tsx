import { useState, useRef, useEffect } from 'react';
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
  const [gameState, setGameState] = useState<'idle' | 'spinning' | 'near-miss' | 'landed'>('idle');
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

    playSound('turbine'); // Start rising sound

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 2; // Speed of fill
        if (next >= 100) {
          clearInterval(intervalRef.current!);
          triggerSpin();
          return 100;
        }
        return next;
      });
    }, 30); // ~33ms per tick 
  };

  const stopHolding = () => {
    if (gameState !== 'idle') return;
    isHoldingRef.current = false;
    clearInterval(intervalRef.current!);
    setProgress(0);
    // Optional: play power down sound?
  };

  const triggerSpin = async () => {
    setGameState('spinning');
    setProgress(0);

    // 1. Violent Spin
    // wait for 3 seconds of "hack"
    setTimeout(async () => {
      // 2. Near Miss
      setGameState('near-miss');
      setHighlightId('dip'); // 'Diploma' (Legendary)
      playSound('heavy_latch');

      // Wait 0.4s pause (The hesitation)
      setTimeout(() => {
        // 3. Glitch & Landing
        playSound('glitch');
        setGameState('landed');
        setHighlightId('dsc'); // 'Discount' (Target) - The actual win
        playSound('success');
      }, 600); // slightly longer than 0.4s to let the user process the 'loss'

    }, 3000);
  };

  // --- HAPTIC FEEDBACK (Mobile) ---
  useEffect(() => {
    if (progress > 0 && progress < 100 && navigator.vibrate) {
      // Vibrate increasingly? 
      // Simple pulse for now
      if (progress % 10 === 0) navigator.vibrate(10);
    }
  }, [progress]);

  return (
    <div className="relative w-full h-full bg-void overflow-hidden flex flex-col items-center">
      {/* AMBIENT EFFECTS */}
      <div className="god-rays"></div>
      <div className="scanlines"></div>

      {/* TOP TICKER */}
      <LiveWinnersTicker />

      <main className="flex-1 w-full flex flex-col items-center justify-center relative z-20 pt-10">

        {/* 3D VAULT */}
        <div className="mb-4">
          <VaultLock
            state={gameState === 'landed' ? 'success' : gameState === 'spinning' ? 'spinning' : 'idle'}
            userPhotoUrl={undefined}
          />
        </div>

        {/* PRIZE SCROLLER */}
        <PrizeTicker highlightId={highlightId} state={gameState} />

        {/* INTERACTION AREA */}
        <div className="mt-8 relative w-64 h-24 flex items-center justify-center">
          {gameState === 'idle' ? (
            <button
              className="relative group w-full h-full"
              onMouseDown={startHolding}
              onMouseUp={stopHolding}
              onMouseLeave={stopHolding}
              onTouchStart={startHolding}
              onTouchEnd={stopHolding}
            >
              {/* Button Background */}
              <div className="absolute inset-0 bg-black border border-[#D4AF37] group-active:scale-95 transition-transform duration-100 clip-path-polygon"></div>

              {/* Progress Fill */}
              <div
                className="absolute bottom-0 left-0 h-full bg-[#D4AF37]/20 transition-all duration-75 ease-linear pointer-events-none"
                style={{ width: `${progress}%` }}
              ></div>

              {/* Text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className={`text-xl font-bold tracking-[0.2em] group-active:text-[#FBF5B7] ${progress > 0 ? 'glitch-text' : 'metallic-text'}`} data-text="ВЗЛОМАТЬ">
                  ВЗЛОМАТЬ
                </span>
              </div>

              {/* Decorative Corners */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#D4AF37]"></div>
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#D4AF37]"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#D4AF37]"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#D4AF37]"></div>
            </button>
          ) : (
            <div className="text-center animate-pulse">
              {gameState === 'spinning' && <div className="text-[#D4AF37] tracking-widest text-sm">BRUTE FORCE ATTACK IN PROGRESS...</div>}
              {gameState === 'near-miss' && <div className="text-[#FF3B30] tracking-widest text-sm font-bold">WARNING: SYSTEM TRACE DETECTED</div>}
              {gameState === 'landed' && (
                <button className="px-8 py-3 bg-[#D4AF37] text-black font-bold tracking-widest hover:bg-[#FBF5B7] transition-colors shadow-[0_0_20px_#D4AF37]">
                  ЗАБРАТЬ АКТИВ
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* FOOTER DECORATION */}
      <div className="fixed bottom-4 text-[10px] text-[#D4AF37]/30 font-mono tracking-widest z-10">
        SECURE CONNECTION_V.2.0.4 :: ENCRYPTED
      </div>
    </div>
  );
};
