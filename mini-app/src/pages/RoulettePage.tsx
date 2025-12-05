import { useState, useRef, useMemo } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
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

// Generate dust mote positions
const generateDustMotes = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 15,
    duration: 12 + Math.random() * 8,
    size: 1 + Math.random() * 2,
    opacity: 0.3 + Math.random() * 0.4,
  }));
};

export const RoulettePage = ({ user }: RoulettePageProps) => {
  const [gameState, setGameState] = useState<'idle' | 'spinning' | 'near-miss' | 'landed' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const { playSound, initAudio } = useSound();

  // Memoize dust motes for performance
  const dustMotes = useMemo(() => generateDustMotes(20), []);

  // Advanced Parallax Scroll with Spring Physics
  const { scrollY } = useScroll();

  // Smooth spring configuration for liquid motion
  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };

  // Hero parallax (moves at 0.5x speed)
  const heroYRaw = useTransform(scrollY, [0, 400], [0, 200]);
  const heroY = useSpring(heroYRaw, springConfig);

  // Opacity fades from 1 to 0 as you scroll
  const heroOpacityRaw = useTransform(scrollY, [0, 300], [1, 0]);
  const heroOpacity = useSpring(heroOpacityRaw, springConfig);

  // Blur increases as you scroll
  const heroBlurRaw = useTransform(scrollY, [0, 300], [0, 15]);
  const heroBlur = useSpring(heroBlurRaw, springConfig);

  // Scale effect for depth
  const heroScaleRaw = useTransform(scrollY, [0, 400], [1, 0.95]);
  const heroScale = useSpring(heroScaleRaw, springConfig);

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

      {/* ═══════════════════════════════════════════════════════════════════════
          LIVING ATMOSPHERE LAYERS
          ═══════════════════════════════════════════════════════════════════════ */}

      {/* Base Living Background */}
      <div className="living-bg" />

      {/* Breathing Pulse Layer */}
      <div className="atmosphere-pulse" />

      {/* God Rays - Slow rotating light beams */}
      <div className="god-rays" />

      {/* Caustics Overlay (Active in Light Mode via CSS) */}
      <div className="caustics-overlay" />

      {/* Dust Motes - Floating particles */}
      <div className="dust-motes">
        {dustMotes.map((mote) => (
          <div
            key={mote.id}
            className="dust-mote"
            style={{
              left: mote.left,
              width: `${mote.size}px`,
              height: `${mote.size}px`,
              animationDelay: `${mote.delay}s`,
              animationDuration: `${mote.duration}s`,
              opacity: mote.opacity,
            }}
          />
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TILT-SHIFT DEPTH BLUR
          ═══════════════════════════════════════════════════════════════════════ */}

      <div className="tilt-shift-top" />
      <div className="tilt-shift-bottom" />

      {/* ═══════════════════════════════════════════════════════════════════════
          TOP TICKER
          ═══════════════════════════════════════════════════════════════════════ */}

      <div className="fixed top-0 w-full z-50">
        <LiveWinnersTicker />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SCROLLABLE CONTENT — Cinematic Scroll Container
          ═══════════════════════════════════════════════════════════════════════ */}

      <main className="relative w-full pt-20 px-4 pb-48 flex flex-col items-center">

        {/* HERO SECTION — Parallax Physics */}
        <motion.div
          style={{
            y: heroY,
            opacity: heroOpacity,
            scale: heroScale,
            filter: useTransform(heroBlur, (v) => `blur(${v}px)`),
          }}
          className="w-full flex flex-col items-center mb-12 z-0 will-change-transform"
        >
          {/* ═══════════════════════════════════════════════════════════════════
              HEADER PLAQUE — Engraved Title
              ═══════════════════════════════════════════════════════════════════ */}

          <div className="mb-10 text-center">
            {/* Decorative Top Line */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-16 h-px bg-gradient-to-r from-transparent via-[var(--r-gold-500)] to-transparent" />
              <div className="w-2 h-2 rotate-45 border border-[var(--r-gold-500)]" />
              <div className="w-16 h-px bg-gradient-to-r from-transparent via-[var(--r-gold-500)] to-transparent" />
            </div>

            {/* Main Title */}
            <h1 className="text-2xl md:text-3xl font-serif font-black tracking-[0.12em] metallic-text drop-shadow-2xl">
              THE GILDED VAULT
            </h1>

            {/* Subtitle Plaque */}
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--r-gold-400)] shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
              <span className="text-[10px] font-sans font-medium tracking-[0.35em] uppercase text-[var(--r-text-secondary)]">
                Digital Haute Horlogerie
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--r-gold-400)] shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
            </div>

            {/* Version Tag */}
            <div className="mt-2 text-[8px] font-mono tracking-[0.4em] text-[var(--r-text-muted)]">
              SECURE ACCESS // V.IX
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              THE MECHANISM — Swiss Watch Vault
              ═══════════════════════════════════════════════════════════════════ */}

          <VaultLock
            state={gameState === 'landed' ? 'success' : gameState === 'spinning' ? 'spinning' : gameState === 'failed' ? 'failed' : 'idle'}
            userPhotoUrl={user?.username ? undefined : undefined}
          />
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════════════
            PRIZE LIST — Glass Boards Section
            ═══════════════════════════════════════════════════════════════════════ */}

        <div className="w-full max-w-md z-10 relative">
          {/* Section Divider */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 opacity-60">
              <div className="w-8 h-px bg-gradient-to-r from-transparent to-[var(--r-gold-500)]" />
              <span className="text-[9px] font-serif italic tracking-[0.2em] text-[var(--r-gold-400)]">
                Потенциальные Награды
              </span>
              <div className="w-8 h-px bg-gradient-to-l from-transparent to-[var(--r-gold-500)]" />
            </div>
            {/* Vertical Guide Line */}
            <div className="w-px h-10 bg-gradient-to-b from-[var(--r-gold-500)] to-transparent mx-auto mt-3" />
          </div>

          <PrizeTicker highlightId={highlightId} />
        </div>

      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          FIXED FOOTER — Mahogany/Marble Anchor Bar
          ═══════════════════════════════════════════════════════════════════════ */}

      <div className="fixed bottom-0 left-0 w-full z-40">
        {/* Mahogany/Marble Background */}
        <div className="footer-bar marble-texture absolute inset-0" />

        {/* Footer Content */}
        <div className="relative w-full max-w-md mx-auto px-6 py-5 flex items-center justify-between gap-4">

          {/* Left Status Panel */}
          <div className="hidden md:flex flex-col items-start w-24">
            <span className="text-[8px] font-mono tracking-wider text-[var(--r-text-muted)] uppercase">
              Идентификатор
            </span>
            <span className="text-[10px] font-mono text-[var(--r-gold-300)] truncate max-w-full">
              {user?.id || 'ГОСТЬ'}
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--r-success)] shadow-[0_0_6px_rgba(16,185,129,0.6)] animate-pulse" />
              <span className="text-[8px] font-mono text-[var(--r-success)] tracking-wider">
                ПОДКЛЮЧЁН
              </span>
            </div>
          </div>

          {/* CENTER — The Jewel Button */}
          <div className="flex-1 max-w-[220px] mx-auto">
            <SpinButton
              onMouseDown={startHolding}
              onMouseUp={stopHolding}
              disabled={gameState !== 'idle'}
              progress={progress}
            />
          </div>

          {/* Right Status Panel */}
          <div className="hidden md:flex flex-col items-end w-24">
            <span className="text-[8px] font-mono tracking-wider text-[var(--r-text-muted)] uppercase">
              Сессия
            </span>
            <span className="text-[10px] font-mono text-[var(--r-danger)] font-semibold">
              00:59
            </span>
            <span className="text-[8px] font-mono text-[var(--r-text-muted)] mt-0.5 tracking-wider">
              ОСТАЛОСЬ
            </span>
          </div>

        </div>

        {/* Bottom Safety Line */}
        <div className="h-[env(safe-area-inset-bottom)] bg-[var(--r-bg-deep)]" />
      </div>

    </div>
  );
};
