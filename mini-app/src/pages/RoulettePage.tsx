import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, Gift, Star, Zap, Trophy, ChevronDown } from 'lucide-react';
import { LiveWinnersTicker } from '../components/LiveWinnersTicker';
import { PremiumFortuneWheel } from '../components/PremiumFortuneWheel';
import { PremiumPrizeModal } from '../components/PremiumPrizeModal';
import { VIPStatusCard } from '../components/VIPStatusCard';
import { JackpotCounter } from '../components/JackpotCounter';
import { DailyStreak } from '../components/DailyStreak';
import { ConfettiExplosion } from '../components/ConfettiExplosion';
import { useSound } from '../hooks/useSound';
import { UserData } from '../types';
import '../styles/Roulette.css';
import '../styles/PremiumClub.css';

interface RoulettePageProps {
  user: UserData | null;
}

// Премиальные призы с редкостью
const PREMIUM_PRIZES = [
  { id: 'jackpot', label: 'ДЖЕКПОТ', sublabel: '50 000 ₽', color: '#7C3AED', textColor: '#F5E6B8', icon: '👑', rarity: 'legendary' as const },
  { id: 'mega', label: '10 000 ₽', sublabel: 'Мега-бонус', color: '#1B4D3E', textColor: '#F5E6B8', icon: '💎', rarity: 'epic' as const },
  { id: 'super', label: '5 000 ₽', sublabel: 'Супер-бонус', color: '#722F37', textColor: '#F5E6B8', icon: '🔥', rarity: 'epic' as const },
  { id: 'gold', label: '1 000 ₽', sublabel: 'Золотой бонус', color: '#2D2A24', textColor: '#F5E6B8', icon: '✨', rarity: 'rare' as const },
  { id: 'silver', label: '500 ₽', sublabel: 'Серебряный бонус', color: '#1B4D3E', textColor: '#F5E6B8', icon: '⭐', rarity: 'rare' as const },
  { id: 'bronze', label: '200 ₽', sublabel: 'Бронзовый бонус', color: '#722F37', textColor: '#F5E6B8', icon: '🎁', rarity: 'common' as const },
  { id: 'bonus100', label: '100 ₽', sublabel: 'Бонус', color: '#2D2A24', textColor: '#F5E6B8', icon: '💫', rarity: 'common' as const },
  { id: 'bonus50', label: '50 ₽', sublabel: 'Мини-бонус', color: '#1B4D3E', textColor: '#F5E6B8', icon: '🌟', rarity: 'common' as const },
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
  const [currentPrize, setCurrentPrize] = useState<typeof PREMIUM_PRIZES[0] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [userXP, setUserXP] = useState(1250); // Demo XP
  const [currentStreak, setCurrentStreak] = useState(4); // Demo streak
  const [activeSection, setActiveSection] = useState<'wheel' | 'rewards'>('wheel');
  const { playSound, initAudio } = useSound();

  // Мемоизация частиц
  const particles = useMemo(() => generateParticles(20), []);

  // Intro animation state
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleSpin = useCallback(() => {
    if (isSpinning || attempts <= 0) return;

    initAudio();
    playSound('click');

    setIsSpinning(true);
    setAttempts(prev => prev - 1);

    // Haptic на старт
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
  }, [isSpinning, attempts, initAudio, playSound]);

  const handleSpinEnd = useCallback(() => {
    // Выбираем случайный приз с весами (в реальном приложении это от сервера)
    const weights = [1, 10, 50, 200, 500, 1000, 2000, 3000];
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    let prizeIndex = 0;
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        prizeIndex = i;
        break;
      }
    }

    const prize = PREMIUM_PRIZES[prizeIndex];
    setCurrentPrize(prize);
    setIsSpinning(false);
    setShowModal(true);

    // Показываем конфетти для редких призов
    if (prize.rarity === 'epic' || prize.rarity === 'legendary') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }

    // Добавляем XP
    setUserXP(prev => prev + 50);

    playSound('success');

    // Haptic feedback
    if (window.Telegram?.WebApp?.HapticFeedback) {
      if (prize.rarity === 'legendary') {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      } else if (prize.rarity === 'epic') {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      } else {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
      }
    }
  }, [playSound]);

  const closeModal = () => {
    setShowModal(false);
    setCurrentPrize(null);
  };

  const handleClaim = () => {
    // В реальном приложении здесь отправка на сервер
    closeModal();
    playSound('success');
  };

  return (
    <div className="premium-club-page">
      {/* === Intro Animation === */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            className="club-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 10 }}
            >
              <Crown size={64} className="intro-icon" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="intro-title"
            >
              Premium Club
            </motion.h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === Атмосферные слои === */}
      <div className="club-bg-base" />
      <div className="club-glow" />

      <div className="club-particles">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="particle gold"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
            }}
            animate={{
              y: ['100vh', '-10vh'],
              opacity: [0, 0.8, 0.8, 0],
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

      <div className="club-vignette" />

      {/* === Тикер победителей === */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <LiveWinnersTicker />
      </div>

      {/* === Confetti === */}
      <ConfettiExplosion isActive={showConfetti} />

      {/* === Основной контент === */}
      <main className="club-content">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: showIntro ? 2 : 0 }}
          className="club-header"
        >
          <div className="club-header-top">
            <div className="club-brand">
              <Crown className="brand-icon" size={24} />
              <div className="brand-text">
                <h1 className="club-title">Premium Club</h1>
                <span className="club-tagline">Эксклюзивные привилегии</span>
              </div>
            </div>
            <motion.div
              className="vip-quick-badge"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Star size={14} fill="currentColor" />
              <span>VIP</span>
            </motion.div>
          </div>
        </motion.header>

        {/* VIP Status Card */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: showIntro ? 2.2 : 0.2 }}
        >
          <VIPStatusCard
            currentXP={userXP}
            userName={user?.first_name || 'VIP Гость'}
          />
        </motion.section>

        {/* Section Toggle */}
        <motion.div
          className="section-toggle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: showIntro ? 2.4 : 0.4 }}
        >
          <button
            className={`toggle-btn ${activeSection === 'wheel' ? 'active' : ''}`}
            onClick={() => setActiveSection('wheel')}
          >
            <Sparkles size={16} />
            <span>Колесо Фортуны</span>
          </button>
          <button
            className={`toggle-btn ${activeSection === 'rewards' ? 'active' : ''}`}
            onClick={() => setActiveSection('rewards')}
          >
            <Gift size={16} />
            <span>Награды</span>
          </button>
        </motion.div>

        {/* Wheel Section */}
        <AnimatePresence mode="wait">
          {activeSection === 'wheel' && (
            <motion.div
              key="wheel"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.3 }}
              className="wheel-section"
            >
              {/* Jackpot Counter */}
              <JackpotCounter baseAmount={125000} growthRate={0.5} />

              {/* Wheel */}
              <div className="wheel-area">
                <PremiumFortuneWheel
                  prizes={PREMIUM_PRIZES}
                  isSpinning={isSpinning}
                  onSpinEnd={handleSpinEnd}
                />
              </div>

              {/* Spin Button */}
              <motion.div
                className="spin-section"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <motion.button
                  onClick={handleSpin}
                  disabled={isSpinning || attempts <= 0}
                  className="premium-spin-button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.span
                    className="spin-button-glow"
                    animate={{
                      opacity: [0.5, 1, 0.5],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="spin-button-content">
                    <Zap size={20} className="spin-icon" />
                    <span className="spin-text">
                      {isSpinning ? 'Вращается...' : 'Крутить'}
                    </span>
                  </span>
                  <motion.span
                    className="spin-button-shine"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  />
                </motion.button>

                {/* Attempts counter */}
                <div className="attempts-container">
                  <span className="attempts-label">Попытки</span>
                  <div className="attempts-gems">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className={`attempt-gem ${i < attempts ? 'active' : 'used'}`}
                        initial={{ scale: 1 }}
                        animate={i < attempts ? {
                          scale: [1, 1.1, 1],
                          boxShadow: ['0 0 10px #D4AF37', '0 0 20px #D4AF37', '0 0 10px #D4AF37'],
                        } : { scale: 0.8, opacity: 0.3 }}
                        transition={{ duration: 2, repeat: i < attempts ? Infinity : 0, delay: i * 0.3 }}
                      >
                        <Star size={12} fill={i < attempts ? '#D4AF37' : '#4a4a4a'} />
                      </motion.div>
                    ))}
                  </div>
                  {attempts === 0 && (
                    <motion.span
                      className="attempts-refill"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      Обновление через 23:59:59
                    </motion.span>
                  )}
                </div>
              </motion.div>

              {/* Prize preview cards */}
              <motion.div
                className="prize-preview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <h3 className="preview-title">
                  <Trophy size={16} />
                  <span>Главные призы</span>
                </h3>
                <div className="preview-grid">
                  {PREMIUM_PRIZES.slice(0, 4).map((prize, i) => (
                    <motion.div
                      key={prize.id}
                      className={`preview-card rarity-${prize.rarity}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.9 + i * 0.1 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                    >
                      <span className="preview-icon">{prize.icon}</span>
                      <span className="preview-label">{prize.label}</span>
                      <span className={`rarity-badge ${prize.rarity}`}>
                        {prize.rarity === 'legendary' ? 'Легенда' :
                          prize.rarity === 'epic' ? 'Эпик' :
                            prize.rarity === 'rare' ? 'Редкий' : ''}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeSection === 'rewards' && (
            <motion.div
              key="rewards"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="rewards-section"
            >
              {/* Daily Streak */}
              <DailyStreak
                currentStreak={currentStreak}
                lastClaimDate={new Date().toDateString()}
              />

              {/* Quick rewards */}
              <div className="quick-rewards">
                <h3 className="rewards-title">
                  <Gift size={18} />
                  <span>Дополнительные бонусы</span>
                </h3>

                <div className="reward-cards">
                  <motion.div
                    className="reward-card"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="reward-icon-wrap">
                      <Zap size={24} />
                    </div>
                    <div className="reward-info">
                      <span className="reward-name">Бонус за активность</span>
                      <span className="reward-desc">+100 XP за каждый заказ</span>
                    </div>
                    <ChevronDown className="reward-arrow" size={20} />
                  </motion.div>

                  <motion.div
                    className="reward-card"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="reward-icon-wrap purple">
                      <Crown size={24} />
                    </div>
                    <div className="reward-info">
                      <span className="reward-name">Реферальный бонус</span>
                      <span className="reward-desc">500₽ за каждого друга</span>
                    </div>
                    <ChevronDown className="reward-arrow" size={20} />
                  </motion.div>

                  <motion.div
                    className="reward-card"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="reward-icon-wrap green">
                      <Star size={24} />
                    </div>
                    <div className="reward-info">
                      <span className="reward-name">VIP Кэшбэк</span>
                      <span className="reward-desc">До 15% с каждого заказа</span>
                    </div>
                    <ChevronDown className="reward-arrow" size={20} />
                  </motion.div>
                </div>
              </div>

              {/* Achievements preview */}
              <div className="achievements-preview">
                <h3 className="achievements-title">
                  <Trophy size={18} />
                  <span>Достижения</span>
                </h3>
                <div className="achievement-badges">
                  {[
                    { icon: '🎯', name: 'Первый спин', done: true },
                    { icon: '🔥', name: 'Серия 7 дней', done: false },
                    { icon: '💎', name: 'VIP Gold', done: false },
                    { icon: '👑', name: 'Джекпот', done: false },
                  ].map((ach, i) => (
                    <motion.div
                      key={i}
                      className={`achievement-badge ${ach.done ? 'done' : 'locked'}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <span className="ach-icon">{ach.icon}</span>
                      <span className="ach-name">{ach.name}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User info */}
        {user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="club-user-info"
          >
            <span>Участник: {user.first_name || 'VIP Гость'}</span>
          </motion.div>
        )}
      </main>

      {/* === Prize Modal === */}
      <AnimatePresence>
        {showModal && currentPrize && (
          <PremiumPrizeModal
            prize={currentPrize}
            onClose={closeModal}
            onClaim={handleClaim}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
