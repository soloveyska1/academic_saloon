import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { Home, ClipboardList, Crown, User, LucideIcon } from 'lucide-react'
import { useTelegram } from '../hooks/useUserData' // Use standard hook

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM ISLAND NAVIGATION — "The Floating Command Center"
//  Features: Dynamic Island animations, Deep Glassmorphism, Perfect Z-Index
// ═══════════════════════════════════════════════════════════════════════════

interface NavItem {
  path: string
  icon: LucideIcon
  label: string
}

const navItems: NavItem[] = [
  { path: '/', icon: Home, label: 'Главная' },
  { path: '/orders', icon: ClipboardList, label: 'Заказы' },
  { path: '/club', icon: Crown, label: 'Клуб' },
  { path: '/profile', icon: User, label: 'Профиль' },
]

export function Navigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const { haptic } = useTelegram()
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollY = useRef(0)
  const { scrollY } = useScroll()

  // 1. Z-Index Management: 
  // Modals are usually z-1000+. We set Nav to z-500 to ensure it's ALWAYS behind modals.
  const NAV_Z_INDEX = 500

  // 2. Visibility Logic:
  // Hide on specific pages (Wizard, Chat)
  const isHiddenPage = location.pathname.startsWith('/order/') || location.pathname === '/create-order'

  useEffect(() => {
    if (isHiddenPage) setIsVisible(false)
    else setIsVisible(true)
  }, [isHiddenPage])

  // 3. Scroll Logic (Smart Hide):
  // Only hide if we aren't on a hidden page
  useMotionValueEvent(scrollY, "change", (latest) => {
    if (isHiddenPage) return

    const diff = latest - lastScrollY.current
    if (latest < 50) {
      setIsVisible(true) // Always show at top
    } else if (diff > 20) {
      setIsVisible(true) // User complained about hiding? "Consider reworking mechanics".
      // Actually, standard pattern is hide on scroll down. 
      // But if user says "works correctly EVERYWHERE", maybe they dislike it disappearing.
      // I will KEEP it visible to avoid confusion, or make it auto-hide only on VERY deep scroll.
      // Let's make it ALWAYS VISIBLE for stability ("comfort").
      // Overlap issue is solved by padding.
    }
    lastScrollY.current = latest
  })

  // Colors
  const activeColor = '#D4AF37' // Gold
  const inactiveColor = 'rgba(255, 255, 255, 0.4)'

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{
            position: 'fixed',
            bottom: 24, // Floating offset
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: NAV_Z_INDEX,
            pointerEvents: 'none', // Allow clicks through container
            paddingBottom: 'env(safe-area-inset-bottom, 0px)'
          }}
        >
          {/* THE ISLAND */}
          <div
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 8px',
              borderRadius: 24,
              background: 'rgba(15, 15, 17, 0.85)', // Deep dark glass
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.2)',
              maxWidth: '90vw',
              minWidth: 300
            }}
          >
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon

              return (
                <motion.button
                  key={item.path}
                  onClick={() => {
                    haptic('light')
                    if (!isActive) navigate(item.path)
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    padding: '8px 0',
                    cursor: 'pointer',
                    position: 'relative',
                    height: 48,
                  }}
                >
                  {/* Active Indicator Background */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-bg"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 16,
                        background: 'rgba(212, 175, 55, 0.15)',
                        border: '1px solid rgba(212, 175, 55, 0.1)',
                      }}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}

                  {/* Icon */}
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <Icon
                      size={22}
                      color={isActive ? activeColor : inactiveColor}
                      strokeWidth={isActive ? 2.5 : 2}
                      style={{
                        filter: isActive ? 'drop-shadow(0 0 8px rgba(212,175,55,0.4))' : 'none',
                        transition: 'all 0.3s'
                      }}
                    />
                  </div>

                  {/* Label (Optional: Tiny dot for minimalist feel, or text?) 
                      User wants "Premium". Text is clearer.
                   */}
                  <span style={{
                    fontSize: 10,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? activeColor : inactiveColor,
                    marginTop: 2,
                    opacity: isActive ? 1 : 0.7,
                    transition: 'all 0.3s'
                  }}>
                    {item.label}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
