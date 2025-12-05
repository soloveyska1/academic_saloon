import { useState, useRef, useMemo } from 'react';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { LiveWinnersTicker } from '../components/LiveWinnersTicker';
import { VaultLock } from '../components/VaultLock';
import { PrizeTicker } from '../components/PrizeTicker';
import { SpinButton } from '../components/SpinButton';
import { useSound } from '../hooks/useSound';
import { UserData } from '../types';
import { spinRoulette } from '../api/userApi';
import '../styles/Roulette.css';

interface RoulettePageProps {
  user?: UserData | null;
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
  const [prizeMessage, setPrizeMessage] = useState<string | null>(null);
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
    playSound('turbine'); // Start turbine sound

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 1.5; // Speed of hacking
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
    // Stop turbine sound if needed (or let it fade)
  };

  const triggerSpin = async () => {
    setGameState('spinning');
    setProgress(0);
    playSound('click'); // Mechanical click

    try {
      // 1. Call API
      const result = await spinRoulette();

      // 2. Determine prize ID based on result
      // Mapping backend types to frontend IDs
      let prizeId = 'min'; // Default
      if (result.type === 'jackpot') prizeId = 'dip';
      else if (result.value >= 5000) prizeId = 'dsc';
      else if (result.value >= 200) prizeId = 'bon';
      else if (result.value >= 50) prizeId = 'min';
      else if (result.type === 'discount') prizeId = 'off';
      else prizeId = null; // Nothing

      // 3. Violent Spin Phase (Visuals only)
      // Wait a bit to simulate "hacking" process
      await new Promise(r => setTimeout(r, 2000));

      if (prizeId) {
        // 4. Near Miss Phase (The "Hook")
        setGameState('near-miss');
        // Simulate scrolling through prizes...
        setHighlightId('dip'); // Tease legendary
        playSound('heavy_latch');
        await new Promise(r => setTimeout(r, 600));

        setHighlightId('dsc');
        playSound('heavy_latch');
        await new Promise(r => setTimeout(r, 600));

        // 5. Land on actual prize
        setGameState('landed');
        setHighlightId(prizeId);
        setPrizeMessage(result.message);
        playSound('success');

        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      } else {
        // Failed / Nothing
        setGameState('failed');
        setHighlightId(null);
        setPrizeMessage(result.message);
        playSound('error');
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
        }
      }

      // Reset after delay
      setTimeout(() => {
        setGameState('idle');
        setHighlightId(null);
        setPrizeMessage(null);
      }, 5000);

    } catch (error) {
      console.error('Spin failed:', error);
      setGameState('idle');
      setProgress(0);
      // Show error toast?
    }
  };

  return (
    <div className="relative min-h-[200vh] bg-[#0a0a0c] overflow-x-hidden selection:bg-[var(--r-gold-500)] selection:text-black">

      {/* ═══════════════════════════════════════════════════════════════════════
          AMBIENT ATMOSPHERE — "The Vault"
          ═══════════════════════════════════════════════════════════════════════ */}

      {/* 1. Deep Void Background */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--r-bg-elevated)_0%,_#000000_100%)] opacity-60 pointer-events-none" />

      {/* 2. Floating Dust Motes (Cinematic Depth) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {dustMotes.map((mote) => (
          <motion.div
            key={mote.id}
            className="absolute rounded-full bg-[var(--r-gold-100)]"
            style={{
              left: mote.left,
              top: '110%',
              width: mote.size,
              height: mote.size,
              opacity: mote.opacity,
            }}
            animate={{
              y: '-120vh',
              opacity: [mote.opacity, 0],
            }}
            transition={{
              duration: mote.duration,
              repeat: Infinity,
              delay: mote.delay,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* 3. Live Ticker (Top Fixed) */}
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <LiveWinnersTicker />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          HERO SECTION — "The Mechanism"
          ═══════════════════════════════════════════════════════════════════════ */}

      <motion.section
        style={{
          y: heroY,
          opacity: heroOpacity,
          filter: `blur(${heroBlur}px)`,
          scale: heroScale
        }}
        className="relative h-[100dvh] flex flex-col items-center justify-center px-6 pt-20 pb-10 z-10"
      >
        {/* Title Group */}
        <div className="text-center mb-12 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-5xl md:text-7xl font-display font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[var(--r-gold-100)] to-[var(--r-gold-600)] drop-shadow-2xl">
              BLACK GOLD
            </h1>
            <div className="h-1 w-24 mx-auto mt-4 bg-gradient-to-r from-transparent via-[var(--r-gold-500)] to-transparent opacity-80" />
            <p className="mt-4 text-[var(--r-text-secondary)] font-serif italic tracking-widest text-sm uppercase">
              Закрытый клуб привилегий
            </p>
          </motion.div>
        </div>

        {/* THE VAULT LOCK (Interactive 3D Element) */}
        <div className="relative w-full max-w-[320px] aspect-square mb-12">
          <VaultLock
            state={gameState}
            userPhotoUrl={user?.username ? undefined : undefined}
          />

          {/* Result Message Overlay */}
          <AnimatePresence>
            {prizeMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
              >
                <div className="bg-black/80 backdrop-blur-md border border-[var(--r-gold-500)] px-6 py-4 rounded-xl text-center shadow-2xl">
                  <span className="text-[var(--r-gold-100)] font-bold text-lg">
                    {prizeMessage}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ACTION AREA */}
        <div className="w-full max-w-xs relative z-20">
          <SpinButton
            onMouseDown={startHolding}
            onMouseUp={stopHolding}
            disabled={gameState !== 'idle'}
            progress={progress}
          />

          {/* Helper Text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            className="text-center text-[10px] text-[var(--r-text-muted)] mt-4 font-mono uppercase tracking-[0.2em]"
          >
            {gameState === 'idle' ? 'Система готова к взлому' : 'Выполняется операция...'}
          </motion.p>
        </div>
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SCROLL CONTENT — "The Loot"
          ═══════════════════════════════════════════════════════════════════════ */}

      <section className="relative z-20 bg-gradient-to-b from-transparent to-[#050505] pb-32">
        <div className="max-w-md mx-auto px-4">

          {/* Section Header */}
          <div className="flex items-center gap-4 mb-8 opacity-80">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--r-gold-700)]" />
            <span className="font-serif text-[var(--r-gold-400)] text-xs tracking-[0.2em] uppercase">
              Доступные награды
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--r-gold-700)]" />
          </div>

          {/* Prize Ticker Component */}
          <PrizeTicker highlightId={highlightId} />

        </div>
      </section>

    </div>
  );
};
