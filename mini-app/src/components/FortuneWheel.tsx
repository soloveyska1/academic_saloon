import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Prize {
  id: string;
  label: string;
  sublabel: string;
  color: string;
  textColor: string;
  icon: string;
}

interface FortuneWheelProps {
  prizes: Prize[];
  isSpinning: boolean;
  onSpinEnd: () => void;
}

export const FortuneWheel = ({ prizes, isSpinning, onSpinEnd }: FortuneWheelProps) => {
  const [rotation, setRotation] = useState(0);
  const segmentAngle = 360 / prizes.length;

  useEffect(() => {
    if (isSpinning) {
      // Случайный угол остановки + несколько полных оборотов
      const spins = 5 + Math.random() * 3; // 5-8 полных оборотов
      const randomAngle = Math.random() * 360;
      const totalRotation = rotation + (spins * 360) + randomAngle;
      setRotation(totalRotation);
    }
  }, [isSpinning]);

  const wheelSize = 280;
  const radius = wheelSize / 2;

  return (
    <div className="wheel-stage">
      {/* Золотая рамка */}
      <div className="wheel-frame">
        <div className="wheel-inner-frame">
          {/* Указатель */}
          <div className="wheel-pointer">
            <div className="pointer-shape" />
          </div>

          {/* Само колесо */}
          <motion.div
            className="fortune-wheel"
            style={{ width: wheelSize, height: wheelSize }}
            animate={{ rotate: rotation }}
            transition={{
              duration: isSpinning ? 4 : 0,
              ease: [0.2, 0.8, 0.3, 1], // Замедление в конце
            }}
            onAnimationComplete={onSpinEnd}
          >
            {/* SVG для секторов */}
            <svg
              viewBox={`0 0 ${wheelSize} ${wheelSize}`}
              style={{ width: '100%', height: '100%' }}
            >
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

                // Позиция текста - середина сектора
                const textAngle = startAngle + segmentAngle / 2;
                const textRad = (textAngle * Math.PI) / 180;
                const textRadius = radius * 0.65;
                const textX = radius + textRadius * Math.cos(textRad);
                const textY = radius + textRadius * Math.sin(textRad);

                return (
                  <g key={prize.id}>
                    {/* Сектор */}
                    <path
                      d={pathData}
                      fill={prize.color}
                      stroke="var(--r-gold-700)"
                      strokeWidth="1"
                    />
                    {/* Текст */}
                    <text
                      x={textX}
                      y={textY}
                      fill={prize.textColor}
                      fontSize="11"
                      fontWeight="600"
                      fontFamily="Montserrat, sans-serif"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {prize.label}
                    </text>
                  </g>
                );
              })}

              {/* Внутренний декоративный круг */}
              <circle
                cx={radius}
                cy={radius}
                r={radius * 0.15}
                fill="url(#centerGradient)"
                stroke="var(--r-gold-600)"
                strokeWidth="3"
              />

              {/* Градиенты */}
              <defs>
                <radialGradient id="centerGradient">
                  <stop offset="0%" stopColor="#D4B86A" />
                  <stop offset="100%" stopColor="#7A611C" />
                </radialGradient>
              </defs>
            </svg>

            {/* Центральный логотип */}
            <div className="wheel-center">
              <div className="wheel-center-inner">
                <span className="wheel-logo">F</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Декоративные огни по краям (опционально) */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i * 360) / 16;
          const rad = (angle * Math.PI) / 180;
          const x = 50 + 48 * Math.cos(rad);
          const y = 50 + 48 * Math.sin(rad);
          return (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-[var(--r-gold-400)]"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 8px var(--r-glow-gold)',
              }}
              animate={isSpinning ? {
                opacity: [0.4, 1, 0.4],
                scale: [0.8, 1.2, 0.8],
              } : {}}
              transition={{
                duration: 0.3,
                repeat: isSpinning ? Infinity : 0,
                delay: i * 0.05,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
