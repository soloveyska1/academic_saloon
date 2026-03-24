import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { X, ChevronRight, Star, Shield, Percent, Clock } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

interface Story {
  id: string
  title: string
  subtitle: string
  description: string
  ctaText: string
  ctaAction: 'order' | 'club' | 'dismiss'
  icon: LucideIcon
  accentColor: string
  bgGradient: string
}

const STORIES: Story[] = [
  {
    id: 'quality',
    title: 'Как мы пишем работы',
    subtitle: 'За кулисами',
    description: 'Каждый заказ проходит проверку на уникальность, вычитку и форматирование по ГОСТ. Средний балл наших работ — 4.7.',
    ctaText: 'Оформить заказ',
    ctaAction: 'order',
    icon: Star,
    accentColor: 'rgba(212,175,55,0.8)',
    bgGradient: 'linear-gradient(160deg, rgba(30,25,12,0.98) 0%, rgba(8,8,10,1) 100%)',
  },
  {
    id: 'guarantees',
    title: '3 бесплатные правки',
    subtitle: 'Гарантии',
    description: 'Не понравилось? Внесём правки бесплатно до 3 раз. Защита заказа действует 30 дней после сдачи.',
    ctaText: 'Подробнее',
    ctaAction: 'order',
    icon: Shield,
    accentColor: 'rgba(52, 211, 153, 0.8)',
    bgGradient: 'linear-gradient(160deg, rgba(12,25,18,0.98) 0%, rgba(8,8,10,1) 100%)',
  },
  {
    id: 'cashback',
    title: 'Кешбэк до 10%',
    subtitle: 'Программа лояльности',
    description: 'Возвращаем бонусами с каждого заказа. Чем больше заказов — тем выше процент. Бонусы можно потратить на следующий заказ.',
    ctaText: 'В клуб',
    ctaAction: 'club',
    icon: Percent,
    accentColor: 'rgba(167, 139, 250, 0.8)',
    bgGradient: 'linear-gradient(160deg, rgba(20,15,30,0.98) 0%, rgba(8,8,10,1) 100%)',
  },
  {
    id: 'speed',
    title: 'Срочный заказ за 24ч',
    subtitle: 'Экспресс',
    description: 'Горят сроки? Сделаем работу за 24 часа. Срочные заказы выполняются в приоритете нашими лучшими авторами.',
    ctaText: 'Заказать срочно',
    ctaAction: 'order',
    icon: Clock,
    accentColor: 'rgba(251, 146, 60, 0.8)',
    bgGradient: 'linear-gradient(160deg, rgba(30,18,8,0.98) 0%, rgba(8,8,10,1) 100%)',
  },
]

interface StoryCardsProps {
  onAction: (action: 'order' | 'club' | 'dismiss') => void
  haptic: (type: 'light' | 'medium' | 'heavy') => void
}

