import { useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { LiveWinnersTicker } from '../components/LiveWinnersTicker';
import { VaultLock } from '../components/VaultLock';
import { PrizeTicker } from '../components/PrizeTicker';
import { SpinButton } from '../components/SpinButton';
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

  // Parallax Scroll Hooks
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 300], [0, 150]); // Move slower
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]); // Fade out
  const heroBlur = useTransform(scrollY, [0, 300], ["0px", "10px"]); // Blur out

  // Refs for hold logic
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHoldingRef = useRef(false);

  // --- "INCEPTION ALGORITHM" (Hold to Hack) ---
  const startHolding = () => {
    if (gameState !== 'idle') return;
    initAudio();
    isHoldingRef.current = true;
    playSound('turbine');

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 1.5;
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

  return (
    <div className="relative w-full min-h-[100dvh] bg-void overflow-x-hidden text-[var(--r-text-primary)]">

      {/* --- LIVING ATMOSPHERE --- */}
      <div className="living-bg"></div>
      <div className="atmosphere-pulse"></div>

      {/* Tilt-Shift Blur (Top/Bottom) */}
      <div className="fixed top-0 left-0 w-full h-24 bg-gradient-to-b from-[var(--r-bg-base)] to-transparent z-10 pointer-events-none backdrop-blur-[1px]"></div>
      <div className="fixed bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[var(--r-bg-base)] to-transparent z-10 pointer-events-none backdrop-blur-[1px]"></div>

      {/* TOP TICKER */}
      <div className="fixed top-0 w-full z-50">
        <LiveWinnersTicker />
      </div>

      {/* --- SCROLLABLE CONTENT --- */}
      <main className="relative w-full pt-20 px-4 pb-48 flex flex-col items-center">

        {/* HERO SECTION (Parallax) */}
        <motion.div
          style={{ y: heroY, opacity: heroOpacity, filter: `blur(${heroBlur})` }}
          className="w-full flex flex-col items-center mb-12 z-0"
        >
          {/* Header Plaque */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-serif font-black tracking-[0.1em] metallic-text drop-shadow-2xl">
              THE ACADEMIC VAULT
            </h1>
            <div className="flex items-center justify-center gap-2 mt-2 opacity-70">
              <div className="w-1 h-1 rounded-full bg-[var(--r-gold-500)]"></div>
              <span className="text-[10px] font-sans tracking-[0.3em] uppercase text-[var(--r-gold-300)]">
                Secure Access V.9
              </span>
              <div className="w-1 h-1 rounded-full bg-[var(--r-gold-500)]"></div>
            </div>
          </div>

          {/* The Mechanism */}
          <VaultLock
            state={gameState === 'landed' ? 'success' : gameState === 'spinning' ? 'spinning' : gameState === 'failed' ? 'failed' : 'idle'}
            userPhotoUrl={user?.username ? undefined : undefined} // Placeholder logic
          />
        </motion.div>

        {/* PRIZE LIST (Glass Boards) */}
        <div className="w-full max-w-md z-10 relative">
          <div className="text-center mb-6 opacity-50">
            <span className="text-[10px] font-serif italic text-[var(--r-gold-300)]">
              Scroll to view potential assets
            </span>
            <div className="w-px h-8 bg-gradient-to-b from-[var(--r-gold-300)] to-transparent mx-auto mt-2"></div>
          </div>

          <PrizeTicker highlightId={highlightId} />
        </div>

      </main>

      {/* --- FIXED FOOTER (Mahogany/Marble Anchor) --- */}
      <div className="fixed bottom-0 left-0 w-full z-40">
        {/* Glassmorphism Bar */}
        <div className="absolute inset-0 bg-[var(--r-bg-deep)]/90 backdrop-blur-xl border-t border-[var(--r-glass-border)] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"></div>

        <div className="relative w-full max-w-md mx-auto px-6 py-6 flex items-center justify-between gap-4">

          {/* Status Text */}
          <div className="hidden md:block text-[10px] font-sans text-[var(--r-text-secondary)] w-24">
            ID: {user?.id || 'GUEST'}
            <br />
            <span className="text-[var(--r-hacker)]">CONNECTED</span>
          </div>

          {/* SPIN BUTTON (The Jewel) */}
          <div className="flex-1 max-w-[200px] mx-auto">
            <SpinButton
              onMouseDown={startHolding}
              onMouseUp={stopHolding}
              disabled={gameState !== 'idle'}
              progress={progress}
            />
          </div>

          {/* Session Timer */}
          <div className="hidden md:block text-[10px] font-mono text-[var(--r-danger)] w-24 text-right">
            SESSION
            <br />
            <span className="font-bold">00:59</span>
          </div>

        </div>
      </div>

    </div>
  );
};
