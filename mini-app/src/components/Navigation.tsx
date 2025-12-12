import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { Home, ClipboardList, Target, User, LucideIcon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { usePremiumGesture } from '../hooks/usePremiumGesture'

// ═══════════════════════════════════════════════════════════════════════════
//  LIQUID GOLD DOCK — Mac-Style Floating Navigation
//  Features: Hide-on-scroll, Sliding Spotlight, Magnetic Scaling, Shimmer
// ═══════════════════════════════════════════════════════════════════════════

interface NavItem {
  path: string
  icon: LucideIcon
  label: string
}

const navItems: NavItem[] = [
  { path: '/', icon: Home, label: 'Главная' },
  { path: '/orders', icon: ClipboardList, label: 'Портфель' },
  { path: '/roulette', icon: Target, label: 'Клуб' },
  { path: '/profile', icon: User, label: 'Профиль' },
]

// ═══════════════════════════════════════════════════════════════════════════
//  NAV BUTTON
// ═══════════════════════════════════════════════════════════════════════════

interface NavButtonProps {
  item: NavItem
  isActive: boolean
  colors: ReturnType<typeof useNavigationColors>
  isDark: boolean
}

function NavButton({ item, isActive, colors, isDark }: NavButtonProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const Icon = item.icon

  const { ref, handlers } = usePremiumGesture<HTMLButtonElement>({
    onTap: () => {
      if (location.pathname !== item.path) {
        navigate(item.path)
      }
    },
    scale: 0.9,
    hapticType: 'light',
  })

  // Inactive colors
  const inactiveColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'

  return (
    <button
      ref={ref}
      {...handlers}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        flex: 1,
        height: '100%',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        outline: 'none',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        zIndex: 2, // Above the sliding background
      }}
    >
      {/* Sliding Gold Spotlight (The "Liquid" Background) */}
      {isActive && (
        <motion.div
          layoutId="nav-spotlight"
          transition={{
            type: 'spring',
            stiffness: 350,
            damping: 25,
          }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 16,
            background: colors.spotlightBg,
            border: `1px solid ${colors.spotlightBorder}`,
            boxShadow: isDark
              ? '0 0 20px -5px rgba(212, 175, 55, 0.3)'
              : '0 0 15px -5px rgba(180, 142, 38, 0.2)',
            zIndex: -1,
          }}
        >
          {/* Inner Glow */}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 16,
            background: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%)',
          }} />
        </motion.div>
      )}

      {/* Icon with Mac-style scaling on active */}
      <motion.div
        animate={{
          scale: isActive ? 1.1 : 1,
          y: isActive ? -2 : 0,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon
          size={20}
          strokeWidth={isActive ? 2.5 : 2}
          color={isActive ? colors.gold : inactiveColor}
          style={{
            filter: isActive
              ? `drop-shadow(0 0 8px ${isDark ? 'rgba(212,175,55,0.5)' : 'rgba(180,142,38,0.4)'})`
              : 'none',
            transition: 'color 0.2s ease',
          }}
        />
      </motion.div>

      {/* Label */}
      <motion.span
        animate={{
          opacity: isActive ? 1 : 0.7,
          scale: isActive ? 1.05 : 1,
          y: isActive ? 0 : 2,
        }}
        style={{
          fontSize: 9,
          fontWeight: isActive ? 700 : 500,
          fontFamily: "'Manrope', sans-serif",
          letterSpacing: '0.02em',
          color: isActive ? colors.gold : inactiveColor,
        }}
      >
        {item.label}
      </motion.span>

      {/* Active Indicator Dot (Optional, adds detail) */}
      {isActive && (
        <motion.div
          layoutId="nav-indicator"
          style={{
            position: 'absolute',
            bottom: 4,
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: colors.gold,
            boxShadow: `0 0 6px ${colors.gold}`,
          }}
        />
      )}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  THEME COLORS
// ═══════════════════════════════════════════════════════════════════════════

function useNavigationColors() {
  const { isDark } = useTheme()

  return {
    gold: isDark ? '#d4af37' : '#9e7a1a',
    // Ultra-premium glass background
    dockBg: isDark
      ? 'rgba(10, 10, 12, 0.65)'
      : 'rgba(255, 255, 255, 0.75)',
    // Borders
    dockBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    dockInnerBorder: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.5)',
    // Spotlight (Active Tab Background)
    spotlightBg: isDark
      ? 'linear-gradient(180deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.02) 100%)'
      : 'linear-gradient(180deg, rgba(180, 142, 38, 0.1) 0%, rgba(180, 142, 38, 0.02) 100%)',
    spotlightBorder: isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(180, 142, 38, 0.15)',
    // Shadows
    shadow: isDark
      ? '0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 30px -10px rgba(212, 175, 55, 0.1)'
      : '0 15px 30px -10px rgba(166, 138, 58, 0.15), 0 5px 10px -5px rgba(0,0,0,0.05)',
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function Navigation() {
  const location = useLocation()
  const { isDark } = useTheme()
  const colors = useNavigationColors()

  // Scroll Logic
  const [isVisible, setIsVisible] = useState(true)
  const { scrollY } = useScroll()
  const lastScrollY = useRef(0)

  // Hide immediately for wizard/order pages on mount
  useEffect(() => {
    if (location.pathname.startsWith('/order/') || location.pathname === '/create-order') {
      setIsVisible(false)
    }
  }, [location.pathname])

  useMotionValueEvent(scrollY, "change", (latest) => {
    const currentScrollY = latest
    const diff = currentScrollY - lastScrollY.current

    // Hide when scrolling down > 10px, Show when scrolling up
    // Always show if near top (< 50px)
    // Also hide if on order page (chat mode) or create-order wizard
    if (location.pathname.startsWith('/order/') || location.pathname === '/create-order') {
      setIsVisible(false)
    } else if (currentScrollY < 50) {
      setIsVisible(true)
    } else if (diff > 10) {
      setIsVisible(false)
    } else if (diff < -10) {
      setIsVisible(true)
    }

    lastScrollY.current = currentScrollY
  })

  // Keyboard detection (Virtual Viewport)
  useEffect(() => {
    const handleResize = () => {
      if (!window.visualViewport) return
      const isKeyboardOpen = window.visualViewport.height < window.innerHeight * 0.8
      if (isKeyboardOpen) setIsVisible(false)
      else setIsVisible(true) // Restore visibility when keyboard closes
    }
    window.visualViewport?.addEventListener('resize', handleResize)
    return () => window.visualViewport?.removeEventListener('resize', handleResize)
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.9 }}
          transition={{
            type: 'spring',
            stiffness: 250,
            damping: 20,
            mass: 0.8,
          }}
          style={{
            position: 'fixed',
            bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
            left: 0,
            right: 0,
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none', // Allow clicks through the container area
          }}
        >
          {/* THE DOCK */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: 'auto',
              minWidth: 280,
              maxWidth: 320,
              padding: '6px',
              borderRadius: 24,
              background: colors.dockBg,
              backdropFilter: 'blur(25px) saturate(180%)',
              WebkitBackdropFilter: 'blur(25px) saturate(180%)',
              border: `1px solid ${colors.dockBorder}`,
              boxShadow: `
                inset 0 1px 0 ${colors.dockInnerBorder},
                ${colors.shadow}
              `,
              pointerEvents: 'auto', // Re-enable clicks
            }}
          >
            {/* Shimmer Effect (Animated Border Shine) */}
            <div
              style={{
                position: 'absolute',
                inset: -1,
                borderRadius: 24,
                background: 'linear-gradient(45deg, transparent 40%, rgba(212,175,55,0.3) 50%, transparent 60%)',
                backgroundSize: '200% 200%',
                zIndex: -1,
                animation: 'shimmer 4s infinite linear',
                opacity: 0.5,
                pointerEvents: 'none',
              }}
            />
            <style>{`
              @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `}</style>

            {navItems.map((item) => (
              <NavButton
                key={item.path}
                item={item}
                isActive={location.pathname === item.path}
                colors={colors}
                isDark={isDark}
              />
            ))}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
