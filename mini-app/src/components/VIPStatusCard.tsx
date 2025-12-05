import { motion } from 'framer-motion';
import { Crown, Star, Gem, Award, Sparkles } from 'lucide-react';

// VIP уровни с привилегиями
const VIP_LEVELS = [
  {
    id: 'bronze',
    name: 'Bronze',
    nameRu: 'Бронза',
    icon: Star,
    minXP: 0,
    maxXP: 500,
    color: '#CD7F32',
    gradient: 'linear-gradient(135deg, #CD7F32 0%, #B87333 50%, #CD7F32 100%)',
    benefits: ['1 бесплатный спин в день', '+5% к бонусам'],
    multiplier: 1,
  },
  {
    id: 'silver',
    name: 'Silver',
    nameRu: 'Серебро',
    icon: Award,
    minXP: 500,
    maxXP: 2000,
    color: '#C0C0C0',
    gradient: 'linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 50%, #A8A8A8 100%)',
    benefits: ['2 бесплатных спина в день', '+10% к бонусам', 'Приоритетная поддержка'],
    multiplier: 1.1,
  },
  {
    id: 'gold',
    name: 'Gold',
    nameRu: 'Золото',
    icon: Crown,
    minXP: 2000,
    maxXP: 5000,
    color: '#D4AF37',
    gradient: 'linear-gradient(135deg, #F5E6B8 0%, #D4AF37 50%, #B8952F 100%)',
    benefits: ['3 бесплатных спина в день', '+20% к бонусам', 'VIP скидки', 'Эксклюзивные призы'],
    multiplier: 1.2,
  },
  {
    id: 'platinum',
    name: 'Platinum',
    nameRu: 'Платина',
    icon: Gem,
    minXP: 5000,
    maxXP: 15000,
    color: '#E5E4E2',
    gradient: 'linear-gradient(135deg, #F8F8FF 0%, #E5E4E2 30%, #B8B8B8 70%, #E5E4E2 100%)',
    benefits: ['5 бесплатных спинов в день', '+35% к бонусам', 'Персональный менеджер', 'Эксклюзивные события'],
    multiplier: 1.35,
  },
  {
    id: 'diamond',
    name: 'Diamond',
    nameRu: 'Бриллиант',
    icon: Sparkles,
    minXP: 15000,
    maxXP: Infinity,
    color: '#B9F2FF',
    gradient: 'linear-gradient(135deg, #FFFFFF 0%, #B9F2FF 25%, #7DF9FF 50%, #B9F2FF 75%, #FFFFFF 100%)',
    benefits: ['Безлимитные спины', '+50% к бонусам', 'Личный консьерж', 'Приватные розыгрыши', 'Максимальный кэшбэк'],
    multiplier: 1.5,
  },
];

interface VIPStatusCardProps {
  currentXP: number;
  userName?: string;
}

export const VIPStatusCard = ({ currentXP, userName = 'VIP Гость' }: VIPStatusCardProps) => {
  // Определяем текущий уровень
  const currentLevel = VIP_LEVELS.find(
    (level) => currentXP >= level.minXP && currentXP < level.maxXP
  ) || VIP_LEVELS[0];

  const nextLevel = VIP_LEVELS[VIP_LEVELS.indexOf(currentLevel) + 1];

  // Прогресс до следующего уровня
  const progressInLevel = currentXP - currentLevel.minXP;
  const levelRange = (nextLevel?.minXP || currentLevel.maxXP) - currentLevel.minXP;
  const progressPercent = nextLevel ? Math.min((progressInLevel / levelRange) * 100, 100) : 100;

  const IconComponent = currentLevel.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="vip-status-card"
    >
      {/* Shine effect */}
      <div className="vip-card-shine" />

      {/* Header */}
      <div className="vip-card-header">
        <motion.div
          className="vip-badge"
          style={{ background: currentLevel.gradient }}
          whileHover={{ scale: 1.05 }}
          animate={{
            boxShadow: [
              `0 0 20px ${currentLevel.color}40`,
              `0 0 40px ${currentLevel.color}60`,
              `0 0 20px ${currentLevel.color}40`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <IconComponent size={24} className="vip-badge-icon" />
        </motion.div>

        <div className="vip-info">
          <span className="vip-name">{userName}</span>
          <span
            className="vip-level"
            style={{ color: currentLevel.color }}
          >
            {currentLevel.name} Member
          </span>
        </div>

        <div className="vip-xp-badge">
          <span className="vip-xp-value">{currentXP.toLocaleString()}</span>
          <span className="vip-xp-label">XP</span>
        </div>
      </div>

      {/* Progress bar */}
      {nextLevel && (
        <div className="vip-progress-section">
          <div className="vip-progress-labels">
            <span>{currentLevel.nameRu}</span>
            <span>{nextLevel.nameRu}</span>
          </div>
          <div className="vip-progress-bar">
            <motion.div
              className="vip-progress-fill"
              style={{ background: currentLevel.gradient }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            <motion.div
              className="vip-progress-glow"
              style={{
                left: `${progressPercent}%`,
                background: currentLevel.color,
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
          <div className="vip-progress-xp">
            <span>{progressInLevel.toLocaleString()}</span>
            <span>/</span>
            <span>{levelRange.toLocaleString()} XP</span>
          </div>
        </div>
      )}

      {/* Benefits preview */}
      <div className="vip-benefits">
        <span className="vip-benefits-title">Ваши привилегии</span>
        <div className="vip-benefits-list">
          {currentLevel.benefits.slice(0, 2).map((benefit, i) => (
            <motion.span
              key={i}
              className="vip-benefit-tag"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              {benefit}
            </motion.span>
          ))}
          {currentLevel.benefits.length > 2 && (
            <span className="vip-benefit-more">
              +{currentLevel.benefits.length - 2}
            </span>
          )}
        </div>
      </div>

      {/* Multiplier badge */}
      <div className="vip-multiplier">
        <span className="multiplier-label">Множитель наград</span>
        <motion.span
          className="multiplier-value"
          style={{ color: currentLevel.color }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ×{currentLevel.multiplier.toFixed(1)}
        </motion.span>
      </div>
    </motion.div>
  );
};

export { VIP_LEVELS };
