import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Sparkles } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  variant?: 'switch' | 'button' | 'card' | 'eclipse'
}

export function ThemeToggle({
  size = 'md',
  showLabel = false,
  variant = 'switch'
}: ThemeToggleProps) {
  const { theme, toggleTheme, isDark } = useTheme()

  const sizes = {
    sm: { track: 44, thumb: 18, icon: 12 },
    md: { track: 56, thumb: 24, icon: 14 },
    lg: { track: 68, thumb: 30, icon: 18 },
  }

  const s = sizes[size]

  // Premium Switch Variant
  if (variant === 'switch') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {showLabel && (
          <span style={{
            fontSize: size === 'sm' ? 12 : 14,
            fontWeight: 500,
            color: 'var(--text-secondary)',
          }}>
            {isDark ? 'Тёмная' : 'Светлая'}
          </span>
        )}
        <motion.button
          onClick={toggleTheme}
          whileTap={{ scale: 0.95 }}
          style={{
            position: 'relative',
            width: s.track,
            height: s.thumb + 8,
            padding: 4,
            background: isDark
              ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
              : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: `1px solid ${isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(180, 142, 38, 0.3)'}`,
            borderRadius: s.track / 2,
            cursor: 'pointer',
            outline: 'none',
            boxShadow: isDark
              ? 'inset 0 2px 4px rgba(0,0,0,0.3), 0 0 20px -5px rgba(212, 175, 55, 0.2)'
              : 'inset 0 2px 4px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}
        >
          {/* Background Stars (Dark Mode) */}
          <AnimatePresence>
            {isDark && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  overflow: 'hidden',
                }}
              >
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: [0.3, 0.8, 0.3],
                      scale: [0.8, 1.2, 0.8]
                    }}
                    transition={{
                      duration: 2,
                      delay: i * 0.2,
                      repeat: Infinity,
                    }}
                    style={{
                      position: 'absolute',
                      width: 2,
                      height: 2,
                      borderRadius: '50%',
                      background: '#fef3c7',
                      left: `${15 + i * 12}%`,
                      top: `${20 + (i % 3) * 25}%`,
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sun Rays (Light Mode) */}
          <AnimatePresence>
            {!isDark && (
              <motion.div
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 0.3, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: 0.4 }}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: s.thumb - 4,
                  height: s.thumb - 4,
                }}
              >
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: 2,
                      height: 6,
                      marginLeft: -1,
                      marginTop: -3,
                      background: '#f59e0b',
                      borderRadius: 1,
                      transformOrigin: '50% 50%',
                      transform: `rotate(${i * 45}deg) translateY(-8px)`,
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Thumb */}
          <motion.div
            layout
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30,
            }}
            style={{
              position: 'relative',
              width: s.thumb,
              height: s.thumb,
              borderRadius: '50%',
              background: isDark
                ? 'linear-gradient(135deg, #fef3c7 0%, #fcd34d 50%, #f59e0b 100%)'
                : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
              boxShadow: isDark
                ? '0 0 15px rgba(254, 243, 199, 0.5), 0 2px 4px rgba(0,0,0,0.2)'
                : '0 0 20px rgba(251, 191, 36, 0.6), 0 2px 4px rgba(0,0,0,0.15)',
              marginLeft: isDark ? 0 : s.track - s.thumb - 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AnimatePresence mode="wait">
              {isDark ? (
                <motion.div
                  key="moon"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Moon size={s.icon} color="#1a1a2e" strokeWidth={2.5} />
                </motion.div>
              ) : (
                <motion.div
                  key="sun"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun size={s.icon} color="#78350f" strokeWidth={2.5} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.button>
      </div>
    )
  }

  // Premium Button Variant
  if (variant === 'button') {
    return (
      <motion.button
        onClick={toggleTheme}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: size === 'sm' ? '8px 12px' : size === 'md' ? '10px 16px' : '12px 20px',
          background: isDark
            ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%)'
            : 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)',
          border: `1px solid ${isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(180, 142, 38, 0.25)'}`,
          borderRadius: 12,
          cursor: 'pointer',
          outline: 'none',
          boxShadow: isDark
            ? '0 0 20px -5px rgba(212, 175, 55, 0.2)'
            : '0 4px 12px rgba(0,0,0,0.08)',
        }}
      >
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.div
              key="moon-btn"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Moon size={s.icon + 2} color="var(--gold-400)" />
            </motion.div>
          ) : (
            <motion.div
              key="sun-btn"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Sun size={s.icon + 2} color="var(--gold-600)" />
            </motion.div>
          )}
        </AnimatePresence>
        {showLabel && (
          <span style={{
            fontSize: size === 'sm' ? 12 : 14,
            fontWeight: 600,
            color: isDark ? 'var(--gold-400)' : 'var(--gold-700)',
          }}>
            {isDark ? 'Тёмная' : 'Светлая'}
          </span>
        )}
      </motion.button>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ECLIPSE TOGGLE — The "wow" effect theme switcher
  // Light: Golden sun disk with rotating rays
  // Dark: Moon eclipses sun, leaving golden corona + stars
  // ═══════════════════════════════════════════════════════════════════════════
  if (variant === 'eclipse') {
    const eclipseSize = size === 'sm' ? 56 : size === 'md' ? 72 : 88
    const sunSize = eclipseSize * 0.5
    const moonSize = sunSize * 0.9

    // Heavy luxury spring for that "expensive door" feel
    const heavySpring = {
      type: 'spring' as const,
      stiffness: 100,
      damping: 20,
      mass: 1.1,
    }

    return (
      <motion.button
        onClick={toggleTheme}
        whileTap={{ scale: 0.92 }}
        transition={heavySpring}
        style={{
          position: 'relative',
          width: eclipseSize,
          height: eclipseSize,
          borderRadius: '50%',
          background: isDark
            ? 'linear-gradient(135deg, #0a0a12 0%, #16182a 100%)'
            : 'linear-gradient(135deg, #fef7e0 0%, #fff8e1 100%)',
          border: 'none',
          cursor: 'pointer',
          outline: 'none',
          overflow: 'hidden',
          boxShadow: isDark
            ? '0 0 0 1px rgba(255,255,255,0.05), 0 10px 40px -10px rgba(0,0,0,0.8), 0 0 60px -10px rgba(212,175,55,0.2)'
            : '0 0 0 1px rgba(0,0,0,0.05), 0 10px 40px -10px rgba(166,138,58,0.2), 0 0 60px -10px rgba(251,191,36,0.3)',
        }}
      >
        {/* Stars (Dark Mode) */}
        <AnimatePresence>
          {isDark && (
            <>
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={`star-${i}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0.3, 0.9, 0.3],
                    scale: [0.8, 1.2, 0.8],
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{
                    duration: 2 + Math.random(),
                    delay: i * 0.15,
                    repeat: Infinity,
                  }}
                  style={{
                    position: 'absolute',
                    width: 2,
                    height: 2,
                    borderRadius: '50%',
                    background: '#FCF6BA',
                    boxShadow: '0 0 4px #FCF6BA',
                    left: `${15 + (i * 11) % 70}%`,
                    top: `${10 + (i * 13) % 80}%`,
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Sun Rays (Light Mode) — Rotating */}
        <AnimatePresence>
          {!isDark && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: 1,
                scale: 1,
                rotate: 360,
              }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{
                opacity: { duration: 0.3 },
                scale: { duration: 0.3 },
                rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
              }}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={`ray-${i}`}
                  style={{
                    position: 'absolute',
                    width: 3,
                    height: eclipseSize * 0.35,
                    background: 'linear-gradient(to top, transparent, #d4af37, #FCF6BA)',
                    borderRadius: 2,
                    transformOrigin: '50% 100%',
                    transform: `rotate(${i * 30}deg) translateY(-${eclipseSize * 0.12}px)`,
                    opacity: 0.6,
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Sun (always present, golden disk) */}
        <motion.div
          animate={{
            scale: isDark ? 0.85 : 1,
          }}
          transition={heavySpring}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: sunSize,
            height: sunSize,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8E6E27 0%, #D4AF37 30%, #FFF8D6 50%, #D4AF37 70%, #8E6E27 100%)',
            boxShadow: isDark
              ? '0 0 30px rgba(212,175,55,0.6), 0 0 60px rgba(212,175,55,0.3)'
              : '0 0 40px rgba(251,191,36,0.8), 0 0 80px rgba(251,191,36,0.4)',
          }}
        />

        {/* The Moon (eclipsing the sun in dark mode) */}
        <motion.div
          initial={false}
          animate={{
            x: isDark ? 0 : sunSize * 1.5,
            opacity: isDark ? 1 : 0,
          }}
          transition={{
            ...heavySpring,
            opacity: { duration: 0.2 },
          }}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: moonSize,
            height: moonSize,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0a0a12 0%, #1a1a2e 50%, #0f0f18 100%)',
            boxShadow: isDark
              ? 'inset -4px -4px 10px rgba(255,255,255,0.05), inset 4px 4px 10px rgba(0,0,0,0.5)'
              : 'none',
          }}
        />

        {/* Eclipse Corona Glow (Dark Mode) */}
        <AnimatePresence>
          {isDark && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: [0.4, 0.7, 0.4],
                scale: [1, 1.05, 1],
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: sunSize * 1.4,
                height: sunSize * 1.4,
                borderRadius: '50%',
                background: 'transparent',
                boxShadow: '0 0 20px 8px rgba(212,175,55,0.3), 0 0 40px 16px rgba(212,175,55,0.15)',
                pointerEvents: 'none',
              }}
            />
          )}
        </AnimatePresence>
      </motion.button>
    )
  }

  // Premium Card Variant (for settings page)
  if (variant === 'card') {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={toggleTheme}
        style={{
          position: 'relative',
          padding: 20,
          background: isDark
            ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(18, 18, 21, 0.9) 50%, rgba(212, 175, 55, 0.04) 100%)'
            : 'linear-gradient(135deg, rgba(180, 142, 38, 0.08) 0%, rgba(255, 255, 255, 0.95) 50%, rgba(180, 142, 38, 0.04) 100%)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(180, 142, 38, 0.2)'}`,
          borderRadius: 16,
          cursor: 'pointer',
          boxShadow: isDark
            ? '0 20px 50px -15px rgba(0, 0, 0, 0.5), 0 0 60px -20px rgba(212, 175, 55, 0.1)'
            : '0 20px 50px -15px rgba(0, 0, 0, 0.1), 0 0 60px -20px rgba(180, 142, 38, 0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Decorative gradient corner */}
        <div
          style={{
            position: 'absolute',
            top: -30,
            right: -30,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, transparent 70%)',
            filter: 'blur(15px)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Animated Icon Container */}
            <motion.div
              animate={{
                rotate: isDark ? 0 : 360,
              }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
              }}
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: isDark
                  ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
                  : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                border: `1px solid ${isDark ? 'rgba(254, 243, 199, 0.2)' : 'rgba(245, 158, 11, 0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isDark
                  ? '0 0 20px -5px rgba(254, 243, 199, 0.3)'
                  : '0 0 20px -5px rgba(251, 191, 36, 0.4)',
              }}
            >
              <AnimatePresence mode="wait">
                {isDark ? (
                  <motion.div
                    key="moon-card"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Moon size={22} color="#fef3c7" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="sun-card"
                    initial={{ scale: 0, rotate: 180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: -180 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Sun size={22} color="#d97706" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <div>
              <div style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 2,
              }}>
                Тема оформления
              </div>
              <div style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <Sparkles size={12} color={isDark ? 'var(--gold-400)' : 'var(--gold-600)'} />
                {isDark ? 'Тёмная тема активна' : 'Светлая тема активна'}
              </div>
            </div>
          </div>

          {/* Mini Switch Indicator */}
          <div
            style={{
              position: 'relative',
              width: 44,
              height: 26,
              padding: 3,
              background: isDark
                ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
                : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: `1px solid ${isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(180, 142, 38, 0.3)'}`,
              borderRadius: 13,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <motion.div
              layout
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30,
              }}
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: isDark
                  ? 'linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%)'
                  : 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                marginLeft: isDark ? 0 : 18,
              }}
            />
          </div>
        </div>

        {/* Theme preview strip */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginTop: 16,
          paddingTop: 16,
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
        }}>
          <ThemePreviewChip active={isDark} label="Тёмная" dark />
          <ThemePreviewChip active={!isDark} label="Светлая" dark={false} />
        </div>
      </motion.div>
    )
  }

  return null
}