// Preview dots row
const StoryDots = memo(function StoryDots({
  stories,
  seenIds,
  onOpen,
}: {
  stories: Story[]
  seenIds: Set<string>
  onOpen: (index: number) => void
}) {
  return (
    <div style={{
      display: 'flex',
      gap: 10,
      padding: '0 0 4px',
      overflowX: 'auto',
      scrollbarWidth: 'none',
      WebkitOverflowScrolling: 'touch',
    }}>
      {stories.map((story, i) => {
        const seen = seenIds.has(story.id)
        const Icon = story.icon
        return (
          <motion.button
            key={story.id}
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => onOpen(i)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              minWidth: 64,
            }}
          >
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              padding: 2,
              background: seen
                ? 'rgba(255,255,255,0.08)'
                : `linear-gradient(135deg, ${story.accentColor}, rgba(212,175,55,0.6))`,
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'var(--bg-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon
                  size={20}
                  style={{
                    color: seen ? 'var(--text-muted)' : story.accentColor,
                    opacity: seen ? 0.5 : 1,
                  }}
                />
              </div>
            </div>
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              color: seen ? 'var(--text-muted)' : 'var(--text-secondary)',
              maxWidth: 64,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}>
              {story.subtitle}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
})

// Full-screen story viewer
function StoryViewer({
  stories,
  startIndex,
  onClose,
  onAction,
  onMarkSeen,
  haptic,
}: {
  stories: Story[]
  startIndex: number
  onClose: () => void
  onAction: (action: 'order' | 'club' | 'dismiss') => void
  onMarkSeen: (id: string) => void
  haptic: (type: 'light' | 'medium' | 'heavy') => void
}) {
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const story = stories[currentIndex]
  const progressTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const [progress, setProgress] = useState(0)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval>>()

  const STORY_DURATION = 6000

  useEffect(() => {
    onMarkSeen(story.id)
    setProgress(0)

    // Progress animation
    const startTime = Date.now()
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      setProgress(Math.min(elapsed / STORY_DURATION, 1))
    }, 50)

    // Auto-advance
    progressTimerRef.current = setTimeout(() => {
      if (currentIndex < stories.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else {
        onClose()
      }
    }, STORY_DURATION)

    return () => {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [currentIndex, stories.length, onClose, onMarkSeen, story.id])

  const goNext = useCallback(() => {
    haptic('light')
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      onClose()
    }
  }, [currentIndex, stories.length, onClose, haptic])

  const goPrev = useCallback(() => {
    haptic('light')
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }, [currentIndex, haptic])

  const handleDragEnd = useCallback((_: never, info: PanInfo) => {
    if (info.offset.y > 100) {
      onClose()
    }
  }, [onClose])

  const handleCTA = useCallback(() => {
    haptic('heavy')
    onAction(story.ctaAction)
    onClose()
  }, [haptic, onAction, story.ctaAction, onClose])

  const Icon = story.icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.3}
        onDragEnd={handleDragEnd}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: story.bgGradient,
        }}
      >
        {/* Progress bars */}
        <div style={{
          display: 'flex',
          gap: 3,
          padding: '12px 16px 8px',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
        }}>
          {stories.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 2,
                borderRadius: 1,
                background: 'rgba(255,255,255,0.15)',
                overflow: 'hidden',
              }}
            >
              <div style={{
                height: '100%',
                borderRadius: 1,
                background: 'rgba(255,255,255,0.9)',
                width: i < currentIndex ? '100%' : i === currentIndex ? `${progress * 100}%` : '0%',
                transition: i === currentIndex ? 'none' : 'width 0.2s ease',
              }} />
            </div>
          ))}
        </div>

        {/* Close button */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '4px 16px',
        }}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} color="rgba(255,255,255,0.8)" />
          </motion.button>
        </div>

        {/* Tap zones */}
        <div style={{
          flex: 1,
          display: 'flex',
          position: 'relative',
        }}>
          <div
            onClick={goPrev}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '30%',
              zIndex: 2,
            }}
          />
          <div
            onClick={goNext}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '70%',
              zIndex: 2,
            }}
          />

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={story.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '0 24px 40px',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {/* Icon */}
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: `${story.accentColor.replace('0.8', '0.12')}`,
                border: `1px solid ${story.accentColor.replace('0.8', '0.2')}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}>
                <Icon size={26} style={{ color: story.accentColor }} />
              </div>

              <div style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: story.accentColor,
                marginBottom: 8,
              }}>
                {story.subtitle}
              </div>

              <div style={{
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                fontSize: 28,
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
                marginBottom: 12,
              }}>
                {story.title}
              </div>

              <div style={{
                fontSize: 14,
                lineHeight: 1.55,
                color: 'var(--text-secondary)',
                marginBottom: 28,
                maxWidth: 320,
              }}>
                {story.description}
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={handleCTA}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '16px 24px',
                  borderRadius: 12,
                  border: 'none',
                  background: story.accentColor.replace('0.8', '0.15'),
                  color: story.accentColor,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {story.ctaText}
                <ChevronRight size={16} />
              </motion.button>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

export const StoryCards = memo(function StoryCards({ onAction, haptic }: StoryCardsProps) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [startIndex, setStartIndex] = useState(0)
  const [seenIds, setSeenIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('story_seen_ids')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  const handleOpen = useCallback((index: number) => {
    haptic('light')
    setStartIndex(index)
    setViewerOpen(true)
  }, [haptic])

  const handleMarkSeen = useCallback((id: string) => {
    setSeenIds(prev => {
      const next = new Set(prev)
      next.add(id)
      try {
        localStorage.setItem('story_seen_ids', JSON.stringify([...next]))
      } catch { /* ignore */ }
      return next
    })
  }, [])

  const handleClose = useCallback(() => {
    setViewerOpen(false)
  }, [])

  return (
    <>
      <StoryDots
        stories={STORIES}
        seenIds={seenIds}
        onOpen={handleOpen}
      />

      <AnimatePresence>
        {viewerOpen && (
          <StoryViewer
            stories={STORIES}
            startIndex={startIndex}
            onClose={handleClose}
            onAction={onAction}
            onMarkSeen={handleMarkSeen}
            haptic={haptic}
          />
        )}
      </AnimatePresence>
    </>
  )
})
