import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, MessageCircle, Gift, Sparkles,
  HelpCircle, Share2, FileText, Zap, Heart
} from 'lucide-react'
import { useTelegram } from '../../hooks/useUserData'

interface MenuItem {
  id: string
  icon: typeof Plus
  label: string
  color: string
  onClick: () => void
}

interface Props {
  onNewOrder?: () => void
  onBonus?: () => void
  onSupport?: () => void
  onShare?: () => void
  customItems?: MenuItem[]
}

export function FloatingMenu({
  onNewOrder,
  onBonus,
  onSupport,
  onShare,
  customItems,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const { haptic, hapticSuccess, openSupport } = useTelegram()

  const toggleMenu = useCallback(() => {
    haptic('medium')
    setIsOpen(prev => !prev)
  }, [haptic])

  const handleItemClick = useCallback((callback?: () => void) => {
    hapticSuccess()
    setIsOpen(false)
    callback?.()
  }, [hapticSuccess])

  const defaultItems: MenuItem[] = [
    {
      id: 'order',
      icon: FileText,
      label: 'Новый заказ',
      color: '#d4af37',
      onClick: () => handleItemClick(onNewOrder),
    },
    {
      id: 'bonus',
      icon: Gift,
      label: 'Бонусы',
      color: '#22c55e',
      onClick: () => handleItemClick(onBonus),
    },
    {
      id: 'support',
      icon: MessageCircle,
      label: 'Поддержка',
      color: '#3b82f6',
      onClick: () => handleItemClick(onSupport || openSupport),
    },
    {
      id: 'share',
      icon: Share2,
      label: 'Поделиться',
      color: '#a855f7',
      onClick: () => handleItemClick(onShare),
    },
  ]

  const items = customItems || defaultItems

  // Calculate positions in a fan/arc pattern
  const getItemPosition = (index: number, total: number) => {
    const startAngle = -135 // Start from top-left area
    const endAngle = -45  // End at top-right area
    const angleStep = (endAngle - startAngle) / (total - 1)
    const angle = (startAngle + angleStep * index) * (Math.PI / 180)
    const radius = 90

    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    }
  }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 998,
            }}
          />
        )}
      </AnimatePresence>

      {/* FAB Container */}
      <div style={{
        position: 'fixed',
        bottom: 100,
        right: 20,
        zIndex: 999,
      }}>
        {/* Menu Items */}
        <AnimatePresence>
          {isOpen && items.map((item, index) => {
            const pos = getItemPosition(index, items.length)
            const Icon = item.icon

            return (
              <motion.button
                key={item.id}
                initial={{
                  opacity: 0,
                  scale: 0,
                  x: 0,
                  y: 0,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  x: pos.x,
                  y: pos.y,
                }}
                exit={{
                  opacity: 0,
                  scale: 0,
                  x: 0,
                  y: 0,
                }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.05,
                  type: 'spring',
                  stiffness: 400,
                  damping: 25,
                }}
                whileTap={{ scale: 0.9 }}
                onClick={item.onClick}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: `linear-gradient(135deg, ${item.color}, ${item.color}cc)`,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 20px ${item.color}40, 0 0 30px ${item.color}20`,
                }}
              >
                <Icon size={22} color="#fff" />

                {/* Label tooltip */}
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  style={{
                    position: 'absolute',
                    right: '100%',
                    marginRight: 10,
                    padding: '6px 12px',
                    background: 'rgba(20, 20, 23, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    whiteSpace: 'nowrap',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#fff',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  }}
                >
                  {item.label}
                </motion.div>
              </motion.button>
            )
          })}
        </AnimatePresence>

        {/* Main FAB Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.3, type: 'spring' }}
          onClick={toggleMenu}
          style={{
            position: 'relative',
            width: 56,
            height: 56,
            borderRadius: 16,
            background: isOpen
              ? 'linear-gradient(135deg, #52525b, #3f3f46)'
              : 'linear-gradient(135deg, #d4af37, #b38728)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isOpen
              ? '0 4px 20px rgba(0,0,0,0.4)'
              : '0 4px 25px rgba(212,175,55,0.4), 0 0 40px rgba(212,175,55,0.2)',
            transition: 'box-shadow 0.3s',
          }}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X size={26} color="#fff" />
              </motion.div>
            ) : (
              <motion.div
                key="plus"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Plus size={26} color="#09090b" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pulse animation when closed */}
          {!isOpen && (
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: 18,
                border: '2px solid #d4af37',
                pointerEvents: 'none',
              }}
            />
          )}
        </motion.button>
      </div>
    </>
  )
}

// Quick Action FAB (single action button)
interface QuickFABProps {
  icon: typeof Plus
  label?: string
  color?: string
  onClick: () => void
  position?: 'left' | 'right'
}

export function QuickFAB({
  icon: Icon,
  label,
  color = '#d4af37',
  onClick,
  position = 'right',
}: QuickFABProps) {
  const { haptic } = useTelegram()
  const [showLabel, setShowLabel] = useState(false)

  const handleClick = () => {
    haptic('medium')
    onClick()
  }

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.9 }}
      onHoverStart={() => setShowLabel(true)}
      onHoverEnd={() => setShowLabel(false)}
      onClick={handleClick}
      style={{
        position: 'fixed',
        bottom: 100,
        [position]: 20,
        width: 52,
        height: 52,
        borderRadius: 14,
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 4px 25px ${color}40, 0 0 40px ${color}15`,
        zIndex: 900,
      }}
    >
      <Icon size={24} color="#fff" />

      {/* Label on hover/focus */}
      <AnimatePresence>
        {showLabel && label && (
          <motion.div
            initial={{ opacity: 0, x: position === 'right' ? 10 : -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              [position === 'right' ? 'right' : 'left']: '100%',
              [position === 'right' ? 'marginRight' : 'marginLeft']: 12,
              padding: '8px 14px',
              background: 'rgba(20, 20, 23, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              whiteSpace: 'nowrap',
              fontSize: 13,
              fontWeight: 500,
              color: '#fff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulse */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0, 0.2],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
        }}
        style={{
          position: 'absolute',
          inset: -3,
          borderRadius: 16,
          border: `2px solid ${color}`,
          pointerEvents: 'none',
        }}
      />
    </motion.button>
  )
}

// Speed Dial FAB (vertical list)
interface SpeedDialProps {
  items: MenuItem[]
  mainIcon?: typeof Plus
  mainColor?: string
}

export function SpeedDialFAB({
  items,
  mainIcon: MainIcon = Zap,
  mainColor = '#d4af37',
}: SpeedDialProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { haptic, hapticSuccess } = useTelegram()

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 998,
            }}
          />
        )}
      </AnimatePresence>

      <div style={{
        position: 'fixed',
        bottom: 100,
        right: 20,
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}>
        {/* Menu Items (stacked vertically) */}
        <AnimatePresence>
          {isOpen && items.map((item, index) => {
            const Icon = item.icon
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{
                  duration: 0.2,
                  delay: (items.length - 1 - index) * 0.05,
                }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  hapticSuccess()
                  setIsOpen(false)
                  item.onClick()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 16px 10px 12px',
                  background: 'rgba(20, 20, 23, 0.95)',
                  border: `1px solid ${item.color}40`,
                  borderRadius: 12,
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${item.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={18} color={item.color} />
                </div>
                <span style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#fff',
                }}>
                  {item.label}
                </span>
              </motion.button>
            )
          })}
        </AnimatePresence>

        {/* Main Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            haptic('medium')
            setIsOpen(prev => !prev)
          }}
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${mainColor}, ${mainColor}cc)`,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 25px ${mainColor}40`,
          }}
        >
          <motion.div animate={{ rotate: isOpen ? 45 : 0 }}>
            {isOpen ? (
              <X size={26} color="#09090b" />
            ) : (
              <MainIcon size={26} color="#09090b" />
            )}
          </motion.div>
        </motion.button>
      </div>
    </>
  )
}
