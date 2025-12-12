import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, FileText, PenTool, Paperclip, X, ChevronRight, Trash2,
  ClipboardPaste, FileUp, Upload, Sparkles
} from 'lucide-react'
import { SERVICE_TYPES, REQUIREMENTS_TEMPLATES } from './constants'

// ═══════════════════════════════════════════════════════════════════════════
//  REQUIREMENTS STEP — Детали заказа
//  Решает проблемы:
//  - Плохой скролл в WebView → native textarea + отдельный modal
//  - Вставка текста → не блокируем onPaste
//  - Сброс при смене типа → drafts per serviceType в родителе
//  - Удаление текста → явная кнопка очистки
// ═══════════════════════════════════════════════════════════════════════════

interface RequirementsStepProps {
  serviceTypeId: string | null
  subject: string
  onSubjectChange: (val: string) => void
  topic: string
  onTopicChange: (val: string) => void
  requirements: string
  onRequirementsChange: (val: string) => void
  files: File[]
  onFilesAdd: (files: FileList) => void
  onFileRemove: (index: number) => void
  disabled?: boolean
}

export function RequirementsStep({
  serviceTypeId,
  subject,
  onSubjectChange,
  topic,
  onTopicChange,
  requirements,
  onRequirementsChange,
  files,
  onFilesAdd,
  onFileRemove,
  disabled = false,
}: RequirementsStepProps) {
  const [showEditor, setShowEditor] = useState(false)

  // Получаем название услуги для плейсхолдеров
  const service = SERVICE_TYPES.find(s => s.id === serviceTypeId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Предмет / Дисциплина */}
      <InputCard
        label="Предмет / Дисциплина"
        value={subject}
        onChange={onSubjectChange}
        placeholder="Например: Экономика, Программирование..."
        icon={BookOpen}
        required
        disabled={disabled}
      />

      {/* Тема работы */}
      <InputCard
        label="Тема работы"
        value={topic}
        onChange={onTopicChange}
        placeholder="Оставьте пустым, если тема свободная"
        icon={FileText}
        disabled={disabled}
        hint="Необязательно"
      />

      {/* Требования — Preview Card */}
      <RequirementsPreviewCard
        value={requirements}
        onEdit={() => setShowEditor(true)}
        onClear={() => onRequirementsChange('')}
        disabled={disabled}
      />

      {/* Файлы */}
      <FileVaultCard
        files={files}
        onAdd={onFilesAdd}
        onRemove={onFileRemove}
        disabled={disabled}
      />

      {/* Full-screen Requirements Editor Modal */}
      <RequirementsEditorModal
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        value={requirements}
        onChange={onRequirementsChange}
        serviceTypeId={serviceTypeId}
        serviceName={service?.label}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  INPUT CARD — Универсальное поле ввода
// ═══════════════════════════════════════════════════════════════════════════

interface InputCardProps {
  label: string
  value: string
  onChange: (val: string) => void
  placeholder?: string
  icon?: typeof FileText
  required?: boolean
  disabled?: boolean
  hint?: string
}

function InputCard({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  required,
  disabled,
  hint,
}: InputCardProps) {
  const [focused, setFocused] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--bg-card-solid)',
        borderRadius: 16,
        border: focused ? '2px solid var(--border-gold-strong)' : '1px solid var(--border-default)',
        padding: '14px 16px',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        boxShadow: focused ? '0 0 20px -5px rgba(212,175,55,0.3)' : 'none',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {Icon && <Icon size={14} color="var(--gold-400)" strokeWidth={2} />}
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--gold-400)',
          }}
        >
          {label} {required && <span style={{ opacity: 0.7 }}>*</span>}
        </span>
        {hint && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {hint}
          </span>
        )}
      </div>

      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          fontSize: 16,
          fontFamily: "'Inter', 'Manrope', sans-serif",
          color: 'var(--text-main)',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          padding: 0,
        }}
      />
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  REQUIREMENTS PREVIEW CARD — Превью требований с кнопкой редактирования
// ═══════════════════════════════════════════════════════════════════════════

