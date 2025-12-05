import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiExplosionProps {
  isActive: boolean;
  duration?: number;
  particleCount?: number;
  colors?: string[];
  isJackpot?: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  shape: 'square' | 'circle' | 'star' | 'diamond';
  delay: number;
  duration: number;
  xVelocity: number;
  yVelocity: number;
}

const DEFAULT_COLORS = [
  '#D4AF37', // Gold
  '#F5E6B8', // Light gold
  '#722F37', // Burgundy
  '#1B4D3E', // Emerald
  '#FFD700', // Bright gold
  '#FF6B6B', // Coral
  '#4ECDC4', // Teal
  '#9B59B6', // Purple
];

const JACKPOT_COLORS = [
  '#FFD700', // Gold
  '#FFF44F', // Lemon
  '#FFDF00', // Golden yellow
  '#F0E68C', // Khaki
  '#FFE135', // Banana
  '#FADA5E', // Mustard
];

export const ConfettiExplosion = ({
  isActive,
  duration = 4000,
  particleCount = 80,
  colors = DEFAULT_COLORS,
  isJackpot = false,
}: ConfettiExplosionProps) => {
  const actualColors = isJackpot ? JACKPOT_COLORS : colors;
  const actualCount = isJackpot ? particleCount * 2 : particleCount;

  // Генерация частиц
  const particles: Particle[] = useMemo(() => {
    if (!isActive) return [];

    return Array.from({ length: actualCount }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 20, // Начинаем из центра
      y: 50 + (Math.random() - 0.5) * 10,
      rotation: Math.random() * 720 - 360,
      scale: 0.5 + Math.random() * 1,
      color: actualColors[Math.floor(Math.random() * actualColors.length)],
      shape: ['square', 'circle', 'star', 'diamond'][Math.floor(Math.random() * 4)] as Particle['shape'],
      delay: Math.random() * 0.3,
      duration: 2 + Math.random() * 2,
      xVelocity: (Math.random() - 0.5) * 150,
      yVelocity: -50 - Math.random() * 100,
    }));
  }, [isActive, actualCount, actualColors]);

  // Рендер формы частицы
  const renderShape = (shape: Particle['shape'], color: string, size: number) => {
    switch (shape) {
      case 'circle':
        return (
          <div
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              background: color,
            }}
          />
        );
      case 'star':
        return (
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: `${size / 2}px solid transparent`,
              borderRight: `${size / 2}px solid transparent`,
              borderBottom: `${size}px solid ${color}`,
              position: 'relative',
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: `${size / 2}px solid transparent`,
                borderRight: `${size / 2}px solid transparent`,
                borderTop: `${size}px solid ${color}`,
                position: 'absolute',
                top: size / 3,
                left: -size / 2,
              }}
            />
          </div>
        );
      case 'diamond':
        return (
          <div
            style={{
              width: size,
              height: size,
              background: color,
              transform: 'rotate(45deg)',
            }}
          />
        );
      default:
        return (
          <div
            style={{
              width: size,
              height: size * 0.6,
              background: color,
              borderRadius: 1,
            }}
          />
        );
    }
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="confetti-container"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, delay: duration / 1000 - 0.5 }}
        >
          {/* Central burst effect for jackpot */}
          {isJackpot && (
            <motion.div
              className="jackpot-burst"
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          )}

          {/* Confetti particles */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="confetti-particle"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
              }}
              initial={{
                scale: 0,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                x: particle.xVelocity,
                y: [0, particle.yVelocity, particle.yVelocity + 300],
                scale: [0, particle.scale, particle.scale, 0],
                rotate: particle.rotation,
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                ease: [0.2, 0.8, 0.2, 1],
                times: [0, 0.1, 0.7, 1],
              }}
            >
              {renderShape(particle.shape, particle.color, 8 + particle.scale * 6)}
            </motion.div>
          ))}

          {/* Gold sparkles for jackpot */}
          {isJackpot && (
            <>
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={`sparkle-${i}`}
                  className="gold-sparkle"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                    rotate: 180,
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.15,
                    repeat: 2,
                  }}
                >
                  ✦
                </motion.div>
              ))}
            </>
          )}

          {/* Ribbon streamers */}
          {Array.from({ length: isJackpot ? 12 : 6 }).map((_, i) => (
            <motion.div
              key={`ribbon-${i}`}
              className="ribbon-streamer"
              style={{
                left: `${10 + i * 15}%`,
                background: `linear-gradient(to bottom, ${actualColors[i % actualColors.length]}, transparent)`,
                width: 3 + Math.random() * 3,
              }}
              initial={{ y: -100, opacity: 0, scaleY: 0 }}
              animate={{
                y: ['−100%', '150%'],
                opacity: [0, 1, 1, 0],
                scaleY: [0, 1, 1, 0.5],
                rotate: [-10, 10],
              }}
              transition={{
                duration: 3 + Math.random(),
                delay: i * 0.2,
                ease: 'easeIn',
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
