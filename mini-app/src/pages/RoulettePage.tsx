import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiveWinnersTicker } from '../components/LiveWinnersTicker';
import { RouletteWheel } from '../components/RouletteWheel';
import { SpinButton } from '../components/SpinButton';
import { PrizeModal } from '../components/PrizeModal';
import { useRoulette } from '../hooks/useRoulette';
import { UserData } from '../types';
import '../styles/Roulette.css';

interface RoulettePageProps {
  user: UserData | null;
}

export const RoulettePage = ({ user }: RoulettePageProps) => {
  const { isSpinning, result, freeSpins, spin, reset, SPIN_COST } = useRoulette(user);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPrizeModal, setShowPrizeModal] = useState(false);

  // Onboarding Logic
  useEffect(() => {
    // Simulate checking if user is new to roulette
    const hasSeenOnboarding = localStorage.getItem('roulette_onboarding_seen');
    if (!hasSeenOnboarding) {
      setTimeout(() => setShowOnboarding(true), 500);
    }
  }, []);

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    localStorage.setItem('roulette_onboarding_seen', 'true');
    // TODO: Trigger "Add 500 bonuses" API call here
  };

  // Show prize modal when result arrives
  useEffect(() => {
    if (result) {
      setShowPrizeModal(true);
    }
  }, [result]);

  const handleModalClose = () => {
    setShowPrizeModal(false);
    reset();
  };

  return (
    <div className="relative w-full min-h-[100dvh] bg-[var(--bg-void)] overflow-hidden flex flex-col items-center font-sans text-[var(--text-gold)]">
      {/* AMBIENT EFFECTS */}
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 pointer-events-none z-0 mix-blend-overlay"></div>
      <div className="god-rays opacity-20"></div>

      {/* HEADER */}
      <header className="w-full p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex flex-col">
          <h1 className="text-xl font-black tracking-widest metallic-text uppercase">
            ACADEMIC<br />JACKPOT
          </h1>
          <div className="text-[10px] text-[var(--text-muted)] font-mono tracking-widest">
            PROVABLY FAIR // V.5.0
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex flex-col items-end">
          <div className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider">Balance</div>
          <div className="text-lg font-bold text-[var(--gold-400)] tabular-nums">
            {user?.bonus_balance || 0} PTS
          </div>
        </div>
      </header>

      {/* WINNERS TICKER */}
      <div className="w-full z-20 mb-4">
        <LiveWinnersTicker />
      </div>

      {/* MAIN GAME AREA */}
      <main className="flex-1 w-full flex flex-col items-center justify-center relative z-10 px-4 gap-8">

        {/* WHEEL */}
        <div className="relative scale-90 md:scale-100 transition-transform duration-500">
          <RouletteWheel isSpinning={isSpinning} result={result} />
        </div>

        {/* CONTROLS */}
        <div className="w-full max-w-xs z-30">
          <SpinButton
            onClick={spin}
            disabled={isSpinning}
            freeSpins={freeSpins}
            cost={SPIN_COST}
          />

          <div className="mt-4 text-center">
            <p className="text-[10px] text-[var(--text-muted)] font-mono tracking-widest uppercase">
              {freeSpins > 0
                ? '✨ LUCK IS ON YOUR SIDE'
                : `SPIN COST: ${SPIN_COST} BONUSES`}
            </p>
          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="w-full p-4 text-center z-10">
        <p className="text-[8px] text-[var(--text-muted)]/30 font-mono tracking-[0.3em]">
          ID: {user?.id || 'GUEST'} :: SECURE_CONNECTION
        </p>
      </footer>

      {/* MODALS */}
      <PrizeModal
        isOpen={showPrizeModal}
        result={result}
        onClose={handleModalClose}
      />

      {/* ONBOARDING MODAL */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[var(--bg-card-solid)] border border-[var(--gold-400)] rounded-2xl p-6 max-w-sm w-full text-center shadow-[var(--shadow-vault)] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[var(--gold-400)]/10 to-transparent pointer-events-none"></div>

              <div className="text-5xl mb-4 animate-bounce">🎁</div>
              <h2 className="text-2xl font-black text-[var(--gold-400)] mb-2 uppercase">Welcome Bonus</h2>
              <p className="text-[var(--text-secondary)] mb-6">
                We've added <span className="text-[var(--gold-400)] font-bold">500 BONUSES</span> to your account to get you started.
              </p>

              <button
                onClick={handleOnboardingClose}
                className="w-full py-3 bg-[var(--gold-400)] text-black font-black uppercase tracking-widest rounded-lg hover:bg-[var(--gold-300)] transition-colors shadow-[0_0_20px_rgba(212,175,55,0.4)]"
              >
                Start Playing
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
