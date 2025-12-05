import { motion } from 'framer-motion';
import { Flame, Gift, Check, Lock, Crown, Sparkles } from 'lucide-react';

interface DailyStreakProps {
  currentStreak: number;
  lastClaimDate?: string;
}

const STREAK_REWARDS = [
  { day: 1, reward: '50 ₽', icon: Gift, claimed: false, special: false },
  { day: 2, reward: '75 ₽', icon: Gift, claimed: false, special: false },
  { day: 3, reward: '100 ₽', icon: Gift, claimed: false, special: false },
  { day: 4, reward: '150 ₽', icon: Gift, claimed: false, special: false },
  { day: 5, reward: '200 ₽', icon: Gift, claimed: false, special: false },
  { day: 6, reward: '300 ₽', icon: Gift, claimed: false, special: false },
  { day: 7, reward: '500 ₽', icon: Crown, claimed: false, special: true },
];

export const DailyStreak = ({ currentStreak, lastClaimDate }: DailyStreakProps) => {
  // Определяем какой день можно забрать
  const today = new Date().toDateString();
  const canClaimToday = lastClaimDate !== today;
  const nextClaimDay = Math.min(currentStreak + 1, 7);

  return (
    <motion.div
      className="daily-streak-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header with flame */}
      <div className="streak-header">
        <motion.div
          className="streak-flame"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [-3, 3, -3],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Flame size={24} className="flame-icon" />
        </motion.div>
        <div className="streak-info">
          <span className="streak-title">Серия дней</span>
          <span className="streak-count">{currentStreak} {getDaysWord(currentStreak)}</span>
        </div>
        <motion.div
          className="streak-multiplier"
          animate={{ scale: currentStreak > 0 ? [1, 1.05, 1] : 1 }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles size={14} />
          <span>×{(1 + currentStreak * 0.1).toFixed(1)}</span>
        </motion.div>
      </div>

      {/* Progress bar */}
      <div className="streak-progress">
        <motion.div
          className="streak-progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStreak / 7) * 100}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>

      {/* Days grid */}
      <div className="streak-days">
        {STREAK_REWARDS.map((item, index) => {
          const isClaimed = index < currentStreak;
          const isCurrent = index === currentStreak && canClaimToday;
          const isLocked = index > currentStreak;
          const IconComponent = item.icon;

          return (
            <motion.div
              key={item.day}
              className={`streak-day ${isClaimed ? 'claimed' : ''} ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''} ${item.special ? 'special' : ''}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={isCurrent ? { scale: 1.05 } : {}}
              whileTap={isCurrent ? { scale: 0.95 } : {}}
            >
              {/* Day number */}
              <span className="day-number">День {item.day}</span>

              {/* Icon */}
              <div className="day-icon-wrapper">
                {isClaimed ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="day-check"
                  >
                    <Check size={20} />
                  </motion.div>
                ) : isLocked ? (
                  <Lock size={18} className="day-lock" />
                ) : (
                  <motion.div
                    animate={isCurrent ? {
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0],
                    } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <IconComponent size={20} className="day-gift" />
                  </motion.div>
                )}
              </div>

              {/* Reward */}
              <span className="day-reward">{item.reward}</span>

              {/* Glow for current */}
              {isCurrent && (
                <motion.div
                  className="day-glow"
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}

              {/* Special badge */}
              {item.special && (
                <div className="day-special-badge">
                  <Crown size={10} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Claim button */}
      {canClaimToday && currentStreak < 7 && (
        <motion.button
          className="streak-claim-btn"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Gift size={18} />
          <span>Забрать награду за День {nextClaimDay}</span>
        </motion.button>
      )}

      {/* Completion message */}
      {currentStreak >= 7 && (
        <motion.div
          className="streak-complete"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Crown size={20} />
          <span>Неделя завершена! Бонус ×2 ко всем наградам</span>
        </motion.div>
      )}
    </motion.div>
  );
};

// Склонение слова "день"
function getDaysWord(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'дней';
  }

  if (lastDigit === 1) {
    return 'день';
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'дня';
  }

  return 'дней';
}
