import { useState, useCallback, useMemo } from 'react';
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

// Призы для колеса — премиальная коллекция
const PRIZES = [
  { id: 'grand', label: 'ГРАН-ПРИ', sublabel: 'Дипломная работа', color: '#722F37', textColor: '#F5E6B8', icon: '👑' },
  { id: 'gold500', label: '500 ₽', sublabel: 'Золотой бонус', color: '#1B4D3E', textColor: '#F5E6B8', icon: '💎' },
  { id: 'silver200', label: '200 ₽', sublabel: 'Серебряный бонус', color: '#2D2A24', textColor: '#F5E6B8', icon: '✨' },
  { id: 'discount50', label: '-50%', sublabel: 'VIP Скидка', color: '#722F37', textColor: '#F5E6B8', icon: '🎁' },
  { id: 'bronze100', label: '100 ₽', sublabel: 'Бронзовый бонус', color: '#1B4D3E', textColor: '#F5E6B8', icon: '⭐' },
  { id: 'discount20', label: '-20%', sublabel: 'Скидка', color: '#2D2A24', textColor: '#F5E6B8', icon: '🎯' },
  { id: 'bonus50', label: '50 ₽', sublabel: 'Бонус', color: '#722F37', textColor: '#F5E6B8', icon: '💫' },
  { id: 'discount10', label: '-10%', sublabel: 'Скидка', color: '#1B4D3E', textColor: '#F5E6B8', icon: '🌟' },
];

// Генерация позиций частиц
const generateParticles = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 8,
    duration: 10 + Math.random() * 10,
    size: 1 + Math.random() * 2,
  }));
};

export const RoulettePage = ({ user }: RoulettePageProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [attempts, setAttempts] = useState(3);
  const [currentPrize, setCurrentPrize] = useState<typeof PRIZES[0] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { playSound, initAudio } = useSound();

  // Мемоизация частиц
  const particles = useMemo(() => generateParticles(15), []);

  const handleSpin = useCallback(() => {
    if (isSpinning || attempts <= 0) return;

    initAudio();
    playSound('click');

    setIsSpinning(true);
    setAttempts(prev => prev - 1);

    // Выбираем случайный приз
    const prizeIndex = Math.floor(Math.random() * PRIZES.length);
    const prize = PRIZES[prizeIndex];

    // Через 4 секунды показываем результат
    setTimeout(() => {
      setCurrentPrize(prize);
      setIsSpinning(false);
      setShowModal(true);
      playSound('success');

      // Haptic feedback
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    }, 4000);
  }, [isSpinning, attempts, initAudio, playSound]);

  const closeModal = () => {
    setShowModal(false);
    setCurrentPrize(null);
  };

  return (
    <div className="roulette-page">
      {/* === Атмосферные слои === */}

      {/* 1. Базовый градиент */}
      <div className="roulette-bg-base" />

      {/* 2. Мягкое свечение */}
      <div className="roulette-glow" />

      {/* 3. Плавающие частицы */}
      <div className="roulette-particles">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="particle"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
            }}
            animate={{
              y: ['100vh', '-10vh'],
              opacity: [0, 0.6, 0.6, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* 4. Виньетка */}
      <div className="roulette-vignette" />

      {/* === Тикер победителей === */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <LiveWinnersTicker />
      </div>

      {/* === Основной контент === */}
      <main className="roulette-content">

        {/* Заголовок */}
        <motion.header
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="roulette-header"
        >
          <h1 className="roulette-title">Колесо Фортуны</h1>
          <div className="roulette-divider">
            <span className="divider-line" />
            <span className="divider-diamond">◆</span>
            <span className="divider-line" />
          </div>
          <p className="roulette-subtitle">Премиум Клуб Привилегий</p>
        </motion.header>

        {/* Колесо */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="roulette-wheel-container"
        >
          <FortuneWheel
            prizes={PRIZES}
            isSpinning={isSpinning}
            onSpinEnd={() => {}}
          />
        </motion.div>

        {/* Кнопка вращения */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="roulette-actions"
        >
          <button
            onClick={handleSpin}
            disabled={isSpinning || attempts <= 0}
            className="spin-button"
          >
            <span className="spin-button-text">
              {isSpinning ? 'Вращается...' : 'Вращать'}
            </span>
            {!isSpinning && (
              <motion.span
                className="spin-button-shine"
                animate={{ x: ['−100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              />
            )}
          </button>

          {/* Счётчик попыток */}
          <div className="attempts-badge">
            <span className="attempts-label">Попыток осталось</span>
            <div className="attempts-dots">
              {[...Array(3)].map((_, i) => (
                <motion.span
                  key={i}
                  className={`attempt-dot ${i < attempts ? 'active' : 'used'}`}
                  initial={{ scale: 1 }}
                  animate={i >= attempts ? { scale: 0.8, opacity: 0.3 } : {}}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Информация о пользователе */}
        {user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="roulette-user-info"
          >
            <span>Участник: {user.first_name || 'VIP Гость'}</span>
          </motion.div>
        )}

        {/* Описание призов */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="prizes-info"
        >
          <h3 className="prizes-info-title">Призовой фонд</h3>
          <div className="prizes-grid">
            {PRIZES.slice(0, 4).map((prize) => (
              <div key={prize.id} className="prize-card">
                <span className="prize-card-icon">{prize.icon}</span>
                <span className="prize-card-label">{prize.label}</span>
              </div>
            ))}
          </div>
        </motion.section>
      </main>

      {/* === Модальное окно с призом === */}
      <AnimatePresence>
        {showModal && currentPrize && (
          <PrizeModal prize={currentPrize} onClose={closeModal} />
        )}
      </AnimatePresence>
    </div>
  );
};
