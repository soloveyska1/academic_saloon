import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, TrendingUp, Zap } from 'lucide-react';

interface JackpotCounterProps {
  baseAmount?: number;
  growthRate?: number; // рублей в секунду
}

export const JackpotCounter = ({
  baseAmount = 125000,
  growthRate = 0.5,
}: JackpotCounterProps) => {
  const [amount, setAmount] = useState(baseAmount);
  const [isHot, setIsHot] = useState(false);

  // Анимация роста джекпота
  useEffect(() => {
    const interval = setInterval(() => {
      setAmount((prev) => {
        const growth = growthRate + Math.random() * 0.3;
        return prev + growth;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [growthRate]);

  // Периодически показываем "горячий" статус
  useEffect(() => {
    const hotInterval = setInterval(() => {
      setIsHot(true);
      setTimeout(() => setIsHot(false), 3000);
    }, 15000);

    return () => clearInterval(hotInterval);
  }, []);

  // Форматирование суммы с анимацией цифр
  const formattedAmount = useMemo(() => {
    return amount.toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }, [Math.floor(amount)]);

  const digits = formattedAmount.split('');

  return (
    <motion.div
      className="jackpot-container"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {/* Background glow */}
      <motion.div
        className="jackpot-glow"
        animate={{
          opacity: isHot ? [0.3, 0.6, 0.3] : [0.1, 0.2, 0.1],
          scale: isHot ? [1, 1.1, 1] : 1,
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />

      {/* Header */}
      <div className="jackpot-header">
        <motion.div
          animate={isHot ? { rotate: [0, -5, 5, 0] } : {}}
          transition={{ duration: 0.3, repeat: isHot ? Infinity : 0 }}
        >
          <Flame
            className={`jackpot-icon ${isHot ? 'hot' : ''}`}
            size={20}
          />
        </motion.div>
        <span className="jackpot-label">MEGA JACKPOT</span>
        <AnimatePresence>
          {isHot && (
            <motion.span
              className="jackpot-hot-badge"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
            >
              <Zap size={12} />
              HOT
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Amount display */}
      <div className="jackpot-amount">
        <span className="jackpot-currency">₽</span>
        <div className="jackpot-digits">
          {digits.map((digit, index) => (
            <motion.span
              key={`${index}-${digit}`}
              className={`jackpot-digit ${digit === ' ' || digit === ',' ? 'separator' : ''}`}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {digit}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Growth indicator */}
      <div className="jackpot-growth">
        <TrendingUp size={14} className="growth-icon" />
        <span className="growth-text">
          +{(growthRate * 10).toFixed(0)}₽ каждые 10 сек
        </span>
      </div>

      {/* Decorative elements */}
      <div className="jackpot-sparkles">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="jackpot-sparkle"
            style={{
              left: `${15 + i * 15}%`,
            }}
            animate={{
              y: [0, -10, 0],
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2,
              delay: i * 0.3,
              repeat: Infinity,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};
