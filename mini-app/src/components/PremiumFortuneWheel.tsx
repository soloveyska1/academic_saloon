import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Prize {
  id: string;
  label: string;
  sublabel: string;
  color: string;
  textColor: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface PremiumFortuneWheelProps {
  prizes: Prize[];
  isSpinning: boolean;
  targetPrizeIndex?: number;
  onSpinEnd: () => void;
}

// Цвета по редкости
const RARITY_GLOW = {
  common: 'rgba(200, 200, 200, 0.3)',
  rare: 'rgba(30, 144, 255, 0.4)',
  epic: 'rgba(147, 112, 219, 0.5)',
  legendary: 'rgba(255, 215, 0, 0.6)',
};

export const PremiumFortuneWheel = ({
  prizes,
  isSpinning,
  targetPrizeIndex,
  onSpinEnd,
}: PremiumFortuneWheelProps) => {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const segmentAngle = 360 / prizes.length;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Tick sound simulation
  useEffect(() => {
    if (isSpinning && !isAnimating) {
      setIsAnimating(true);

      // Рассчитываем конечную позицию
      const spins = 6 + Math.random() * 2; // 6-8 оборотов
      const targetIndex = targetPrizeIndex ?? Math.floor(Math.random() * prizes.length);

      // Угол для остановки на нужном призе
      // Указатель сверху (0 градусов), поэтому нужно вычислить правильный угол
      const targetAngle = 360 - (targetIndex * segmentAngle + segmentAngle / 2);
      const totalRotation = rotation + spins * 360 + targetAngle;

      setRotation(totalRotation);
    }
  }, [isSpinning]);

  // Сброс состояния анимации после завершения
  const handleAnimationComplete = () => {
    if (isAnimating) {
      setIsAnimating(false);
      onSpinEnd();
    }
  };

  const wheelSize = 300;
  const radius = wheelSize / 2;

  return (
    <div className="premium-wheel-stage">
      {/* Outer decorative ring with gems */}
      <div className="wheel-outer-ring">
        {[...Array(24)].map((_, i) => {
          const angle = (i * 360) / 24;
          const rad = (angle * Math.PI) / 180;
          const x = 50 + 49 * Math.cos(rad);
          const y = 50 + 49 * Math.sin(rad);
          const isGold = i % 3 === 0;

          return (
            <motion.div
              key={i}
              className={`wheel-gem ${isGold ? 'gold' : 'silver'}`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
              }}
              animate={isSpinning ? {
                scale: [1, 1.3, 1],
                opacity: [0.6, 1, 0.6],
              } : {
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: isSpinning ? 0.15 : 2,
                delay: i * (isSpinning ? 0.02 : 0.1),
                repeat: Infinity,
              }}
            />
          );
        })}
      </div>

      {/* Premium frame with 3D effect */}
      <div className="wheel-premium-frame">
        <div className="wheel-frame-inner">
          {/* Elegant pointer */}
          <div className="wheel-premium-pointer">
            <motion.div
              className="pointer-gem"
              animate={isSpinning ? {
                scale: [1, 1.2, 1],
                boxShadow: [
                  '0 0 10px #D4AF37',
                  '0 0 25px #D4AF37',
                  '0 0 10px #D4AF37',
                ],
              } : {}}
              transition={{ duration: 0.2, repeat: Infinity }}
            />
            <svg viewBox="0 0 50 60" className="pointer-shape">
              <defs>
                <linearGradient id="pointerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#F5E6B8" />
                  <stop offset="50%" stopColor="#D4AF37" />
                  <stop offset="100%" stopColor="#9A7B24" />
                </linearGradient>
                <filter id="pointerShadow">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.5" />
                </filter>
              </defs>
              <path
                d="M25 0 L50 55 L25 45 L0 55 Z"
                fill="url(#pointerGradient)"
                filter="url(#pointerShadow)"
              />
            </svg>
          </div>

          {/* The wheel itself */}
          <motion.div
            className="premium-wheel"
            style={{ width: wheelSize, height: wheelSize }}
            animate={{ rotate: rotation }}
            transition={{
              duration: isSpinning ? 5 : 0,
              ease: [0.2, 0.9, 0.3, 1], // Custom easing - fast start, slow end
            }}
            onAnimationComplete={handleAnimationComplete}
          >
            {/* SVG wheel */}
            <svg
              viewBox={`0 0 ${wheelSize} ${wheelSize}`}
              className="wheel-svg"
            >
              <defs>
                {/* Gradients for each segment */}
                {prizes.map((prize, index) => (
                  <linearGradient
                    key={`grad-${prize.id}`}
                    id={`segmentGradient-${index}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={prize.color} />
                    <stop offset="50%" stopColor={adjustColor(prize.color, -20)} />
                    <stop offset="100%" stopColor={adjustColor(prize.color, -40)} />
                  </linearGradient>
                ))}

                {/* Inner shadow */}
                <filter id="innerShadow">
                  <feOffset dx="0" dy="2" />
                  <feGaussianBlur stdDeviation="3" result="shadow" />
                  <feComposite operator="out" in="SourceGraphic" in2="shadow" />
                </filter>

                {/* Center gradient */}
                <radialGradient id="premiumCenterGradient">
                  <stop offset="0%" stopColor="#F5E6B8" />
                  <stop offset="40%" stopColor="#D4AF37" />
                  <stop offset="100%" stopColor="#7A611C" />
                </radialGradient>
              </defs>

              {/* Segments */}
              {prizes.map((prize, index) => {
                const startAngle = index * segmentAngle - 90;
                const endAngle = startAngle + segmentAngle;

                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;

                const x1 = radius + radius * Math.cos(startRad);
                const y1 = radius + radius * Math.sin(startRad);
                const x2 = radius + radius * Math.cos(endRad);
                const y2 = radius + radius * Math.sin(endRad);

                const largeArc = segmentAngle > 180 ? 1 : 0;

                const pathData = `
                  M ${radius} ${radius}
                  L ${x1} ${y1}
                  A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
                  Z
                `;

                // Text position
                const textAngle = startAngle + segmentAngle / 2;
                const textRad = (textAngle * Math.PI) / 180;
                const textRadius = radius * 0.62;
                const iconRadius = radius * 0.82;
                const textX = radius + textRadius * Math.cos(textRad);
                const textY = radius + textRadius * Math.sin(textRad);
                const iconX = radius + iconRadius * Math.cos(textRad);
                const iconY = radius + iconRadius * Math.sin(textRad);

                return (
                  <g key={prize.id}>
                    {/* Segment */}
                    <path
                      d={pathData}
                      fill={`url(#segmentGradient-${index})`}
                      stroke="rgba(212, 175, 55, 0.6)"
                      strokeWidth="1.5"
                    />

                    {/* Segment highlight (3D effect) */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.15)"
                      strokeWidth="2"
                      style={{ clipPath: 'inset(0 0 50% 0)' }}
                    />

                    {/* Icon */}
                    <text
                      x={iconX}
                      y={iconY}
                      fontSize="18"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textAngle + 90}, ${iconX}, ${iconY})`}
                    >
                      {prize.icon}
                    </text>

                    {/* Label */}
                    <text
                      x={textX}
                      y={textY}
                      fill={prize.textColor}
                      fontSize="12"
                      fontWeight="700"
                      fontFamily="Montserrat, sans-serif"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                      style={{
                        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {prize.label}
                    </text>
                  </g>
                );
              })}

              {/* Center decorative circle */}
              <circle
                cx={radius}
                cy={radius}
                r={radius * 0.22}
                fill="url(#premiumCenterGradient)"
                stroke="var(--r-gold-600)"
                strokeWidth="4"
              />

              {/* Inner circle ring */}
              <circle
                cx={radius}
                cy={radius}
                r={radius * 0.15}
                fill="var(--r-bg-primary)"
                stroke="var(--r-gold-700)"
                strokeWidth="2"
              />
            </svg>

            {/* Center logo */}
            <div className="wheel-premium-center">
              <motion.div
                className="center-logo"
                animate={isSpinning ? { rotate: -rotation } : {}}
                transition={{ duration: 0 }}
              >
                <span className="logo-icon">♠</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Ambient glow when spinning */}
          <AnimatePresence>
            {isSpinning && (
              <motion.div
                className="wheel-spin-glow"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Reflection effect */}
      <div className="wheel-reflection" />
    </div>
  );
};

// Helper function to adjust color brightness
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
