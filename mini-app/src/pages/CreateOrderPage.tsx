import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, FileText, BookOpen, Scroll, PenTool,
  ClipboardCheck, Presentation, Briefcase, Sparkles, Camera,
  Calendar, Clock, Zap, Flame, ChevronRight, Check, ArrowLeft,
  Send, AlertCircle, Upload, X, FileUp, Thermometer, ChevronDown, Paperclip
} from 'lucide-react'
import { WorkType, OrderCreateRequest } from '../types'
import { createOrder } from '../api/userApi'
import { useTelegram } from '../hooks/useUserData'

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
  { value: '3_days', label: '2-3 дня', multiplier: '+40%', multiplierNum: 1.4, urgency: 60, color: '#eab308' },
  { value: 'week', label: 'Неделя', multiplier: '+20%', multiplierNum: 1.2, urgency: 40, color: '#84cc16' },
  { value: '2_weeks', label: '2 недели', multiplier: '+10%', multiplierNum: 1.1, urgency: 20, color: '#22c55e' },
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
}

function BentoInputCard({ label, value, onChange, placeholder, multiline, required, icon: Icon, hasDropdown }: BentoInputCardProps) {
  const [focused, setFocused] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#14141a',
        borderRadius: 16,
        border: focused ? '2px solid rgba(212,175,55,0.5)' : '2px solid rgba(255,255,255,0.06)',
        padding: '16px 18px',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        boxShadow: focused ? '0 0 20px -5px rgba(212,175,55,0.3)' : 'none',
      }}
    >
      {/* Label */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
      }}>
        {Icon && <Icon size={14} color="#d4af37" strokeWidth={2} />}
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#d4af37',
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
            style={{
              width: '100%',
              fontSize: 16,
              fontFamily: "'Inter', sans-serif",
              color: '#f2f2f2',
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
              style={{
                flex: 1,
                fontSize: 16,
                fontFamily: "'Inter', sans-serif",
                color: '#f2f2f2',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                padding: 0,
              }}
            />
            {hasDropdown && (
              <ChevronDown size={20} color="#71717a" style={{ flexShrink: 0 }} />
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
        background: '#14141a',
        borderRadius: 16,
        border: isDragging ? '2px solid rgba(212,175,55,0.5)' : '2px solid rgba(255,255,255,0.06)',
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
        <Paperclip size={14} color="#d4af37" strokeWidth={2} />
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#d4af37',
        }}>
          Файлы
        </span>
        <span style={{
          fontSize: 10,
          color: '#71717a',
          marginLeft: 'auto',
        }}>
          Необязательно
        </span>
      </div>

      {/* Drop Zone */}
      <motion.div
        animate={{
          background: isDragging ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.02)',
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          padding: '20px 16px',
          borderRadius: 12,
          border: '1px dashed rgba(212,175,55,0.25)',
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
            <FileUp size={18} color="#d4af37" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#a1a1aa', margin: 0 }}>
              Прикрепить файлы
            </p>
            <p style={{ fontSize: 11, color: '#52525b', margin: 0 }}>
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
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 10,
              }}
            >
              <Upload size={16} color="#d4af37" />
              <span style={{
                flex: 1,
                fontSize: 13,
                color: '#f2f2f2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {file.name}
              </span>
              <span style={{ fontSize: 11, color: '#52525b' }}>
                {(file.size / 1024).toFixed(0)} KB
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(i) }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: 'rgba(239,68,68,0.1)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={12} color="#ef4444" />
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
          : 'rgba(20,20,23,0.6)',
        backdropFilter: 'blur(12px)',
        border: selected
          ? '2px solid rgba(212,175,55,0.6)'
          : '1px solid rgba(255,255,255,0.06)',
        borderRadius: 20,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: selected
          ? '0 0 30px -5px rgba(212,175,55,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
          : '0 4px 24px -8px rgba(0,0,0,0.5)',
        WebkitTapHighlightColor: 'transparent',
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
          background: 'linear-gradient(90deg, #d4af37, #f5d061)',
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
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${selected ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.06)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        <Icon size={26} color={selected ? '#e6c547' : '#71717a'} strokeWidth={1.5} />
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: selected ? '#f2f2f2' : '#a1a1aa',
          marginBottom: 4,
        }}>
          {config.label}
        </div>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: selected ? '#e6c547' : '#71717a',
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
              background: 'linear-gradient(135deg, #e6c547, #b48e26)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(212,175,55,0.4)',
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

