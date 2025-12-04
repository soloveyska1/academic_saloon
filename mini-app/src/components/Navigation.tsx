import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ClipboardList, Target, User } from 'lucide-react'
import { useTelegram } from '../hooks/useUserData'
import { useTheme } from '../contexts/ThemeContext'

// Navigation items with premium labels
const navItems = [
  { path: '/', icon: Home, label: 'Главная' },
  { path: '/orders', icon: ClipboardList, label: 'Портфель' },
  { path: '/roulette', icon: Target, label: 'Клуб' },
  { path: '/profile', icon: User, label: 'Профиль' },
]

export function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const { isDark } = useTheme()

  const handleClick = (path: string) => {
    haptic('light')
    navigate(path)
  }

  // Theme-aware colors
  const colors = {
    gold: isDark ? '#d4af37' : '#9e7a1a',
    goldLight: isDark ? '#f5d061' : '#b48e26',
    inactive: isDark ? '#71717a' : '#737373',
    dockBg: isDark
      ? 'linear-gradient(180deg, rgba(20, 20, 23, 0.92) 0%, rgba(15, 15, 18, 0.98) 100%)'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 247, 244, 0.98) 100%)',
    dockBorder: isDark ? 'rgba(212, 175, 55, 0.1)' : 'rgba(180, 142, 38, 0.15)',
    fadeBg: isDark
      ? 'linear-gradient(180deg, transparent 0%, #0a0a0c 40%)'
      : 'linear-gradient(180deg, transparent 0%, #f8f7f4 40%)',
    spotlightBg: isDark
      ? 'linear-gradient(180deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)'
      : 'linear-gradient(180deg, rgba(180, 142, 38, 0.12) 0%, rgba(180, 142, 38, 0.05) 100%)',
    spotlightBorder: isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(180, 142, 38, 0.25)',
    glowLine: isDark
      ? 'linear-gradient(90deg, #d4af37, #f5d061, #d4af37)'
      : 'linear-gradient(90deg, #9e7a1a, #b48e26, #9e7a1a)',
  }

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
        delay: 0.3,
      }}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Background Gradient Fade */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 120,
          background: colors.fadeBg,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />

      {/* Floating Glass Dock */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          maxWidth: 380,
          margin: '0 auto',
          padding: '12px 8px',
          background: colors.dockBg,
          backdropFilter: 'blur(40px) saturate(150%)',
          WebkitBackdropFilter: 'blur(40px) saturate(150%)',
          borderRadius: 22,
          border: `1px solid ${colors.dockBorder}`,
          boxShadow: isDark
            ? `0 -4px 30px rgba(0, 0, 0, 0.4), 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 60px -20px rgba(212, 175, 55, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)`
            : `0 -4px 30px rgba(0, 0, 0, 0.06), 0 8px 32px rgba(0, 0, 0, 0.1), 0 0 60px -20px rgba(180, 142, 38, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)`,
        }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon

          return (
            <motion.button
              key={item.path}
              onClick={() => handleClick(item.path)}
              whileTap={{ scale: 0.9 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 20,
              }}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 18px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {/* Gold Spotlight Effect for Active Tab */}
              {isActive && (
                <motion.div
                  layoutId="navSpotlight"
                  transition={{
                    type: 'spring',
                    stiffness: 350,
                    damping: 30,
                  }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 14,
                    background: colors.spotlightBg,
                    border: `1px solid ${colors.spotlightBorder}`,
                    boxShadow: isDark
                      ? '0 0 20px -5px rgba(212, 175, 55, 0.3)'
                      : '0 0 20px -5px rgba(180, 142, 38, 0.2)',
                  }}
                />
              )}

              {/* Bottom Glow Line for Active */}
              {isActive && (
                <motion.div
                  layoutId="navGlowLine"
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 35,
                  }}
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 24,
                    height: 3,
                    borderRadius: 3,
                    background: colors.glowLine,
                    boxShadow: isDark
                      ? '0 0 12px rgba(212, 175, 55, 0.6)'
                      : '0 0 12px rgba(180, 142, 38, 0.4)',
                  }}
                />
              )}

              {/* Icon Container */}
              <motion.div
                animate={{
                  y: isActive ? -2 : 0,
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 350,
                  damping: 25,
                }}
                style={{
                  position: 'relative',
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  color={isActive ? colors.gold : colors.inactive}
                  style={{
                    filter: isActive
                      ? (isDark ? 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.5))' : 'drop-shadow(0 0 8px rgba(180, 142, 38, 0.4))')
                      : 'none',
                    transition: 'color 0.2s, filter 0.2s',
                  }}
                />
              </motion.div>

              {/* Label */}
              <motion.span
                animate={{
                  opacity: isActive ? 1 : 0.5,
                  y: isActive ? 0 : 2,
                }}
                transition={{
                  duration: 0.2,
                }}
                style={{
                  position: 'relative',
                  zIndex: 2,
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: '0.02em',
                  color: isActive ? colors.gold : colors.inactive,
                  textShadow: isActive
                    ? (isDark ? '0 0 12px rgba(212, 175, 55, 0.4)' : '0 0 12px rgba(180, 142, 38, 0.3)')
                    : 'none',
                  transition: 'color 0.2s, text-shadow 0.2s',
                }}
              >
                {item.label}
              </motion.span>
            </motion.button>
          )
        })}
      </div>
    </motion.nav>
  )
}
