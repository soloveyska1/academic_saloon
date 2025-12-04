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

  // Theme-aware colors — Obsidian Glass / Royal Porcelain
  const colors = {
    gold: isDark ? '#d4af37' : '#9e7a1a',
    goldLight: isDark ? '#f5d061' : '#b48e26',
    inactive: isDark ? '#52525b' : '#a1a1aa',
    // Floating dock background — heavy blur glass
    dockBg: isDark
      ? 'rgba(12, 12, 16, 0.85)'   // Obsidian glass
      : 'rgba(255, 255, 255, 0.85)', // Porcelain
    dockBorder: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
    // Double border effect — inner highlight
    dockBorderInner: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.6)',
    fadeBg: isDark
      ? 'linear-gradient(180deg, transparent 0%, #050507 50%)'
      : 'linear-gradient(180deg, transparent 0%, #FAFAF9 50%)',
    spotlightBg: isDark
      ? 'linear-gradient(180deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.04) 100%)'
      : 'linear-gradient(180deg, rgba(180, 142, 38, 0.1) 0%, rgba(180, 142, 38, 0.04) 100%)',
    spotlightBorder: isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(180, 142, 38, 0.2)',
    glowLine: isDark
      ? 'linear-gradient(90deg, #8E6E27, #D4AF37, #FFF8D6, #D4AF37, #8E6E27)'
      : 'linear-gradient(90deg, #6b4f0f, #9e7a1a, #d4af37, #9e7a1a, #6b4f0f)',
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
        // Floating effect — 20px margin from bottom
        padding: '12px 20px',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Background Gradient Fade */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 140,
          background: colors.fadeBg,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />

      {/* Floating Glass Dock — Jewelry Box Style */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          maxWidth: 360,
          margin: '0 auto',
          padding: '14px 10px',
          background: colors.dockBg,
          backdropFilter: 'blur(60px) saturate(180%)',
          WebkitBackdropFilter: 'blur(60px) saturate(180%)',
          borderRadius: 26,
          // Double border for glass thickness illusion
          border: `1px solid ${colors.dockBorder}`,
          boxShadow: isDark
            ? `0 0 0 1px ${colors.dockBorderInner}, 0 20px 50px -12px rgba(0, 0, 0, 0.9), 0 0 80px -20px rgba(212, 175, 55, 0.12)`
            : `0 0 0 1px ${colors.dockBorderInner}, 0 4px 6px -1px rgba(166, 138, 58, 0.08), 0 20px 50px -12px rgba(166, 138, 58, 0.15)`,
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
