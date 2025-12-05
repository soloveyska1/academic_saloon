import { motion } from 'framer-motion';

interface Prize {
  id: string;
  label: string;
  sublabel: string;
  color: string;
  textColor: string;
  icon: string;
}

interface PrizeModalProps {
  prize: Prize;
  onClose: () => void;
}

export const PrizeModal = ({ prize, onClose }: PrizeModalProps) => {
  return (
    <motion.div
      className="prize-modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="prize-modal relative"
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 50 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Иконка приза */}
        <motion.div
          className="prize-icon"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
        >
          {prize.icon}
        </motion.div>

        {/* Заголовок */}
        <motion.h2
          className="prize-title"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Поздравляем!
        </motion.h2>

        {/* Название приза */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-2"
        >
          <span
            className="text-2xl font-display font-bold"
            style={{ color: 'var(--r-gold-200)' }}
          >
            {prize.label}
          </span>
        </motion.div>

        {/* Подзаголовок */}
        <motion.p
          className="prize-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {prize.sublabel}
        </motion.p>

        {/* Кнопка */}
        <motion.button
          className="spin-button"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={onClose}
        >
          Забрать
        </motion.button>

        {/* Декоративные частицы */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[20px]">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-[var(--r-gold-400)] rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100],
                opacity: [1, 0],
                scale: [1, 0],
              }}
              transition={{
                duration: 2,
                delay: i * 0.1,
                repeat: Infinity,
                repeatDelay: 1,
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};
