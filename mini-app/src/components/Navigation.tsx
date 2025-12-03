import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ClipboardList, Target, User } from 'lucide-react'
import { useTelegram } from '../hooks/useUserData'

// ═══════════════════════════════════════════════════════════════════════════
//  NAVIGATION CONFIGURATION — RUSSIAN LABELS
// ═══════════════════════════════════════════════════════════════════════════

const navItems = [
  { path: '/', icon: Home, label: 'Главная' },
  { path: '/orders', icon: ClipboardList, label: 'Заказы' },
  { path: '/roulette', icon: Target, label: 'Удача' },
  { path: '/profile', icon: User, label: 'Досье' },
]

// ═══════════════════════════════════════════════════════════════════════════
//  NAVIGATION COMPONENT — PREMIUM FLOATING DOCK
// ═══════════════════════════════════════════════════════════════════════════

export function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { haptic } = useTelegram()

  const handleClick = (path: string) => {
    haptic('light')
    navigate(path)
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
      {/* Floating Glass Dock */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          maxWidth: 380,
          margin: '0 auto',
          padding: '10px 8px',
          background: 'linear-gradient(180deg, rgba(20, 20, 23, 0.85) 0%, rgba(15, 15, 18, 0.95) 100%)',
          backdropFilter: 'blur(40px) saturate(150%)',
          WebkitBackdropFilter: 'blur(40px) saturate(150%)',
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: `
            0 -4px 30px rgba(0, 0, 0, 0.4),
            0 8px 32px rgba(0, 0, 0, 0.6),
            0 0 60px -20px rgba(212, 175, 55, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.05)
          `,
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
                padding: '8px 16px',
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
                    background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.04) 100%)',
                    border: '1px solid rgba(212, 175, 55, 0.15)',
                    boxShadow: '0 0 20px -5px rgba(212, 175, 55, 0.25)',
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
                    bottom: 2,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 24,
                    height: 2,
                    borderRadius: 2,
                    background: 'linear-gradient(90deg, var(--gold-500), var(--gold-400), var(--gold-500))',
                    boxShadow: '0 0 12px rgba(212, 175, 55, 0.6)',
                  }}
                />
              )}

              {/* Icon Container */}
              <motion.div
                animate={{
                  y: isActive ? -3 : 0,
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
                  style={{
                    color: isActive ? 'var(--gold-400)' : 'var(--text-muted)',
                    filter: isActive ? 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.5))' : 'none',
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
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: '0.02em',
                  color: isActive ? 'var(--gold-300)' : 'var(--text-muted)',
                  textShadow: isActive ? '0 0 12px rgba(212, 175, 55, 0.4)' : 'none',
                  transition: 'color 0.2s, text-shadow 0.2s',
                }}
              >
                {item.label}
              </motion.span>
            </motion.button>
          )
        })}
      </div>

      {/* Edge fade effect at bottom of screen */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'calc(100% + 20px)',
          background: 'linear-gradient(180deg, transparent 0%, var(--bg-void) 100%)',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />
    </motion.nav>
  )
}
