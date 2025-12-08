import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, FileText, BookOpen, Scroll, PenTool,
  ClipboardCheck, Presentation, Briefcase, Sparkles, Camera,
  Clock, Zap, Flame, ChevronRight, Check, ArrowLeft,
  Send, AlertCircle, Upload, X, FileUp, Thermometer, ChevronDown, Paperclip,
  Timer, Rocket, Hourglass, Tag, Percent, Loader2
} from 'lucide-react'
import { WorkType, OrderCreateRequest } from '../types'
import { createOrder } from '../api/userApi'
import { useTelegram } from '../hooks/useUserData'
import { useTheme } from '../contexts/ThemeContext'
import { usePromo } from '../contexts/PromoContext'
import { PromoCodeSection, PromoPriceDisplay } from '../components/ui/PromoCodeSection'
import { Confetti } from '../components/ui/Confetti'

const DRAFT_KEY = 'order_draft_v1'



// ═══════════════════════════════════════════════════════════════════════════
//  UPDATED PRICE LIST (from bot)
// ═══════════════════════════════════════════════════════════════════════════

interface WorkTypeConfig {
  value: WorkType
  label: string
  price: string
  priceNum: number
  icon: typeof FileText
  category: 'premium' | 'standard' | 'express'
}

const WORK_TYPES: WorkTypeConfig[] = [
  { value: 'masters', label: 'Магистерская', price: 'от 50 000 ₽', priceNum: 50000, icon: GraduationCap, category: 'premium' },
  { value: 'diploma', label: 'Диплом (ВКР)', price: 'от 40 000 ₽', priceNum: 40000, icon: GraduationCap, category: 'premium' },
  { value: 'coursework', label: 'Курсовая', price: 'от 14 000 ₽', priceNum: 14000, icon: BookOpen, category: 'standard' },
  { value: 'practice', label: 'Отчёт по практике', price: 'от 8 000 ₽', priceNum: 8000, icon: Briefcase, category: 'standard' },
  { value: 'essay', label: 'Реферат / Эссе', price: 'от 2 500 ₽', priceNum: 2500, icon: PenTool, category: 'express' },
  { value: 'presentation', label: 'Презентация', price: 'от 2 500 ₽', priceNum: 2500, icon: Presentation, category: 'express' },
  { value: 'control', label: 'Контрольная', price: 'от 2 500 ₽', priceNum: 2500, icon: ClipboardCheck, category: 'express' },
  { value: 'independent', label: 'Самостоятельная', price: 'от 2 500 ₽', priceNum: 2500, icon: Scroll, category: 'express' },
  { value: 'report', label: 'Реферат', price: 'от 2 500 ₽', priceNum: 2500, icon: FileText, category: 'express' },
  { value: 'photo_task', label: 'Задача по фото', price: 'индивидуально', priceNum: 0, icon: Camera, category: 'express' },
  { value: 'other', label: 'Другое', price: 'индивидуально', priceNum: 0, icon: Sparkles, category: 'express' },
]

interface DeadlineConfig {
  value: string
  label: string
  multiplier: string
  multiplierNum: number
  urgency: number // 0-100
  color: string
}

const DEADLINES: DeadlineConfig[] = [
  { value: 'today', label: 'Сегодня', multiplier: '+100%', multiplierNum: 2.0, urgency: 100, color: '#ef4444' },
  { value: 'tomorrow', label: 'Завтра', multiplier: '+70%', multiplierNum: 1.7, urgency: 85, color: '#f97316' },
  { value: '3days', label: '2-3 дня', multiplier: '+40%', multiplierNum: 1.4, urgency: 60, color: '#eab308' },
  { value: 'week', label: 'Неделя', multiplier: '+20%', multiplierNum: 1.2, urgency: 40, color: '#84cc16' },
  { value: '2weeks', label: '2 недели', multiplier: '+10%', multiplierNum: 1.1, urgency: 20, color: '#22c55e' },
  { value: 'month', label: 'Месяц+', multiplier: 'Базовая', multiplierNum: 1.0, urgency: 5, color: '#10b981' },
]

const STEP_CONFIG = [
  { num: 1, title: 'Тип работы', subtitle: 'Что нужно сделать?' },
  { num: 2, title: 'Детали заказа', subtitle: 'Расскажите подробнее' },
  { num: 3, title: 'Сроки', subtitle: 'Когда нужно сдать?' },
]

// Animation
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0 }),
}

// ═══════════════════════════════════════════════════════════════════════════
//  BENTO INPUT CARD (Solid Card Style)
// ═══════════════════════════════════════════════════════════════════════════

interface BentoInputCardProps {
  label: string
  value: string
  onChange: (val: string) => void
  placeholder?: string
  multiline?: boolean
  required?: boolean
  icon?: typeof FileText
  hasDropdown?: boolean
  disabled?: boolean
}

