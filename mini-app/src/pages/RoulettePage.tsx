import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiveWinnersTicker } from '../components/LiveWinnersTicker';
import { FortuneWheel } from '../components/FortuneWheel';
import { PrizeModal } from '../components/PrizeModal';
import { useSound } from '../hooks/useSound';
import { UserData } from '../types';
import '../styles/Roulette.css';

interface RoulettePageProps {
  user: UserData | null;
}

// Призы для колеса
const PRIZES = [
  { id: 'grand', label: 'ГРАН-ПРИ', sublabel: 'Дипломная работа', color: '#722F37', textColor: '#F5E6B8', icon: '👑' },
  { id: 'gold500', label: '500 ₽', sublabel: 'Золотой бонус', color: '#1B4D3E', textColor: '#F5E6B8', icon: '💎' },
  { id: 'silver200', label: '200 ₽', sublabel: 'Серебряный бонус', color: '#2D2A24', textColor: '#F5E6B8', icon: '✨' },
  { id: 'discount50', label: '-50%', sublabel: 'Скидка', color: '#722F37', textColor: '#F5E6B8', icon: '🎁' },
  { id: 'bronze100', label: '100 ₽', sublabel: 'Бронзовый бонус', color: '#1B4D3E', textColor: '#F5E6B8', icon: '⭐' },
  { id: 'discount20', label: '-20%', sublabel: 'Скидка', color: '#2D2A24', textColor: '#F5E6B8', icon: '🎯' },
  { id: 'bonus50', label: '50 ₽', sublabel: 'Бонус', color: '#722F37', textColor: '#F5E6B8', icon: '💫' },
  { id: 'discount10', label: '-10%', sublabel: 'Скидка', color: '#1B4D3E', textColor: '#F5E6B8', icon: '🌟' },
];

export const RoulettePage = ({ user }: RoulettePageProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [attempts, setAttempts] = useState(3);
  const [currentPrize, setCurrentPrize] = useState<typeof PRIZES[0] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { playSound, initAudio } = useSound();

  const handleSpin = useCallback(() => {
    if (isSpinning || attempts <= 0) return;

    initAudio();
    playSound('click');

    setIsSpinning(true);
    setAttempts(prev => prev - 1);

    // Выбираем случайный приз (с весами можно усложнить)
    const prizeIndex = Math.floor(Math.random() * PRIZES.length);
    const prize = PRIZES[prizeIndex];

    // Через 4 секунды показываем результат
    setTimeout(() => {
      setCurrentPrize(prize);
      setIsSpinning(false);
      setShowModal(true);
      playSound('success');
    }, 4000);
  }, [isSpinning, attempts, initAudio, playSound]);

  const closeModal = () => {
    setShowModal(false);
    setCurrentPrize(null);
  };

  return (
    <div className="relative min-h-[100dvh] casino-bg">
      {/* Декоративные слои */}
      <div className="velvet-overlay" />
      <div className="gold-vignette" />

      {/* Тикер победителей */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <LiveWinnersTicker />
      </div>

      {/* Основной контент */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] px-4 py-20">

        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-display text-gradient mb-2">
            Колесо Фортуны
          </h1>
          <div className="ornament-line max-w-[200px] mx-auto">
            <div className="ornament-diamond" />
          </div>
          <p className="text-sm text-[var(--r-text-secondary)] mt-3 tracking-wide">
            Испытайте свою удачу
          </p>
        </motion.div>

        {/* Колесо */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <FortuneWheel
            prizes={PRIZES}
            isSpinning={isSpinning}
            onSpinEnd={() => {}}
          />
        </motion.div>

        {/* Кнопка вращения */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center gap-6"
        >
          <button
            onClick={handleSpin}
            disabled={isSpinning || attempts <= 0}
            className="spin-button"
          >
            {isSpinning ? 'Вращается...' : 'Вращать'}
          </button>

          {/* Счётчик попыток */}
          <div className="attempts-display">
            <span className="attempts-label">Попыток</span>
            <span className="attempts-count">{attempts}</span>
          </div>
        </motion.div>

        {/* Информация о пользователе */}
        {user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center"
          >
            <p className="text-xs text-[var(--r-text-muted)] tracking-wider">
              Участник: {user.first_name || 'Гость'}
            </p>
          </motion.div>
        )}
      </main>

      {/* Модальное окно с призом */}
      <AnimatePresence>
        {showModal && currentPrize && (
          <PrizeModal prize={currentPrize} onClose={closeModal} />
        )}
      </AnimatePresence>
    </div>
  );
};