interface RequirementsPreviewCardProps {
  value: string
  onEdit: () => void
  onClear: () => void
  disabled?: boolean
}

function RequirementsPreviewCard({ value, onEdit, onClear, disabled }: RequirementsPreviewCardProps) {
  const hasContent = value.trim().length > 0
  const previewLines = value.split('\n').slice(0, 3).join('\n')
  const isTruncated = value.split('\n').length > 3 || value.length > 150

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--bg-card-solid)',
        borderRadius: 16,
        border: '1px solid var(--border-default)',
        padding: '14px 16px',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <PenTool size={14} color="var(--gold-400)" strokeWidth={2} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--gold-400)',
            flex: 1,
          }}
        >
          Требования
        </span>
        {hasContent && !disabled && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation()
              onClear()
            }}
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Trash2 size={13} color="#ef4444" />
          </motion.button>
        )}
      </div>

      {/* Content / Placeholder */}
      <motion.button
        type="button"
        whileTap={disabled ? undefined : { scale: 0.99 }}
        onClick={disabled ? undefined : onEdit}
        style={{
          width: '100%',
          padding: '14px 16px',
          background: hasContent ? 'var(--bg-glass)' : 'transparent',
          border: hasContent ? 'none' : '1px dashed var(--border-gold)',
          borderRadius: 12,
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {hasContent ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {previewLines}
            </p>
            {isTruncated && (
              <span style={{ fontSize: 12, color: 'var(--gold-400)', marginTop: 6, display: 'block' }}>
                Показать полностью...
              </span>
            )}
          </div>
        ) : (
          <>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(212,175,55,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <PenTool size={18} color="var(--gold-400)" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 2 }}>
                Добавить требования
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Объём, оформление, особые пожелания
              </div>
            </div>
          </>
        )}
        <ChevronRight size={20} color="var(--text-muted)" style={{ flexShrink: 0 }} />
      </motion.button>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  FILE VAULT CARD — Загрузка файлов
// ═══════════════════════════════════════════════════════════════════════════

interface FileVaultCardProps {
  files: File[]
  onAdd: (files: FileList) => void
  onRemove: (index: number) => void
  disabled?: boolean
}