function BentoInputCard({ label, value, onChange, placeholder, multiline, required, icon: Icon, hasDropdown, disabled }: BentoInputCardProps) {
  const [focused, setFocused] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: disabled ? 1 : 0.995 }}
      style={{
        background: 'var(--bg-card-solid)',
        borderRadius: 16,
        border: focused ? '2px solid var(--border-gold-strong)' : '2px solid var(--border-default)',
        padding: '16px 18px',
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease, transform 0.15s ease',
        boxShadow: focused ? 'var(--glow-gold)' : 'none',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'default',
      }}
    >
      {/* Label */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
      }}>
        {Icon && <Icon size={14} color="var(--gold-400)" strokeWidth={2} />}
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--gold-400)',
        }}>
          {label} {required && <span style={{ opacity: 0.7 }}>*</span>}
        </span>
      </div>

      {/* Input Area */}
      <div style={{ position: 'relative' }}>
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            rows={3}
            disabled={disabled}
            style={{
              width: '100%',
              fontSize: 16,
              fontFamily: "'Inter', sans-serif",
              color: 'var(--text-main)',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              lineHeight: 1.5,
            }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={placeholder}
              disabled={disabled}
              style={{
                flex: 1,
                fontSize: 16,
                fontFamily: "'Inter', sans-serif",
                color: 'var(--text-main)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                padding: 0,
              }}
            />
            {hasDropdown && (
              <ChevronDown size={20} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  FILE VAULT MINI (Compact for Step 2)
// ═══════════════════════════════════════════════════════════════════════════

interface FileVaultMiniProps {
  files: File[]
  onAdd: (files: FileList) => void
  onRemove: (index: number) => void
}

function FileVaultMini({ files, onAdd, onRemove }: FileVaultMiniProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      onAdd(e.dataTransfer.files)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--bg-card-solid)',
        borderRadius: 16,
        border: isDragging ? '2px solid var(--border-gold-strong)' : '2px solid var(--border-default)',
        padding: '16px 18px',
        transition: 'border-color 0.2s ease',
      }}
    >
      {/* Label */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
      }}>
        <Paperclip size={14} color="var(--gold-400)" strokeWidth={2} />
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--gold-400)',
        }}>
          Файлы
        </span>
        <span style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          marginLeft: 'auto',
        }}>
          Необязательно
        </span>
      </div>

      {/* Drop Zone */}
      <motion.div
        animate={{
          background: isDragging ? 'rgba(212,175,55,0.08)' : 'var(--bg-glass)',
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          padding: '20px 16px',
          borderRadius: 12,
          border: '1px dashed var(--border-gold)',
          cursor: 'pointer',
          textAlign: 'center',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files && onAdd(e.target.files)}
          style={{ display: 'none' }}
        />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(212,175,55,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FileUp size={18} color="var(--gold-400)" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
              Прикрепить файлы
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
              Методички, примеры, требования
            </p>
          </div>
        </div>
      </motion.div>

      {/* File List */}
      {files.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {files.map((file, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'var(--bg-glass)',
                borderRadius: 10,
              }}
            >
              <Upload size={16} color="var(--gold-400)" />
              <span style={{
                flex: 1,
                fontSize: 13,
                color: 'var(--text-main)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {file.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {(file.size / 1024).toFixed(0)} KB
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(i) }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: 'var(--error-glass)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={12} color="var(--error-text)" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  WORK TYPE CARD
// ═══════════════════════════════════════════════════════════════════════════

interface WorkTypeCardProps {
  config: WorkTypeConfig
  selected: boolean
  onSelect: () => void
  index: number
}

function WorkTypeCard({ config, selected, onSelect, index }: WorkTypeCardProps) {
  const Icon = config.icon

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '24px 16px',
        minHeight: 140,
        background: selected
          ? 'linear-gradient(145deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))'
          : 'var(--bg-card)',
        backdropFilter: 'blur(12px)',
        border: selected
          ? '2px solid var(--border-gold-strong)'
          : '1px solid var(--border-default)',
        borderRadius: 20,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: selected
          ? 'var(--glow-gold-strong)'
          : 'var(--card-shadow)',
        WebkitTapHighlightColor: 'transparent',
        transition: 'all 0.2s ease-out',
      }}
    >
      {/* Glow */}
      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute',
            inset: -30,
            background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Category badge */}
      {config.category === 'premium' && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          padding: '3px 8px',
          fontSize: 9,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#050505',
          background: 'var(--gold-metallic)',
          borderRadius: 6,
        }}>
          Premium
        </div>
      )}

      {/* Icon */}
      <div style={{
        width: 52,
        height: 52,
        borderRadius: 14,
        background: selected
          ? 'linear-gradient(145deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))'
          : 'var(--bg-glass)',
        border: `1px solid ${selected ? 'var(--border-gold-strong)' : 'var(--border-default)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        <Icon size={26} color={selected ? 'var(--gold-300)' : 'var(--text-muted)'} strokeWidth={1.5} />
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: selected ? 'var(--text-main)' : 'var(--text-secondary)',
          marginBottom: 4,
        }}>
          {config.label}
        </div>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: selected ? 'var(--gold-300)' : 'var(--text-muted)',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {config.price}
        </div>
      </div>

      {/* Checkmark */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--gold-metallic)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--glow-gold)',
            }}
          >
            <Check size={14} color="#050505" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  FILE UPLOAD ZONE
// ═══════════════════════════════════════════════════════════════════════════



// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM DEADLINE CARD — Ultra-luxe urgency selection
// ═══════════════════════════════════════════════════════════════════════════

interface DeadlineCardProps {
  config: DeadlineConfig
  selected: boolean
  onSelect: () => void
  index: number
  isDark: boolean
}

function DeadlineCard({ config, selected, onSelect, index, isDark }: DeadlineCardProps) {
  // Choose icon based on urgency level
  const getIcon = () => {
    if (config.urgency >= 85) return Flame
    if (config.urgency >= 60) return Rocket
    if (config.urgency >= 40) return Zap
    if (config.urgency >= 20) return Timer
    return Hourglass
  }
  const Icon = getIcon()

  // Theme-aware colors
  const theme = {
    cardBg: isDark
      ? 'rgba(18, 18, 22, 0.95)'
      : 'rgba(255, 255, 255, 0.95)',
    cardBgSelected: isDark
      ? `linear-gradient(135deg, ${config.color}15 0%, ${config.color}08 100%)`
      : `linear-gradient(135deg, ${config.color}12 0%, ${config.color}05 100%)`,
    border: isDark
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(120, 85, 40, 0.08)',
    borderSelected: isDark
      ? `${config.color}60`
      : `${config.color}50`,
    shadow: isDark
      ? '0 4px 20px -4px rgba(0, 0, 0, 0.5)'
      : '0 4px 20px -4px rgba(120, 85, 40, 0.12)',
    shadowSelected: isDark
      ? `0 8px 32px -4px ${config.color}30, 0 0 0 1px ${config.color}30`
      : `0 8px 32px -4px ${config.color}25, 0 0 0 1px ${config.color}25`,
    text: isDark ? '#f2f2f2' : '#18181b',
    textSecondary: isDark ? '#a1a1aa' : '#52525b',
    barBg: isDark
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(0, 0, 0, 0.06)',
    iconBg: isDark
      ? `${config.color}18`
      : `${config.color}12`,
    iconBorder: isDark
      ? `${config.color}35`
      : `${config.color}25`,
  }

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.06,
        type: 'spring',
        stiffness: 400,
        damping: 30,
      }}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        padding: '16px 18px',
        background: selected ? theme.cardBgSelected : theme.cardBg,
        border: `2px solid ${selected ? theme.borderSelected : theme.border}`,
        borderRadius: 18,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        boxShadow: selected ? theme.shadowSelected : theme.shadow,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Animated glow for selected */}
      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute',
            inset: -1,
            borderRadius: 18,
            background: `radial-gradient(ellipse at 30% 50%, ${config.color}20 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Premium shimmer on selected */}
      {selected && (
        <motion.div
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '50%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            transform: 'skewX(-20deg)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Icon container with glow */}
      <motion.div
        animate={selected ? {
          boxShadow: [
            `0 0 20px ${config.color}40`,
            `0 0 30px ${config.color}50`,
            `0 0 20px ${config.color}40`,
          ],
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: theme.iconBg,
          border: `1.5px solid ${theme.iconBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <motion.div
          animate={selected && config.urgency >= 70 ? {
            rotate: [0, -5, 5, -5, 0],
            scale: [1, 1.1, 1],
          } : {}}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1.5 }}
        >
          <Icon
            size={24}
            color={config.color}
            strokeWidth={selected ? 2.5 : 2}
            style={{
              filter: selected ? `drop-shadow(0 0 8px ${config.color}60)` : 'none',
            }}
          />
        </motion.div>
      </motion.div>

      {/* Content */}
      <div style={{ flex: 1, textAlign: 'left', position: 'relative', zIndex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}>
          <span style={{
            fontSize: 16,
            fontWeight: selected ? 700 : 600,
            color: selected ? theme.text : theme.textSecondary,
            letterSpacing: '-0.01em',
          }}>
            {config.label}
          </span>
          <motion.span
            animate={selected ? {
              scale: [1, 1.05, 1],
            } : {}}
            transition={{ duration: 1, repeat: Infinity }}
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: config.color,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '-0.02em',
              textShadow: selected ? `0 0 12px ${config.color}50` : 'none',
            }}
          >
            {config.multiplier}
          </motion.span>
        </div>

        {/* Premium urgency bar */}
        <div style={{
          height: 6,
          background: theme.barBg,
          borderRadius: 4,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: `${config.urgency}%`, opacity: 1 }}
            transition={{
              delay: index * 0.06 + 0.2,
              duration: 0.6,
              ease: [0.4, 0, 0.2, 1],
            }}
            style={{
              height: '100%',
              background: `linear-gradient(90deg, ${config.color}cc, ${config.color})`,
              borderRadius: 4,
              boxShadow: selected
                ? `0 0 16px ${config.color}60, inset 0 1px 0 rgba(255,255,255,0.3)`
                : `0 0 8px ${config.color}40`,
              position: 'relative',
            }}
          >
            {/* Animated shine on bar */}
            <motion.div
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatDelay: 2,
                delay: index * 0.1,
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '30%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              }}
            />
          </motion.div>
        </div>
      </div>

      {/* Premium checkmark */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: isDark
                ? 'linear-gradient(145deg, #f5d061, #d4af37, #b48e26)'
                : 'linear-gradient(145deg, #d4af37, #b48e26, #8b6914)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: isDark
                ? '0 4px 16px rgba(212, 175, 55, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                : '0 4px 12px rgba(180, 142, 38, 0.35)',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Check size={16} color="#050505" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

// Prefill data interface for Quick Reorder feature
interface PrefillData {
  work_type?: WorkType
  subject?: string
  deadline?: string
  topic?: string
}

export function CreateOrderPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { haptic, hapticSuccess, hapticError } = useTelegram()
  const { isDark } = useTheme()
  const { activePromo, clearPromo, revalidatePromo, isValidating: isRevalidating } = usePromo()

  // State for promo warning modal
  const [showPromoWarning, setShowPromoWarning] = useState(false)
  const [promoLostReason, setPromoLostReason] = useState<string | null>(null)

  // Check for prefill data from navigation state (Quick Reorder)
  const prefillData = (location.state as { prefill?: PrefillData })?.prefill

  // Check for urgent/panic mode from URL params
  const isUrgentMode = searchParams.get('urgent') === 'true'
  const preselectedType = (prefillData?.work_type || searchParams.get('type')) as WorkType | null

  // Is this a reorder?
  const isReorder = !!prefillData

  // Wizard
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(0)

  // Form data - initialize with prefill values if available
  const [workType, setWorkType] = useState<WorkType | null>(preselectedType)
  const [subject, setSubject] = useState(prefillData?.subject || '')
  const [topic, setTopic] = useState(prefillData?.topic || '')
  const [description, setDescription] = useState(isUrgentMode ? 'СРОЧНО! ' : '')
  const [files, setFiles] = useState<File[]>([])
  const [deadline, setDeadline] = useState<string | null>(isUrgentMode ? 'today' : null)

  // UI
  const [submitting, setSubmitting] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [result, setResult] = useState<{
    ok: boolean;
    msg: string;
    id?: number;
    promoUsed?: { code: string; discount: number } | null;
    basePrice?: number;
  } | null>(null)

  // Auto-save draft functionality - save form data to localStorage
  useEffect(() => {
    // Don't save if we're on result screen or submitting
    if (step === 4 || submitting) return

    const draftData = {
      workType,
      subject,
      topic,
      description,
      deadline,
      step,
      timestamp: Date.now(),
    }

    // Debounce saves to avoid too many writes
    const timeoutId = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData))
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [workType, subject, topic, description, deadline, step, submitting])

  // Load draft on mount (only if not prefilled and not result screen)
  useEffect(() => {
    if (isReorder || isUrgentMode) return // Don't load draft if coming from prefill

    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY)
      if (savedDraft) {
        const draft = JSON.parse(savedDraft)
        const age = Date.now() - (draft.timestamp || 0)

        // Only restore if draft is less than 24 hours old
        if (age < 24 * 60 * 60 * 1000) {
          setWorkType(draft.workType || null)
          setSubject(draft.subject || '')
          setTopic(draft.topic || '')
          setDescription(draft.description || '')
          setDeadline(draft.deadline || null)
          setStep(draft.step || 1)

          // Show a subtle hint that draft was restored
          haptic('light')
        } else {
          // Clear old draft
          localStorage.removeItem(DRAFT_KEY)
        }
      }
    } catch (err) {
      console.error('Failed to load draft:', err)
      localStorage.removeItem(DRAFT_KEY)
    }
  }, []) // Only run on mount

  // Auto-advance to step 2 if type is pre-selected (urgent mode)
  useEffect(() => {
    if (preselectedType && isUrgentMode) {
      setStep(2)
    }
  }, [preselectedType, isUrgentMode])

  // Validation
  const canStep1 = workType !== null
  const canStep2 = subject.trim().length >= 2
  const canStep3 = deadline !== null

  // Navigation
  const goNext = () => {
    haptic('medium')
    setDirection(1)
    setStep((s) => Math.min(s + 1, 3))
  }

  const goBack = () => {
    haptic('light')
    if (step === 1) navigate(-1)
    else {
      setDirection(-1)
      setStep((s) => s - 1)
    }
  }

  // Add haptic feedback when user selects work type or deadline
  const handleWorkTypeSelect = (value: WorkType) => {
    haptic('light')
    setWorkType(value)
  }

  const handleDeadlineSelect = (value: string) => {
    haptic('light')
    setDeadline(value)
  }

  // Files
  const addFiles = (fileList: FileList) => {
    haptic('light')
    setFiles((prev) => [...prev, ...Array.from(fileList)])
  }
  const removeFile = (index: number) => {
    haptic('light')
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Enhanced submit with better progress feedback
  const handleSubmit = async (forceWithoutPromo: boolean = false) => {
    if (!workType || !deadline || !subject.trim()) return

    // DEBUG: Log promo state at submit time
    console.log('[CreateOrderPage] 🎟️ handleSubmit called')
    console.log('[CreateOrderPage] 🎟️ activePromo at submit:', activePromo)
    console.log('[CreateOrderPage] 🎟️ forceWithoutPromo:', forceWithoutPromo)

    haptic('heavy')
    setSubmitting(true)

    try {
      // Re-validate promo before submitting (unless forced to proceed without it)
      let promoToUse = activePromo?.code
      console.log('[CreateOrderPage] 🎟️ promoToUse initial:', promoToUse)
      if (activePromo && !forceWithoutPromo) {
        const promoStillValid = await revalidatePromo()
        if (!promoStillValid) {
          // Promo became invalid - show warning to user
          setSubmitting(false)
          setPromoLostReason('Промокод больше не действителен')
          setShowPromoWarning(true)
          hapticError()
          return
        }
      }

    // If forced without promo, don't send promo code
    // NOTE: Check for boolean true explicitly because React may pass event object
    if (forceWithoutPromo === true) {
      promoToUse = undefined
    }

      const data: OrderCreateRequest = {
        work_type: workType,
        subject: subject.trim(),
        topic: topic.trim() || undefined,
        deadline,
        description: description.trim() || undefined,
        promo_code: promoToUse,
      }

      console.log('[CreateOrderPage] 🎟️ Sending order with data:', JSON.stringify(data))
      console.log('[CreateOrderPage] 🎟️ promo_code in request:', data.promo_code)

      const res = await createOrder(data)
      if (res.success) {
        // Store promo info and base price BEFORE clearing promo
        // CHECK IF PROMO ACTUALLY FAILED ON BACKEND
        const actualPromoUsed = res.promo_failed ? null : (activePromo ? {
          code: activePromo.code,
          discount: activePromo.discount
        } : null)

        const basePrice = getBaseEstimate()

        // Clear draft and used promo code on success
        localStorage.removeItem(DRAFT_KEY)
        if (activePromo) {
          clearPromo() // Clear promo code after successful order
        }

        hapticSuccess()
        // Trigger confetti celebration ONLY if promo didn't fail or if it's a regular success
        if (!res.promo_failed) setShowConfetti(true)

        // Construct message
        let finalMsg = typeof res.message === 'string' ? res.message : JSON.stringify(res.message)
        if (res.promo_failed && res.promo_failure_reason) {
          finalMsg = `Заказ создан, но промокод не применён: ${res.promo_failure_reason}`
        }

        setResult({
          ok: true,
          msg: finalMsg,
          id: res.order_id,
          promoUsed: actualPromoUsed, // Use the verified promo status
          basePrice: basePrice || undefined
        })
      } else {
        hapticError()
        // Ensure message is always a string - handle unexpected object responses
        const errorMsg = typeof res.message === 'string'
          ? res.message
          : (typeof res.message === 'object' ? JSON.stringify(res.message) : 'Произошла ошибка')
        setResult({ ok: false, msg: errorMsg })
      }
    } catch (err) {
      hapticError()
      // Error message already translated in apiFetch
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка'
      setResult({ ok: false, msg: errorMessage })
    } finally {
      setSubmitting(false)
      setStep(4) // Result screen
    }
  }

  // Handle promo warning response
  const handlePromoWarningContinue = () => {
    setShowPromoWarning(false)
    clearPromo()
    handleSubmit(true) // Continue without promo
  }

  const handlePromoWarningCancel = () => {
    setShowPromoWarning(false)
    setPromoLostReason(null)
  }

  // Get estimated price (with promo discount if valid)
  const getEstimate = () => {
    if (!workType || !deadline) return null
    const wt = WORK_TYPES.find((w) => w.value === workType)
    const dl = DEADLINES.find((d) => d.value === deadline)
    if (!wt || !dl || wt.priceNum === 0) return null
    const basePrice = Math.round(wt.priceNum * dl.multiplierNum)
    if (activePromo) {
      return Math.round(basePrice * (1 - activePromo.discount / 100))
    }
    return basePrice
  }

  // Get base estimate without discount for comparison
  const getBaseEstimate = () => {
    if (!workType || !deadline) return null
    const wt = WORK_TYPES.find((w) => w.value === workType)
    const dl = DEADLINES.find((d) => d.value === deadline)
    if (!wt || !dl || wt.priceNum === 0) return null
    return Math.round(wt.priceNum * dl.multiplierNum)
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  RESULT SCREEN
  // ─────────────────────────────────────────────────────────────────────────

  if (step === 4 && result) {
    // Calculate savings if promo was applied (using stored promo info from result)
    const promoUsed = result.promoUsed
    const basePrice = result.basePrice
    const savings = basePrice && promoUsed
      ? Math.round(basePrice * (promoUsed.discount / 100))
      : 0

    return (
      <div style={{ padding: 24, paddingBottom: 160, minHeight: '100vh', background: 'var(--bg-main)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '70vh',
            textAlign: 'center',
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: result.ok
                ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))'
                : 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.05))',
              border: `3px solid ${result.ok ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 32,
              boxShadow: `0 0 60px -10px ${result.ok ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
            }}
          >
            {result.ok ? (
              <Check size={50} color="#22c55e" strokeWidth={2} />
            ) : (
              <AlertCircle size={50} color="#ef4444" strokeWidth={2} />
            )}
          </motion.div>

          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28,
            fontWeight: 700,
            color: result.ok ? 'var(--text-main)' : 'var(--error-text)',
            marginBottom: 16,
          }}>
            {result.ok ? 'Заказ создан!' : 'Ошибка'}
          </h2>

          <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: result.ok && promoUsed ? 20 : 40, maxWidth: 300, lineHeight: 1.6 }}>
            {result.msg}
          </p>

          {/* Promo savings card */}
          {result.ok && promoUsed && savings > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                padding: '20px 24px',
                marginBottom: 32,
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))',
                border: '2px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 20,
                maxWidth: 320,
                width: '100%',
                boxShadow: '0 8px 32px -8px rgba(34, 197, 94, 0.3)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Shimmer effect */}
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '50%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                  transform: 'skewX(-20deg)',
                  pointerEvents: 'none',
                }}
              />

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
              }}>
                <Tag size={18} color="#22c55e" />
                <span style={{
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: '#22c55e',
                  letterSpacing: '0.05em',
                }}>
                  {promoUsed.code}
                </span>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(34, 197, 94, 0.25)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#22c55e',
                }}>
                  -{promoUsed.discount}%
                </span>
              </div>

              <div style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                marginBottom: 4,
              }}>
                Ваша экономия
              </div>

              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  fontFamily: "'JetBrains Mono', monospace",
                  background: 'linear-gradient(135deg, #22c55e, #4ade80)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: '0 0 20px rgba(34, 197, 94, 0.3)',
                }}
              >
                {savings.toLocaleString('ru-RU')} ₽
              </motion.div>
            </motion.div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 320 }}>
            {result.ok && result.id && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: promoUsed ? 0.6 : 0.3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/order/${result.id}`)}
                style={{
                  padding: '18px 28px',
                  fontSize: 17,
                  fontWeight: 700,
                  fontFamily: "'Playfair Display', serif",
                  color: '#050505',
                  background: 'linear-gradient(180deg, #f5d061, #d4af37, #b48e26)',
                  border: 'none',
                  borderRadius: 16,
                  cursor: 'pointer',
                  boxShadow: '0 0 35px -8px rgba(212,175,55,0.6)',
                }}
              >
                Открыть заказ
              </motion.button>
            )}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: promoUsed ? 0.7 : 0.4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/')}
              style={{
                padding: '16px 28px',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-default)',
                borderRadius: 16,
                cursor: 'pointer',
              }}
            >
              На главную
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  WIZARD
  // ─────────────────────────────────────────────────────────────────────────

  const currentConfig = STEP_CONFIG[step - 1]
  const canProceed = step === 1 ? canStep1 : step === 2 ? canStep2 : canStep3
  const estimate = getEstimate()

  return (
    <div style={{
      padding: 24,
      paddingBottom: 180, // Space for button + nav
      minHeight: '100vh',
      background: 'var(--bg-main)',
    }}>
      {/* Reorder Banner */}
      {isReorder && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            marginBottom: 16,
            background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: 14,
          }}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Check size={20} color="#050505" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#22c55e', marginBottom: 2 }}>
              Повторный заказ
            </div>
            <div style={{ fontSize: 12, color: '#a1a1aa' }}>
              Данные предзаполнены из прошлого заказа
            </div>
          </div>
        </motion.div>
      )}

      {/* Draft Restored Banner */}
      <AnimatePresence>
        {localStorage.getItem(DRAFT_KEY) && step === 1 && !isReorder && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              marginBottom: 16,
              background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 12,
            }}
          >
            <Clock size={16} color="#3b82f6" />
            <span style={{ fontSize: 12, color: '#60a5fa', flex: 1 }}>
              Черновик восстановлен
            </span>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                localStorage.removeItem(DRAFT_KEY)
                window.location.reload()
              }}
              style={{
                padding: '4px 8px',
                background: 'rgba(59,130,246,0.2)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: 6,
                fontSize: 11,
                color: '#60a5fa',
                cursor: 'pointer',
              }}
            >
              Сбросить
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={goBack}
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={22} color="var(--text-secondary)" />
        </motion.button>

        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 26,
            fontWeight: 700,
            background: 'var(--gold-metallic)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 4,
          }}>
            {currentConfig?.title}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{currentConfig?.subtitle}</p>
        </div>

        <div style={{
          padding: '10px 16px',
          background: 'rgba(212,175,55,0.1)',
          border: '1px solid var(--border-gold)',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--gold-400)',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {step}/3
        </div>
      </motion.div>

      {/* Progress */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {[1, 2, 3].map((s) => (
          <motion.div
            key={s}
            animate={{
              background: s <= step ? 'linear-gradient(90deg, #d4af37, #f5d061)' : 'rgba(255,255,255,0.08)',
              boxShadow: s <= step ? '0 0 12px rgba(212,175,55,0.5)' : 'none',
            }}
            style={{ flex: 1, height: 5, borderRadius: 3 }}
          />
        ))}
      </div>

      {/* Steps */}
      <AnimatePresence mode="wait" custom={direction}>
        {step === 1 && (
          <motion.div
            key="s1"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {WORK_TYPES.map((wt, i) => (
                <WorkTypeCard
                  key={wt.value}
                  config={wt}
                  selected={workType === wt.value}
                  onSelect={() => handleWorkTypeSelect(wt.value)}
                  index={i}
                />
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="s2"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 32 }}
          >
            <BentoInputCard
              label="Предмет / Дисциплина"
              value={subject}
              onChange={setSubject}
              placeholder="Например: Экономика, Программирование..."
              icon={BookOpen}
              hasDropdown
              required
              disabled={submitting || isRevalidating}
            />

            <BentoInputCard
              label="Тема работы"
              value={topic}
              onChange={setTopic}
              placeholder="Оставьте пустым, если тема свободная"
              icon={FileText}
              disabled={submitting || isRevalidating}
            />

            <BentoInputCard
              label="Дополнительные требования"
              value={description}
              onChange={setDescription}
              placeholder="Объём, оформление, особые пожелания..."
              icon={PenTool}
              multiline
              disabled={submitting || isRevalidating}
            />

            <FileVaultMini files={files} onAdd={addFiles} onRemove={removeFile} />
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="s3"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {DEADLINES.map((dl, i) => (
                <DeadlineCard
                  key={dl.value}
                  config={dl}
                  selected={deadline === dl.value}
                  onSelect={() => handleDeadlineSelect(dl.value)}
                  index={i}
                  isDark={isDark}
                />
              ))}
            </div>

            {/* Promo Code Section - Using Global PromoContext */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              style={{ marginTop: 20 }}
            >
              <PromoCodeSection
                variant="inline"
                basePrice={getBaseEstimate() || undefined}
              />
            </motion.div>

            {/* Premium Estimate Card with Tooltip */}
            {estimate && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
                style={{
                  marginTop: 20,
                  padding: '20px 24px',
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)'
                    : 'linear-gradient(135deg, rgba(180,142,38,0.1) 0%, rgba(180,142,38,0.03) 100%)',
                  border: isDark
                    ? '2px solid rgba(212, 175, 55, 0.3)'
                    : '2px solid rgba(180, 142, 38, 0.25)',
                  borderRadius: 20,
                  boxShadow: isDark
                    ? '0 8px 32px -8px rgba(212, 175, 55, 0.25)'
                    : '0 8px 32px -8px rgba(180, 142, 38, 0.2)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Shimmer effect */}
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '50%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                    transform: 'skewX(-20deg)',
                    pointerEvents: 'none',
                  }}
                />

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  position: 'relative',
                  zIndex: 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(180, 142, 38, 0.12)',
                      border: isDark ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(180, 142, 38, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Thermometer size={22} color={isDark ? '#d4af37' : '#9e7a1a'} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: isDark ? '#a1a1aa' : '#52525b',
                        }}>
                          Ориентировочно
                        </span>
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: 'rgba(59,130,246,0.15)',
                            border: '1px solid rgba(59,130,246,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'help',
                          }}
                          title="Точная цена будет рассчитана менеджером после оценки объёма работы. Дополнительные скидки (постоянного клиента) будут применены автоматически."
                        >
                          <AlertCircle size={10} color="#3b82f6" />
                        </motion.div>
                      </div>
                      {activePromo && (
                        <span style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#22c55e',
                          display: 'block',
                          marginTop: 2,
                        }}>
                          С промокодом {activePromo.discount}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {/* Show original price crossed out if discount applied */}
                    {activePromo && getBaseEstimate() && (
                      <div style={{
                        fontSize: 14,
                        color: 'var(--text-muted)',
                        textDecoration: 'line-through',
                        marginBottom: 4,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {getBaseEstimate()?.toLocaleString('ru-RU')} ₽
                      </div>
                    )}
                    <motion.span
                      key={estimate}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      style={{
                        fontSize: 24,
                        fontWeight: 800,
                        color: activePromo ? '#22c55e' : (isDark ? '#d4af37' : '#9e7a1a'),
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: '-0.02em',
                        textShadow: activePromo
                          ? '0 0 20px rgba(34, 197, 94, 0.4)'
                          : (isDark
                            ? '0 0 20px rgba(212, 175, 55, 0.4)'
                            : '0 0 16px rgba(180, 142, 38, 0.3)'),
                        display: 'block',
                      }}
                    >
                      {estimate.toLocaleString('ru-RU')} ₽
                    </motion.span>
                    {activePromo && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#22c55e',
                          marginTop: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 6,
                        }}
                      >
                        <Tag size={12} />
                        {activePromo.code} −{activePromo.discount}%
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Button — Premium Shimmer Effect */}
      <motion.div
        style={{
          position: 'fixed',
          bottom: 'calc(110px + env(safe-area-inset-bottom, 0px))',
          left: 24,
          right: 24,
          zIndex: 999,
          pointerEvents: canProceed ? 'auto' : 'none', // Disable clicks when hidden
        }}
      >
        <AnimatePresence>
          {canProceed && (
            <motion.button
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              whileTap={canProceed ? { scale: 0.97 } : undefined}
              onClick={step === 3 ? handleSubmit : goNext}
              disabled={!canProceed || submitting}
              style={{
                position: 'relative',
                width: '100%',
                padding: '20px 28px',
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "'Playfair Display', serif",
                letterSpacing: '0.02em',
                color: canProceed ? '#050505' : 'var(--text-muted)',
                background: canProceed
                  ? 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #D4AF37 50%, #B38728 75%, #FBF5B7 100%)'
                  : 'var(--bg-glass)',
                backgroundSize: canProceed ? '200% 200%' : 'auto',
                border: 'none',
                borderRadius: 18,
                cursor: canProceed && !submitting ? 'pointer' : 'not-allowed',
                boxShadow: canProceed
                  ? '0 0 40px -5px rgba(212, 175, 55, 0.5), 0 10px 30px -10px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
                  : 'none',
                opacity: canProceed ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                overflow: 'hidden',
                animation: canProceed ? 'liquid-gold-shift 4s ease-in-out infinite' : 'none',
              }}
            >
              {/* Premium Shimmer Sweep */}
              {canProceed && !submitting && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                  animation: 'shimmer-pass 2.5s ease-in-out infinite',
                  pointerEvents: 'none',
                }} />
              )}
              {/* Inner Highlight */}
              {canProceed && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '50%',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
                  borderRadius: '18px 18px 0 0',
                  pointerEvents: 'none',
                }} />
              )}
              <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                {submitting ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <Loader2 size={22} />
                    </motion.div>
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                      <span>Отправка заказа...</span>
                      <span style={{ fontSize: 11, opacity: 0.7 }}>
                        {isRevalidating ? 'Проверка промокода...' : 'Создание заказа...'}
                      </span>
                    </span>
                  </>
                ) : step === 3 ? (
                  <>
                    <Send size={20} />
                    Рассчитать стоимость
                  </>
                ) : (
                  <>
                    {step === 2 ? 'Выбрать сроки' : 'Продолжить'}
                    <ChevronRight size={24} />
                  </>
                )}
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Promo Lost Warning Modal - Premium Enhanced */}
      <AnimatePresence>
        {showPromoWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
            onClick={handlePromoWarningCancel}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: isDark
                  ? 'linear-gradient(145deg, #1f1f25 0%, #18181c 100%)'
                  : 'linear-gradient(145deg, #ffffff 0%, #f8f8f8 100%)',
                borderRadius: 28,
                padding: '32px 28px',
                maxWidth: 380,
                width: '100%',
                border: `2px solid rgba(239, 68, 68, 0.3)`,
                boxShadow: isDark
                  ? '0 25px 80px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(239, 68, 68, 0.1)'
                  : '0 25px 80px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(239, 68, 68, 0.1)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Animated gradient background */}
              <motion.div
                animate={{
                  opacity: [0.1, 0.2, 0.1],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{
                  position: 'absolute',
                  top: -50,
                  left: -50,
                  width: 200,
                  height: 200,
                  background: 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)',
                  filter: 'blur(40px)',
                  pointerEvents: 'none',
                }}
              />

              {/* Warning Icon with Pulse */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '3px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  boxShadow: '0 0 30px -5px rgba(239, 68, 68, 0.4)',
                }}
              >
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <AlertCircle size={36} color="#ef4444" strokeWidth={2.5} />
                </motion.div>
              </motion.div>

              {/* Title */}
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 24,
                  fontWeight: 700,
                  color: isDark ? '#f2f2f2' : '#18181b',
                  textAlign: 'center',
                  marginBottom: 14,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                Промокод недействителен
              </motion.h3>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{
                  fontSize: 15,
                  color: isDark ? '#a1a1aa' : '#52525b',
                  textAlign: 'center',
                  lineHeight: 1.7,
                  marginBottom: 28,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {promoLostReason || 'Промокод больше не действителен.'}
                {' '}Вы можете создать заказ без скидки или вернуться и ввести другой промокод.
              </motion.p>

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePromoWarningContinue}
                  style={{
                    width: '100%',
                    padding: '18px 24px',
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#050505',
                    background: 'linear-gradient(135deg, #d4af37, #b8962e)',
                    border: 'none',
                    borderRadius: 16,
                    cursor: 'pointer',
                    boxShadow: '0 6px 24px -4px rgba(212, 175, 55, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                    transition: 'box-shadow 0.3s',
                  }}
                >
                  Создать без скидки
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePromoWarningCancel}
                  style={{
                    width: '100%',
                    padding: '18px 24px',
                    fontSize: 16,
                    fontWeight: 600,
                    color: isDark ? '#d4af37' : '#b8962e',
                    background: isDark
                      ? 'rgba(212, 175, 55, 0.08)'
                      : 'rgba(212, 175, 55, 0.12)',
                    border: `1.5px solid ${isDark ? 'rgba(212, 175, 55, 0.25)' : 'rgba(212, 175, 55, 0.3)'}`,
                    borderRadius: 16,
                    cursor: 'pointer',
                    transition: 'background 0.3s, border-color 0.3s',
                  }}
                >
                  Ввести другой промокод
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confetti Effect for successful order */}
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
    </div>
  )
}
