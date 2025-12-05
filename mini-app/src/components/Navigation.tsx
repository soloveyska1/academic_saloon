import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ClipboardList, Target, User, LucideIcon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { usePremiumGesture } from '../hooks/usePremiumGesture'

// ═══════════════════════════════════════════════════════════════════════════
//  FLOATING ISLAND NAVIGATION — Ultra-Premium Glass Dock
//  ZERO-LATENCY TOUCH: Direct DOM manipulation, bypasses React render cycle
//  Physics-based spring animations via CSS cubic-bezier
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
//  NAV BUTTON — Isolated component for premium gesture handling
//  Each button gets its own ref and direct DOM manipulation
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

  const { ref, handlers } = usePremiumGesture({
    onTap: () => {
      if (location.pathname !== item.path) {
        navigate(item.path)
      }
    },
    scale: 0.88,
    hapticType: 'light',
    tolerance: 15,
    pressDelay: 40,
  })

  // Premium gold outline for inactive items
  const inactiveGoldOutline = isDark
    ? 'rgba(212, 175, 55, 0.15)'
    : 'rgba(180, 142, 38, 0.2)'
  const inactiveGoldColor = isDark
    ? 'rgba(212, 175, 55, 0.45)'
    : 'rgba(158, 122, 26, 0.6)'

  return (
    <button
      ref={ref}
      {...handlers}
      className="nav-button-premium"
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
        // Critical for instant touch response
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        // GPU acceleration
        willChange: 'transform, opacity',
        transform: 'translateZ(0)',
      }}
    >
      {/* Gold Spotlight Background for Active Tab */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 16,
            background: colors.spotlightBg,
            border: `1px solid ${colors.spotlightBorder}`,
            boxShadow: isDark
              ? '0 0 25px -5px rgba(212, 175, 55, 0.35)'
              : '0 0 20px -5px rgba(180, 142, 38, 0.25)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Premium Gold Outline for Inactive Tabs */}
      {!isActive && (
        <div
          style={{
            position: 'absolute',
            inset: 2,
            borderRadius: 14,
            background: 'transparent',
            border: `1px solid ${inactiveGoldOutline}`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Gold Glow Line Under Active Tab */}
      {isActive && (
        <div
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
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Icon Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: isActive ? 'translateY(-2px) scale(1.15)' : 'translateY(0) scale(1)',
          transition: 'transform 0.2s ease-out',
        }}
      >
        <Icon
          size={22}
          strokeWidth={isActive ? 2.5 : 1.8}
          color={isActive ? colors.gold : inactiveGoldColor}
          style={{
            filter: isActive
              ? (isDark
                  ? 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.5))'
                  : 'drop-shadow(0 0 8px rgba(180, 142, 38, 0.4))')
              : 'none',
            transition: 'filter 0.2s ease-out, color 0.2s ease-out',
          }}
        />
      </div>

      {/* Label */}
      <span
        style={{
          position: 'relative',
          zIndex: 2,
          fontSize: 10,
          fontWeight: isActive ? 700 : 500,
          fontFamily: "'Manrope', sans-serif",
          letterSpacing: '0.02em',
          color: isActive ? colors.gold : inactiveGoldColor,
          opacity: isActive ? 1 : 0.8,
          transform: isActive ? 'translateY(0)' : 'translateY(2px)',
          textShadow: isActive
            ? (isDark
                ? '0 0 12px rgba(212, 175, 55, 0.4)'
                : '0 0 10px rgba(180, 142, 38, 0.3)')
            : 'none',
          transition: 'all 0.2s ease-out',
        }}
      >
        {item.label}
      </span>

      {/* Expanded hitbox for fat fingers */}
      <div
        style={{
          position: 'absolute',
          top: -8,
          bottom: -4,
          left: -4,
          right: -4,
          pointerEvents: 'none',
        }}
      />
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  THEME-AWARE COLORS
// ═══════════════════════════════════════════════════════════════════════════

function useNavigationColors() {
  const { isDark } = useTheme()

  return {
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
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN NAVIGATION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function Navigation() {
  const location = useLocation()
  const { isDark } = useTheme()
  const colors = useNavigationColors()

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
    </>
  )
}
