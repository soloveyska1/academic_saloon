import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, Gift, X, ChevronRight } from 'lucide-react';
import { ConfettiExplosion } from './ConfettiExplosion';

interface Prize {
  id: string;
  label: string;
  sublabel: string;
  color: string;
  textColor: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface PremiumPrizeModalProps {
  prize: Prize;
  onClose: () => void;
  onClaim: () => void;
}

const RARITY_CONFIG = {
  common: {
    name: 'Обычный',
    gradient: 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)',
    glow: 'rgba(156, 163, 175, 0.3)',
    border: '#9CA3AF',
  },
  rare: {
    name: 'Редкий',
    gradient: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)',
    glow: 'rgba(59, 130, 246, 0.4)',
    border: '#3B82F6',
  },
  epic: {
    name: 'Эпический',
    gradient: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)',
    glow: 'rgba(124, 58, 237, 0.5)',
    border: '#7C3AED',
  },
  legendary: {
    name: 'Легендарный',
    gradient: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 50%, #D97706 100%)',
    glow: 'rgba(245, 158, 11, 0.6)',
    border: '#F59E0B',
  },
};

export const PremiumPrizeModal = ({ prize, onClose, onClaim }: PremiumPrizeModalProps) => {
  const rarityConfig = RARITY_CONFIG[prize.rarity];
  const isLegendary = prize.rarity === 'legendary';
  const isEpic = prize.rarity === 'epic' || isLegendary;

  return (
    <AnimatePresence>
      <motion.div
        className="premium-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Confetti for rare+ prizes */}
        <ConfettiExplosion
          isActive={isEpic}
          isJackpot={isLegendary}
          particleCount={isLegendary ? 100 : 60}
        />

        {/* Light rays for legendary */}
        {isLegendary && (
          <motion.div
            className="legendary-rays"
            initial={{ opacity: 0, rotate: 0 }}
            animate={{ opacity: 0.3, rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
        )}

        <motion.div
          className="premium-prize-modal"
          initial={{ scale: 0.5, opacity: 0, y: 100 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          transition={{
            type: 'spring',
            damping: 20,
            stiffness: 300,
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            borderColor: rarityConfig.border,
            boxShadow: `0 0 60px ${rarityConfig.glow}, 0 25px 50px rgba(0, 0, 0, 0.5)`,
          }}
        >
          {/* Close button */}
          <motion.button
            className="modal-close-btn"
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X size={20} />
          </motion.button>

          {/* Rarity badge */}
          <motion.div
            className="rarity-badge"
            style={{ background: rarityConfig.gradient }}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {isLegendary ? <Crown size={12} /> : <Sparkles size={12} />}
            <span>{rarityConfig.name}</span>
          </motion.div>

          {/* Prize icon */}
          <motion.div
            className="prize-icon-container"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              damping: 12,
              stiffness: 200,
              delay: 0.1,
            }}
          >
            <div
              className="prize-icon-bg"
              style={{
                background: rarityConfig.gradient,
                boxShadow: `0 0 40px ${rarityConfig.glow}`,
              }}
            >
              <motion.span
                className="prize-icon-emoji"
                animate={isLegendary ? {
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {prize.icon}
              </motion.span>
            </div>

            {/* Orbiting sparkles for legendary */}
            {isLegendary && (
              <div className="prize-sparkles">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="orbiting-sparkle"
                    animate={{
                      rotate: 360,
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'linear',
                      delay: i * 0.5,
                    }}
                    style={{
                      transformOrigin: '50px 50px',
                    }}
                  >
                    <Sparkles size={10} className="text-yellow-400" />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Title */}
          <motion.h2
            className="modal-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {isLegendary ? 'НЕВЕРОЯТНО!' : isEpic ? 'Потрясающе!' : 'Поздравляем!'}
          </motion.h2>

          {/* Prize info */}
          <motion.div
            className="prize-info"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <span
              className="prize-label"
              style={{ color: rarityConfig.border }}
            >
              {prize.label}
            </span>
            <span className="prize-sublabel">{prize.sublabel}</span>
          </motion.div>

          {/* Bonus multiplier */}
          <motion.div
            className="bonus-multiplier"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Gift size={16} />
            <span>+50 XP к вашему VIP статусу</span>
          </motion.div>

          {/* Claim button */}
          <motion.button
            className="claim-button"
            style={{
              background: rarityConfig.gradient,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.02, boxShadow: `0 8px 30px ${rarityConfig.glow}` }}
            whileTap={{ scale: 0.98 }}
            onClick={onClaim}
          >
            <span>Забрать приз</span>
            <ChevronRight size={20} />
          </motion.button>

          {/* Decorative corners */}
          <div className="modal-corner top-left" style={{ borderColor: rarityConfig.border }} />
          <div className="modal-corner top-right" style={{ borderColor: rarityConfig.border }} />
          <div className="modal-corner bottom-left" style={{ borderColor: rarityConfig.border }} />
          <div className="modal-corner bottom-right" style={{ borderColor: rarityConfig.border }} />

          {/* Floating particles */}
          <div className="modal-particles">
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className="modal-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  background: rarityConfig.border,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0.2, 0.6, 0.2],
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  delay: i * 0.2,
                  repeat: Infinity,
                }}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
