import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FAKE_WINNERS = [
  { name: 'Алексей К.', prize: 'СКИДКА 50%', time: '2 сек назад' },
  { name: 'Мария В.', prize: '500 БОНУСОВ', time: '5 сек назад' },
  { name: 'Дмитрий П.', prize: 'СКИДКА 10%', time: '12 сек назад' },
  { name: 'Елена С.', prize: '100 БОНУСОВ', time: '18 сек назад' },
  { name: 'Иван Р.', prize: 'СКИДКА 20%', time: '25 сек назад' },
];

export const LiveWinnersTicker = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % FAKE_WINNERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-8 bg-[var(--r-bg-deep)] border-b border-[var(--r-glass-border)] flex items-center justify-center overflow-hidden relative z-50">
      <div className="absolute left-4 text-[8px] text-[var(--r-danger)] font-sans font-bold animate-pulse tracking-widest">
        ● LIVE
      </div>

      <AnimatePresence mode='wait'>
        <motion.div
          key={currentIndex}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="text-[10px] font-sans text-[var(--r-text-primary)] tracking-widest"
        >
          <span className="opacity-70">{FAKE_WINNERS[currentIndex].name}</span>
          <span className="mx-2 text-[var(--r-gold-500)]">::</span>
          <span className="text-[var(--r-gold-300)] font-bold">{FAKE_WINNERS[currentIndex].prize}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
