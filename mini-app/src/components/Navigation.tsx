import { useNavigate, useLocation } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion'
import { Home, List, Crown, User, LucideIcon } from 'lucide-react'
import { useHapticFeedback } from '../hooks/useHapticFeedback'
import { useNavigation } from '../contexts/NavigationContext'

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM ISLAND NAVIGATION — "The Floating Command Center"
//  Features: Dynamic Island animations, Deep Glassmorphism, Perfect Z-Index
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM NAVIGATION - "FLOATING GLASS COMMAND CENTER"
//  Features: Magnetic Buttons, Spotlight Active State, Smart Hide
// ═══════════════════════════════════════════════════════════════════════════

interface NavItem {
  id: string
  path: string
  icon: LucideIcon
  label: string
}

function MagneticItem({
  children,
  onClick
}: {
  children: React.ReactNode
  onClick: () => void
  isActive: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e
    const { left, top, width, height } = ref.current!.getBoundingClientRect()
    const x = (clientX - (left + width / 2)) * 0.3 // Pull strength
    const y = (clientY - (top + height / 2)) * 0.3
    setPosition({ x, y })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
        height: 60,
        cursor: 'pointer',
        position: 'relative',
        zIndex: 2,
        // Small tap shrink
      }}
      whileTap={{ scale: 0.9 }}
    >
      {children}
    </motion.div>
  )
}

export const Navigation = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { impactOccurred: haptic } = useHapticFeedback()

  // Context & Scroll State
  const { isHidden: isForcedHidden, isModalOpen } = useNavigation()
  const { scrollY } = useScroll()
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollY = useRef(0)

  // Pages where nav is completely removed
  const isHiddenPage = ['/order/', '/create-order', '/support'].some(path => location.pathname.startsWith(path)) && location.pathname !== '/orders'

  // Smart Hide Logic (Throttled for performance)
  useMotionValueEvent(scrollY, "change", (latest) => {
    if (isHiddenPage || isForcedHidden || isModalOpen) {
      if (isVisible) setIsVisible(false)
      return
    }

    const diff = latest - lastScrollY.current
    const isScrollingDown = diff > 10
    const isScrollingUp = diff < -10
    const isAtTop = latest < 50

    if (isAtTop) {
      setIsVisible(true)
    } else if (isScrollingDown && isVisible) {
      setIsVisible(false)
    } else if (isScrollingUp && !isVisible) {
      setIsVisible(true)
    }
    lastScrollY.current = latest
  })

  // Recalculate visibility on location/context change
  useEffect(() => {
    if (isHiddenPage || isForcedHidden || isModalOpen) {
      setIsVisible(false)
    } else {
      setIsVisible(true)
    }
  }, [isHiddenPage, isForcedHidden, isModalOpen, location.pathname])

  const navItems: NavItem[] = [
    { id: 'home', icon: Home, label: 'Главная', path: '/' },
    { id: 'orders', icon: List, label: 'Заказы', path: '/orders' },
    { id: 'club', icon: Crown, label: 'Клуб', path: '/club' },
    { id: 'profile', icon: User, label: 'Профиль', path: '/profile' }
  ]

  if (isHiddenPage && !isVisible) return null

  // Find active index for spotlight
  const activeIndex = navItems.findIndex(item => location.pathname === item.path)

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ y: 150, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 150, opacity: 0 }}
          transition={{
            type: 'spring',
            damping: 20,
            stiffness: 300,
            mass: 0.8
          }}
          style={{
            position: 'fixed',
            bottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
            left: '50%',
            translateX: '-50%',
            zIndex: 900,
            width: 'auto',
          }}
        >
          {/* Dynamic Island Capsule */}
          <div style={{
            background: 'rgba(15, 15, 18, 0.85)', // Darker, richer key
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderRadius: '100px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 4,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: `
              0 20px 40px -10px rgba(0,0,0,0.6),
              0 0 0 1px rgba(0,0,0,1),
              inset 0 1px 0 rgba(255,255,255,0.15)
            `,
            position: 'relative',
            overflow: 'hidden'
          }}>

            {/* Top Gloss Highlight */}
            <div style={{
              position: 'absolute', top: 0, left: 20, right: 20, height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              zIndex: 10
            }} />

            {/* Bottom Golden Glow (Ambient) */}
            <div style={{
              position: 'absolute', bottom: -15, left: '20%', right: '20%', height: 30,
              background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.15) 0%, transparent 70%)',
              filter: 'blur(15px)',
              zIndex: 0
            }} />

            {/* Moving SPOTLIGHT Background for Active Item */}
            {activeIndex !== -1 && (
              <motion.div
                layoutId="navSpotlight"
                initial={false}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30
                }}
                style={{
                  position: 'absolute',
                  top: 6,
                  bottom: 6,
                  // We need to calculate position manually or use a fixed width assumption.
                  // Since we use flex and gap, let's use a simpler approach:
                  // The spotlight is "behind" the items.
                  // Actually, let's make it a floating pill behind the active item.
                  // Because we don't have refs to each item here easily without more complex code,
                  // we'll use the assumption that items are uniform width or handle it via a wrapper.
                  // BETTER APPROACH: Add the spotlight INSIDE the map but with layoutId.
                  display: 'none' // We'll do it inside the map loop for perfect alignment
                }}
              />
            )}

            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon

              return (
                <div key={item.id} style={{ position: 'relative' }}>
                  {/* Active Spotlight (The "Pill") */}
                  {isActive && (
                    <motion.div
                      layoutId="navPill"
                      style={{
                        position: 'absolute',
                        inset: 6,
                        borderRadius: '50px',
                        background: 'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.05) 100%)',
                        boxShadow: '0 0 20px rgba(212,175,55,0.15)',
                        border: '1px solid rgba(212,175,55,0.1)',
                        zIndex: 0
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  <MagneticItem
                    isActive={isActive}
                    onClick={() => {
                      haptic(isActive ? 'soft' : 'light')
                      navigate(item.path)
                    }}
                  >
                    <motion.div
                      animate={{
                        y: isActive ? -2 : 0,
                        scale: isActive ? 1.1 : 1,
                        color: isActive ? '#D4AF37' : '#71717a'
                      }}
                    >
                      <Icon
                        size={24}
                        strokeWidth={isActive ? 2.5 : 2}
                        fill={isActive ? "currentColor" : "none"}
                        fillOpacity={isActive ? 0.2 : 0}
                      />
                    </motion.div>

                    {/* Label is removed for ultra-clean "Icon Only" premium look on mobile, 
                        OR we keep it tiny. "Peak of elegance" often suggests minimalism.
                        Let's keep it very subtle or remove it. 
                        User asked for "maximum convenience". Labels help convenience.
                        We will keep them but very small and premium.
                    */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.span
                          key={`${item.id}-label`}
                          initial={{ opacity: 0, scale: 0.5, y: 5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.5, y: 5 }}
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            marginTop: 3,
                            color: '#D4AF37'
                          }}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Active Dot - optional if we have the pill. 
                        Let's stick to the Pill + Icon Fill for elegance. 
                        Removing the bottom dot to avoid clutter. 
                    */}
                  </MagneticItem>
                </div>
              )
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
