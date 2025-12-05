import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ClipboardList, Target, User } from 'lucide-react'
import { useTelegram } from '../hooks/useUserData'
import { useTheme } from '../contexts/ThemeContext'

// ═══════════════════════════════════════════════════════════════════════════
//  FLOATING ISLAND NAVIGATION — Ultra-Premium Glass Dock
//  Full rounded capsule, floating 24px from bottom
//  Heavy blur, gold glow on active tab
// ═══════════════════════════════════════════════════════════════════════════

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
    // Gold gradients
    goldGradient: isDark
      ? 'linear-gradient(135deg, #8E6E27 0%, #D4AF37 25%, #FFF8D6 50%, #D4AF37 75%, #8E6E27 100%)'
      : 'linear-gradient(135deg, #6b4f0f 0%, #9e7a1a 25%, #d4af37 50%, #9e7a1a 75%, #6b4f0f 100%)',
    gold: isDark ? '#d4af37' : '#9e7a1a',
    goldLight: isDark ? '#FCF6BA' : '#d4af37',
    inactive: isDark ? '#52525b' : '#a1a1aa',
    // Floating dock background — heavy blur glass
    dockBg: isDark
      ? 'rgba(12, 12, 16, 0.75)'   // Obsidian glass
      : 'rgba(255, 255, 255, 0.8)', // Porcelain
    // Gradient border (light hitting edges)
    dockBorderOuter: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    dockBorderInner: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.8)',
    // Gold spotlight for active tab
    spotlightBg: isDark
      ? 'linear-gradient(180deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)'
      : 'linear-gradient(180deg, rgba(180, 142, 38, 0.12) 0%, rgba(180, 142, 38, 0.04) 100%)',
    spotlightBorder: isDark ? 'rgba(212, 175, 55, 0.25)' : 'rgba(180, 142, 38, 0.25)',
    // The gold glow line under active tab
    glowLine: isDark
      ? 'linear-gradient(90deg, #8E6E27, #D4AF37, #FFF8D6, #D4AF37, #8E6E27)'
      : 'linear-gradient(90deg, #6b4f0f, #9e7a1a, #d4af37, #9e7a1a, #6b4f0f)',
    // Shadow colors (gold-tinted, never pure black)
    shadow: isDark
      ? '0 20px 50px -12px rgba(0, 0, 0, 0.8), 0 0 60px -20px rgba(212, 175, 55, 0.15)'
      : '0 10px 40px -12px rgba(166, 138, 58, 0.2), 0 4px 6px -1px rgba(166, 138, 58, 0.08)',
  }

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          FLOATING ISLAND NAVIGATION DOCK
          position: fixed; bottom: 24px; left: 16px; right: 16px;
          border-radius: 9999px (full capsule)
          ═══════════════════════════════════════════════════════════════════ */}
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
          bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          left: 16,
          right: 16,
          zIndex: 1000,
        }}
      >
        {/* The Floating Glass Capsule */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            maxWidth: 380,
            margin: '0 auto',
            padding: '12px 8px',
            // Full rounded capsule
            borderRadius: 9999,
            // Glass background
            background: colors.dockBg,
            // Heavy blur for glass effect
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            // Gradient border (simulating light on edges)
            border: `1px solid ${colors.dockBorderOuter}`,
            // Double border effect for glass thickness
            boxShadow: `
              inset 0 1px 0 ${colors.dockBorderInner},
              ${colors.shadow}
            `,
          }}
        >
          {/* Inner shine effect — top edge light */}
          <div
            style={{
              position: 'absolute',
              top: 1,
              left: 20,
              right: 20,
              height: 1,
              background: isDark
                ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
              borderRadius: 9999,
              pointerEvents: 'none',
            }}
          />

          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon

            return (
              <motion.button
                key={item.path}
                onTap={() => handleClick(item.path)}
                onPointerDown={(e) => e.stopPropagation()}
                whileTap={{ scale: 0.95 }}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 30,
                }}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '10px 16px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  outline: 'none',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  userSelect: 'none',
                }}
              >
                {/* Gold Spotlight Background for Active Tab */}
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
                      borderRadius: 16,
                      background: colors.spotlightBg,
                      border: `1px solid ${colors.spotlightBorder}`,
                      // The subtle gold glow behind active tab
                      boxShadow: isDark
                        ? '0 0 25px -5px rgba(212, 175, 55, 0.35)'
                        : '0 0 20px -5px rgba(180, 142, 38, 0.25)',
                    }}
                  />
                )}

                {/* Gold Glow Line Under Active Tab */}
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
                        : '0 0 10px rgba(180, 142, 38, 0.5)',
                    }}
                  />
                )}

                {/* Icon Container */}
                <motion.div
                  animate={{
                    y: isActive ? -2 : 0,
                    scale: isActive ? 1.15 : 1,
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
                        ? (isDark
                            ? 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.5))'
                            : 'drop-shadow(0 0 8px rgba(180, 142, 38, 0.4))')
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
                    fontFamily: "'Manrope', sans-serif",
                    letterSpacing: '0.02em',
                    color: isActive ? colors.gold : colors.inactive,
                    textShadow: isActive
                      ? (isDark
                          ? '0 0 12px rgba(212, 175, 55, 0.4)'
                          : '0 0 10px rgba(180, 142, 38, 0.3)')
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
    </>
  )
}