// Small preview chip for card variant
function ThemePreviewChip({ active, label, dark }: { active: boolean; label: string; dark: boolean }) {
  return (
    <motion.div
      animate={{
        scale: active ? 1 : 0.95,
        opacity: active ? 1 : 0.5,
      }}
      style={{
        flex: 1,
        padding: '10px 12px',
        background: dark
          ? 'linear-gradient(135deg, #0a0a0c 0%, #141417 100%)'
          : 'linear-gradient(135deg, #f8f7f4 0%, #ffffff 100%)',
        border: `2px solid ${active
          ? (dark ? 'rgba(212, 175, 55, 0.4)' : 'rgba(180, 142, 38, 0.4)')
          : 'transparent'
        }`,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      {dark ? (
        <Moon size={14} color={dark ? '#a1a1aa' : '#525252'} />
      ) : (
        <Sun size={14} color={dark ? '#a1a1aa' : '#525252'} />
      )}
      <span style={{
        fontSize: 12,
        fontWeight: 600,
        color: dark ? '#a1a1aa' : '#525252',
      }}>
        {label}
      </span>
      {active && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dark ? '#d4af37' : '#b48e26',
            boxShadow: `0 0 8px ${dark ? 'rgba(212, 175, 55, 0.6)' : 'rgba(180, 142, 38, 0.6)'}`,
          }}
        />
      )}
    </motion.div>
  )
}

export default ThemeToggle