interface FileUploadProps {
  files: File[]
  onAdd: (files: FileList) => void
  onRemove: (index: number) => void
}

function FileUploadZone({ files, onAdd, onRemove }: FileUploadProps) {
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
    <div>
      {/* Drop Zone */}
      <motion.div
        animate={{
          borderColor: isDragging ? 'rgba(212,175,55,0.6)' : 'rgba(212,175,55,0.2)',
          background: isDragging ? 'rgba(212,175,55,0.08)' : 'rgba(20,20,23,0.4)',
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          padding: 40,
          borderRadius: 20,
          border: '2px dashed',
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'all 0.3s ease',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files && onAdd(e.target.files)}
          style={{ display: 'none' }}
        />

        <motion.div
          animate={{ y: isDragging ? -5 : 0 }}
          style={{
            width: 70,
            height: 70,
            margin: '0 auto 20px',
            borderRadius: 20,
            background: 'rgba(212,175,55,0.1)',
            border: '1px solid rgba(212,175,55,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FileUp size={32} color="#d4af37" strokeWidth={1.5} />
        </motion.div>

        <p style={{ fontSize: 15, fontWeight: 600, color: '#f2f2f2', marginBottom: 8 }}>
          Нажмите или перетащите файлы
        </p>
        <p style={{ fontSize: 13, color: '#71717a' }}>
          Методички, примеры, требования
        </p>
      </motion.div>

      {/* File List */}
      {files.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 12, color: '#71717a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Прикреплено ({files.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {files.map((file, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                }}
              >
                <Upload size={18} color="#d4af37" />
                <span style={{ flex: 1, fontSize: 14, color: '#f2f2f2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </span>
                <span style={{ fontSize: 12, color: '#71717a' }}>
                  {(file.size / 1024).toFixed(0)} KB
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(i) }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'rgba(239,68,68,0.1)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={14} color="#ef4444" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  DEADLINE CARD (Urgency Meter)
// ═══════════════════════════════════════════════════════════════════════════

interface DeadlineCardProps {
  config: DeadlineConfig
  selected: boolean
  onSelect: () => void
  index: number
}

function DeadlineCard({ config, selected, onSelect, index }: DeadlineCardProps) {
  const Icon = config.urgency > 70 ? Flame : config.urgency > 30 ? Zap : Calendar

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        width: '100%',
        padding: '18px 20px',
        background: selected
          ? 'linear-gradient(90deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))'
          : 'rgba(20,20,23,0.6)',
        border: selected
          ? '2px solid rgba(212,175,55,0.5)'
          : '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: `${config.color}15`,
        border: `1px solid ${config.color}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={22} color={config.color} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: selected ? '#f2f2f2' : '#a1a1aa' }}>
            {config.label}
          </span>
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            color: config.color,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {config.multiplier}
          </span>
        </div>

        {/* Urgency Bar */}
        <div style={{
          height: 4,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${config.urgency}%` }}
            transition={{ delay: index * 0.08 + 0.2, duration: 0.5 }}
            style={{
              height: '100%',
              background: `linear-gradient(90deg, ${config.color}, ${config.color}80)`,
              borderRadius: 2,
              boxShadow: `0 0 8px ${config.color}60`,
            }}
          />
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
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #e6c547, #b48e26)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
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
  const [result, setResult] = useState<{ ok: boolean; msg: string; id?: number } | null>(null)

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

  // Files
  const addFiles = (fileList: FileList) => {
    haptic('light')
    setFiles((prev) => [...prev, ...Array.from(fileList)])
  }
  const removeFile = (index: number) => {
    haptic('light')
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Submit
  const handleSubmit = async () => {
    if (!workType || !deadline || !subject.trim()) return

    haptic('heavy')
    setSubmitting(true)

    const data: OrderCreateRequest = {
      work_type: workType,
      subject: subject.trim(),
      topic: topic.trim() || undefined,
      deadline,
      description: description.trim() || undefined,
    }

    try {
      const res = await createOrder(data)
      if (res.success) {
        hapticSuccess()
        setResult({ ok: true, msg: res.message, id: res.order_id })
      } else {
        hapticError()
        setResult({ ok: false, msg: res.message })
      }
    } catch {
      hapticError()
      setResult({ ok: false, msg: 'Ошибка соединения' })
    } finally {
      setSubmitting(false)
      setStep(4) // Result screen
    }
  }

  // Get estimated price
  const getEstimate = () => {
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
    return (
      <div style={{ padding: 24, paddingBottom: 160, minHeight: '100vh', background: '#050505' }}>
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
            color: result.ok ? '#f2f2f2' : '#ef4444',
            marginBottom: 16,
          }}>
            {result.ok ? 'Заказ создан!' : 'Ошибка'}
          </h2>

          <p style={{ fontSize: 16, color: '#a1a1aa', marginBottom: 40, maxWidth: 300, lineHeight: 1.6 }}>
            {result.msg}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 320 }}>
            {result.ok && result.id && (
              <motion.button
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
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/')}
              style={{
                padding: '16px 28px',
                fontSize: 16,
                fontWeight: 600,
                color: '#a1a1aa',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
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
      background: '#050505',
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
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={22} color="#a1a1aa" />
        </motion.button>

        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 26,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #f5d061, #d4af37)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 4,
          }}>
            {currentConfig?.title}
          </h1>
          <p style={{ fontSize: 14, color: '#71717a' }}>{currentConfig?.subtitle}</p>
        </div>

        <div style={{
          padding: '10px 16px',
          background: 'rgba(212,175,55,0.1)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 700,
          color: '#d4af37',
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
                  onSelect={() => { haptic('light'); setWorkType(wt.value) }}
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
            />

            <BentoInputCard
              label="Тема работы"
              value={topic}
              onChange={setTopic}
              placeholder="Оставьте пустым, если тема свободная"
              icon={FileText}
            />

            <BentoInputCard
              label="Дополнительные требования"
              value={description}
              onChange={setDescription}
              placeholder="Объём, оформление, особые пожелания..."
              icon={PenTool}
              multiline
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {DEADLINES.map((dl, i) => (
                <DeadlineCard
                  key={dl.value}
                  config={dl}
                  selected={deadline === dl.value}
                  onSelect={() => { haptic('light'); setDeadline(dl.value) }}
                  index={i}
                />
              ))}
            </div>

            {/* Estimate */}
            {estimate && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                style={{
                  marginTop: 24,
                  padding: 20,
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.03))',
                  border: '1px solid rgba(212,175,55,0.2)',
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Thermometer size={22} color="#d4af37" />
                  <span style={{ fontSize: 14, color: '#a1a1aa' }}>Ориентировочно:</span>
                </div>
                <span style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#e6c547',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {estimate.toLocaleString('ru-RU')} ₽
                </span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Button */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          position: 'fixed',
          bottom: 100,
          left: 24,
          right: 24,
          zIndex: 1000,
        }}
      >
        <motion.button
          whileTap={canProceed ? { scale: 0.97 } : undefined}
          onClick={step === 3 ? handleSubmit : goNext}
          disabled={!canProceed || submitting}
          style={{
            width: '100%',
            padding: '20px 28px',
            fontSize: 18,
            fontWeight: 700,
            fontFamily: "'Playfair Display', serif",
            letterSpacing: '0.02em',
            color: canProceed ? '#050505' : '#71717a',
            background: canProceed
              ? 'linear-gradient(180deg, #f5d061 0%, #d4af37 50%, #b48e26 100%)'
              : 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: 18,
            cursor: canProceed && !submitting ? 'pointer' : 'not-allowed',
            boxShadow: canProceed
              ? '0 0 50px -10px rgba(212,175,55,0.7), 0 15px 30px -15px rgba(0,0,0,0.5)'
              : 'none',
            opacity: canProceed ? 1 : 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          {submitting ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <Clock size={22} />
              </motion.div>
              Отправка...
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
        </motion.button>
      </motion.div>
    </div>
  )
}