function FileVaultCard({ files, onAdd, onRemove, disabled }: FileVaultCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0 && !disabled) {
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
        border: isDragging ? '2px solid var(--border-gold-strong)' : '1px solid var(--border-default)',
        padding: '14px 16px',
        transition: 'border-color 0.2s ease',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Paperclip size={14} color="var(--gold-400)" strokeWidth={2} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--gold-400)',
          }}
        >
          Файлы
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Необязательно
        </span>
      </div>

      {/* Drop Zone */}
      <motion.div
        animate={{ background: isDragging ? 'rgba(212,175,55,0.08)' : 'var(--bg-glass)' }}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        style={{
          padding: '18px 16px',
          borderRadius: 12,
          border: '1px dashed var(--border-gold)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'center',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files && !disabled && onAdd(e.target.files)}
          style={{ display: 'none' }}
          disabled={disabled}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(212,175,55,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
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
              key={`${file.name}-${i}`}
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
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: 'var(--text-main)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {file.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {(file.size / 1024).toFixed(0)} KB
              </span>
              {!disabled && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(i) }}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={12} color="#ef4444" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  REQUIREMENTS EDITOR MODAL — Полноэкранный редактор
//  Решает проблемы скролла в WebView
// ═══════════════════════════════════════════════════════════════════════════

interface RequirementsEditorModalProps {
  isOpen: boolean
  onClose: () => void
  value: string
  onChange: (val: string) => void
  serviceTypeId: string | null
  serviceName?: string
}

function RequirementsEditorModal({
  isOpen,
  onClose,
  value,
  onChange,
  serviceTypeId,
  serviceName,
}: RequirementsEditorModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [localValue, setLocalValue] = useState(value)
  const [showTemplates, setShowTemplates] = useState(false)

  // Sync local value when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalValue(value)
      // Focus textarea after animation
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen, value])

  // Handle keyboard (visualViewport)
  useEffect(() => {
    if (!isOpen) return

    const handleViewportResize = () => {
      if (textareaRef.current) {
        textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }

    window.visualViewport?.addEventListener('resize', handleViewportResize)
    return () => window.visualViewport?.removeEventListener('resize', handleViewportResize)
  }, [isOpen])

  const handleSave = useCallback(() => {
    onChange(localValue)
    onClose()
  }, [localValue, onChange, onClose])

  const handleClear = useCallback(() => {
    setLocalValue('')
  }, [])

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      setLocalValue(prev => prev + text)
    } catch {
      // Clipboard API not available or permission denied
    }
  }, [])

  const handleTemplateInsert = useCallback((templateKey: string) => {
    const template = REQUIREMENTS_TEMPLATES[templateKey] || REQUIREMENTS_TEMPLATES.default
    setLocalValue(prev => prev ? prev + '\n\n' + template : template)
    setShowTemplates(false)
  }, [])

  // Get placeholder based on service type
  const getPlaceholder = () => {
    if (serviceTypeId && REQUIREMENTS_TEMPLATES[serviceTypeId]) {
      return REQUIREMENTS_TEMPLATES[serviceTypeId]
    }
    return `Опишите ваши требования:

• Объём работы (страниц/слайдов)
• Требования к уникальности
• Оформление (ГОСТ/методичка)
• Особые пожелания`
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg-main)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 20px',
              paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-default)',
            }}
          >
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-default)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} color="var(--text-secondary)" />
            </motion.button>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)' }}>
                Требования
              </div>
              {serviceName && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {serviceName}
                </div>
              )}
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 600,
                color: '#050505',
                background: 'var(--gold-metallic)',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
              }}
            >
              Готово
            </motion.button>
          </motion.div>

          {/* Toolbar */}
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <ToolbarButton icon={ClipboardPaste} label="Вставить" onClick={handlePaste} />
            <ToolbarButton
              icon={Sparkles}
              label="Шаблоны"
              onClick={() => setShowTemplates(!showTemplates)}
              active={showTemplates}
            />
            <div style={{ flex: 1 }} />
            <ToolbarButton
              icon={Trash2}
              label="Очистить"
              onClick={handleClear}
              danger
            />
          </motion.div>

          {/* Templates dropdown */}
          <AnimatePresence>
            {showTemplates && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{
                  overflow: 'hidden',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ padding: '12px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.keys(REQUIREMENTS_TEMPLATES).map(key => (
                    <motion.button
                      key={key}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleTemplateInsert(key)}
                      style={{
                        padding: '8px 14px',
                        fontSize: 12,
                        fontWeight: 500,
                        color: 'var(--text-secondary)',
                        background: 'var(--bg-glass)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {key === 'default' ? 'Общий' : SERVICE_TYPES.find(s => s.id === key)?.label || key}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Textarea Container */}
          <div
            style={{
              flex: 1,
              padding: 20,
              paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
              overflow: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <textarea
              ref={textareaRef}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              placeholder={getPlaceholder()}
              style={{
                width: '100%',
                minHeight: 300,
                height: '100%',
                fontSize: 16,
                fontFamily: "'Inter', 'Manrope', sans-serif",
                color: 'var(--text-main)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                lineHeight: 1.6,
                padding: 0,
              }}
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  TOOLBAR BUTTON
// ═══════════════════════════════════════════════════════════════════════════

interface ToolbarButtonProps {
  icon: typeof FileText
  label: string
  onClick: () => void
  active?: boolean
  danger?: boolean
}

function ToolbarButton({ icon: Icon, label, onClick, active, danger }: ToolbarButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px',
        fontSize: 12,
        fontWeight: 500,
        color: danger ? '#ef4444' : active ? 'var(--gold-400)' : 'var(--text-secondary)',
        background: active ? 'rgba(212,175,55,0.1)' : 'var(--bg-glass)',
        border: `1px solid ${active ? 'var(--border-gold)' : 'var(--border-default)'}`,
        borderRadius: 8,
        cursor: 'pointer',
      }}
    >
      <Icon size={14} />
      {label}
    </motion.button>
  )
}
