import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  ChevronRight,
  ClipboardPaste,
  FileText,
  FileUp,
  Paperclip,
  PenTool,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useModalRegistration } from '../../contexts/NavigationContext'
import { SERVICE_TYPES, REQUIREMENTS_TEMPLATES } from './constants'

/* ═══════════════════════════════════════════════════════════════════════════
   REQUIREMENTS STEP — v3 «Чистая форма»

   Принципы:
   - Каждая секция — отдельная карточка с чётким лейблом
   - Без вложенных "inner surface" — один уровень глубины
   - Инпуты читабельные, крупные, с фокусным accent-бордером
   - Файлы и требования — кнопки-действия, не сложные карточки
   ═══════════════════════════════════════════════════════════════════════════ */

const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024
const ACCEPTED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.odt', '.ods', '.odp', '.rtf', '.txt', '.csv',
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
  '.zip', '.rar', '.7z', '.tar', '.gz',
  '.py', '.ts', '.html', '.css', '.json', '.xml', '.sql',
  '.mp3', '.mp4', '.avi', '.mov', '.wav',
]

interface RequirementsStepProps {
  serviceTypeId: string | null
  subject: string
  onSubjectChange: (val: string) => void
  topic: string
  onTopicChange: (val: string) => void
  requirements: string
  onRequirementsChange: (val: string) => void
  files: File[]
  onFilesAdd: (files: File[]) => void
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
  const service = SERVICE_TYPES.find(item => item.id === serviceTypeId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Подсказка */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '12px 14px',
          borderRadius: 12,
          background: 'rgba(212, 175, 55, 0.06)',
          border: '1px solid rgba(212, 175, 55, 0.12)',
          fontSize: 13,
          lineHeight: 1.5,
          color: 'var(--text-secondary)',
        }}
      >
        {service
          ? <>Для <span style={{ color: 'var(--gold-400)', fontWeight: 600 }}>«{service.label}»</span> укажите предмет и тему — это ускорит оценку.</>
          : 'Укажите предмет и тему — это ускорит оценку и поможет подобрать автора.'}
      </motion.div>

      {/* Предмет */}
      <FieldCard
        label="Предмет / дисциплина"
        required
        icon={BookOpen}
        disabled={disabled}
        delay={0.05}
      >
        <input
          type="text"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder="Экономика, маркетинг, Python..."
          disabled={disabled}
          style={inputStyle}
        />
      </FieldCard>

      {/* Тема */}
      <FieldCard
        label="Тема работы"
        hint="по желанию"
        icon={FileText}
        disabled={disabled}
        delay={0.1}
      >
        <input
          type="text"
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          placeholder="Если тема уже есть, напишите"
          disabled={disabled}
          style={inputStyle}
        />
      </FieldCard>

      {/* Требования */}
      <RequirementsButton
        value={requirements}
        onEdit={() => setShowEditor(true)}
        onClear={() => onRequirementsChange('')}
        disabled={disabled}
      />

      {/* Файлы */}
      <AttachmentsCard
        files={files}
        onAdd={onFilesAdd}
        onRemove={onFileRemove}
        disabled={disabled}
      />

      {/* Модальный редактор требований */}
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

/* ─────────────────────────────────────────────────────────────────────────
   SHARED STYLES
   ───────────────────────────────────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontSize: 15,
  lineHeight: 1.4,
  fontWeight: 500,
  fontFamily: "'Manrope', sans-serif",
  color: 'var(--text-main)',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  padding: 0,
}

const cardBorder = 'rgba(255, 255, 255, 0.08)'
const cardBg = 'rgba(255, 255, 255, 0.025)'
const goldSoft = 'rgba(212, 175, 55, 0.10)'
const goldBorder = 'rgba(212, 175, 55, 0.25)'

/* ─────────────────────────────────────────────────────────────────────────
   FIELD CARD — Simple labeled input wrapper
   ───────────────────────────────────────────────────────────────────────── */

function FieldCard({
  label,
  hint,
  icon: Icon,
  required,
  disabled,
  delay = 0,
  children,
}: {
  label: string
  hint?: string
  icon: typeof BookOpen
  required?: boolean
  disabled?: boolean
  delay?: number
  children: React.ReactNode
}) {
  const [focused, setFocused] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
      style={{
        borderRadius: 14,
        border: `1px solid ${focused ? goldBorder : cardBorder}`,
        background: cardBg,
        padding: '14px',
        opacity: disabled ? 0.6 : 1,
        transition: 'border-color 0.2s ease',
      }}
    >
      {/* Label row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
      }}>
        <Icon
          size={15}
          color={focused ? '#d4af37' : 'var(--text-muted)'}
          strokeWidth={2}
          style={{ flexShrink: 0, transition: 'color 0.2s' }}
        />
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          color: focused ? '#d4af37' : 'var(--text-muted)',
          letterSpacing: '0.04em',
          transition: 'color 0.2s',
        }}>
          {label}{required && ' *'}
        </span>
        {hint && (
          <span style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            opacity: 0.6,
            marginLeft: 'auto',
          }}>
            {hint}
          </span>
        )}
      </div>

      {/* Input */}
      {children}
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   REQUIREMENTS BUTTON — Tap to open editor
   ───────────────────────────────────────────────────────────────────────── */

function RequirementsButton({
  value,
  onEdit,
  onClear,
  disabled,
}: {
  value: string
  onEdit: () => void
  onClear: () => void
  disabled?: boolean
}) {
  const hasContent = value.trim().length > 0
  const preview = value.trim().split('\n').slice(0, 2).join(' · ')
  const lineCount = value.trim() ? value.trim().split('\n').filter(Boolean).length : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      style={{
        borderRadius: 14,
        border: `1px solid ${hasContent ? goldBorder : cardBorder}`,
        background: hasContent ? goldSoft : cardBg,
        opacity: disabled ? 0.6 : 1,
        overflow: 'hidden',
      }}
    >
      <motion.button
        type="button"
        whileTap={disabled ? undefined : { scale: 0.99 }}
        onClick={disabled ? undefined : onEdit}
        style={{
          width: '100%',
          padding: '14px',
          border: 'none',
          background: 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: hasContent ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <PenTool size={16} color={hasContent ? '#d4af37' : 'var(--text-muted)'} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-main)',
            marginBottom: hasContent ? 3 : 0,
          }}>
            {hasContent ? 'Требования добавлены' : 'Добавить требования'}
          </div>
          {hasContent ? (
            <div style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {lineCount} пункт. · {preview}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Объём, оформление, пожелания
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {hasContent && !disabled && (
            <motion.div
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onClear() }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={12} color="#ef4444" />
            </motion.div>
          )}
          <ChevronRight size={16} color="var(--text-muted)" style={{ opacity: 0.5 }} />
        </div>
      </motion.button>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   ATTACHMENTS CARD
   ───────────────────────────────────────────────────────────────────────── */

function AttachmentsCard({
  files,
  onAdd,
  onRemove,
  disabled,
}: {
  files: File[]
  onAdd: (files: File[]) => void
  onRemove: (index: number) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const totalSize = useMemo(
    () => files.reduce((sum, f) => sum + f.size, 0),
    [files]
  )

  const handleIncomingFiles = useCallback((incoming: File[]) => {
    const validation = validateIncomingFiles(incoming, files)
    if (validation.accepted.length > 0) onAdd(validation.accepted)
    setNotice(buildFileNotice(validation))
  }, [files, onAdd])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!disabled) handleIncomingFiles(Array.from(e.dataTransfer.files))
  }, [disabled, handleIncomingFiles])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    handleIncomingFiles(e.target.files ? Array.from(e.target.files) : [])
    e.target.value = ''
  }, [disabled, handleIncomingFiles])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      style={{
        borderRadius: 14,
        border: `1px ${isDragging ? 'solid' : 'dashed'} ${isDragging ? goldBorder : cardBorder}`,
        background: isDragging ? goldSoft : cardBg,
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.2s ease',
      }}
    >
      {/* Drop zone / Upload button */}
      <motion.div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        style={{
          padding: '14px',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={disabled}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: files.length > 0 ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {files.length > 0
              ? <Paperclip size={16} color="#d4af37" />
              : <FileUp size={16} color="var(--text-muted)" />}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', marginBottom: 2 }}>
              {files.length > 0 ? `${files.length} файл(ов)` : 'Прикрепить файлы'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {files.length > 0
                ? `${formatFileSize(totalSize)} · Нажмите чтобы добавить ещё`
                : 'Методичка, задание, пример — до 50 МБ'}
            </div>
          </div>

          {files.length > 0 && (
            <Pill tone="accent" label={`${files.length}`} />
          )}
        </div>

        {/* File type chips */}
        {files.length === 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            <Pill tone="muted" label="PDF" />
            <Pill tone="muted" label="DOCX" />
            <Pill tone="muted" label="JPG" />
            <Pill tone="muted" label="ZIP" />
          </div>
        )}
      </motion.div>

      {/* Notice */}
      {notice && (
        <div style={{
          margin: '0 14px 12px',
          padding: '10px 12px',
          borderRadius: 10,
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.18)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}>
          <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, lineHeight: 1.5, color: '#f8c26a' }}>{notice}</span>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {files.map((file, i) => (
            <FileRow
              key={`${file.name}:${file.size}:${file.lastModified}`}
              file={file}
              onRemove={() => onRemove(i)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   FILE ROW
   ───────────────────────────────────────────────────────────────────────── */

function FileRow({
  file,
  onRemove,
  disabled,
}: {
  file: File
  onRemove: () => void
  disabled?: boolean
}) {
  const ext = getFileExtension(file.name)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 10px',
      borderRadius: 10,
      background: 'rgba(255, 255, 255, 0.03)',
    }}>
      <span style={{
        padding: '4px 8px',
        borderRadius: 6,
        background: goldSoft,
        color: '#d4af37',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        flexShrink: 0,
      }}>
        {ext || '?'}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-main)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {file.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {formatFileSize(file.size)}
        </div>
      </div>

      {!disabled && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onRemove}
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            border: '1px solid rgba(239, 68, 68, 0.15)',
            background: 'rgba(239, 68, 68, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X size={12} color="#ef4444" />
        </motion.button>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   REQUIREMENTS EDITOR MODAL — Full-screen editor
   ───────────────────────────────────────────────────────────────────────── */

function RequirementsEditorModal({
  isOpen,
  onClose,
  value,
  onChange,
  serviceTypeId,
  serviceName,
}: {
  isOpen: boolean
  onClose: () => void
  value: string
  onChange: (val: string) => void
  serviceTypeId: string | null
  serviceName?: string
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [localValue, setLocalValue] = useState(value)
  const [showTemplates, setShowTemplates] = useState(false)
  useModalRegistration(isOpen, 'requirements-editor-modal')

  useEffect(() => {
    if (isOpen) {
      setLocalValue(value)
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen, value])

  useEffect(() => {
    if (!isOpen) return
    const handleResize = () => {
      textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    window.visualViewport?.addEventListener('resize', handleResize)
    return () => window.visualViewport?.removeEventListener('resize', handleResize)
  }, [isOpen])

  const handleSave = useCallback(() => {
    onChange(localValue)
    onClose()
  }, [localValue, onChange, onClose])

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      setLocalValue(prev => prev ? `${prev}\n${text}` : text)
    } catch { /* Clipboard unavailable in Telegram */ }
  }, [])

  const handleTemplateInsert = useCallback((key: string) => {
    const template = REQUIREMENTS_TEMPLATES[key] || REQUIREMENTS_TEMPLATES.default
    setLocalValue(prev => prev ? `${prev}\n\n${template}` : template)
    setShowTemplates(false)
  }, [])

  const primaryKey = serviceTypeId && REQUIREMENTS_TEMPLATES[serviceTypeId] ? serviceTypeId : 'default'
  const placeholder = serviceTypeId && REQUIREMENTS_TEMPLATES[serviceTypeId]
    ? REQUIREMENTS_TEMPLATES[serviceTypeId]
    : `Опишите ожидания:\n\n• объём или количество слайдов\n• требования к уникальности\n• оформление по ГОСТ или методичке\n• особые пожелания`

  const charCount = localValue.trim().length

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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={handleSave}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeft size={18} color="var(--text-secondary)" />
            </motion.button>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
                Требования
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {serviceName || 'Опишите детали'}
              </div>
            </div>

            <Pill
              tone={charCount > 40 ? 'good' : charCount > 0 ? 'accent' : 'muted'}
              label={`${charCount} симв.`}
            />
          </div>

          {/* Toolbar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          }}>
            <ToolbarBtn icon={ClipboardPaste} label="Вставить" onClick={handlePaste} />
            <ToolbarBtn
              icon={Sparkles}
              label="Шаблон"
              onClick={() => setShowTemplates(p => !p)}
              active={showTemplates}
            />
            <div style={{ flex: 1 }} />
            <ToolbarBtn icon={Trash2} label="Очистить" onClick={() => setLocalValue('')} danger />
          </div>

          {/* Templates dropdown */}
          <AnimatePresence>
            {showTemplates && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
              >
                <div style={{ padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.keys(REQUIREMENTS_TEMPLATES).map((key) => (
                    <motion.button
                      key={key}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleTemplateInsert(key)}
                      style={{
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: key === primaryKey ? '#d4af37' : 'var(--text-secondary)',
                        background: key === primaryKey ? goldSoft : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${key === primaryKey ? goldBorder : cardBorder}`,
                        borderRadius: 10,
                        cursor: 'pointer',
                      }}
                    >
                      {getTemplateLabel(key)}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Textarea */}
          <div style={{
            flex: 1,
            padding: 16,
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}>
            <textarea
              ref={textareaRef}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              placeholder={placeholder}
              style={{
                width: '100%',
                minHeight: '60vh',
                fontSize: 15,
                fontFamily: "'Manrope', sans-serif",
                color: 'var(--text-main)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                lineHeight: 1.7,
                padding: 0,
              }}
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck
            />
          </div>

          {/* Save button */}
          <div style={{
            padding: '12px 16px calc(14px + env(safe-area-inset-bottom, 0px))',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 14,
                border: 'none',
                background: 'var(--gold-metallic)',
                color: '#050505',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Сохранить
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   SMALL COMPONENTS
   ───────────────────────────────────────────────────────────────────────── */

function ToolbarBtn({
  icon: Icon,
  label,
  onClick,
  active,
  danger,
}: {
  icon: typeof FileText
  label: string
  onClick: () => void
  active?: boolean
  danger?: boolean
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '7px 11px',
        fontSize: 12,
        fontWeight: 600,
        color: danger ? '#ef4444' : active ? '#d4af37' : 'var(--text-secondary)',
        background: active ? goldSoft : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? goldBorder : cardBorder}`,
        borderRadius: 10,
        cursor: 'pointer',
      }}
    >
      <Icon size={13} />
      {label}
    </motion.button>
  )
}

function Pill({ label, tone }: { label: string; tone: 'good' | 'muted' | 'accent' }) {
  const colors = tone === 'good'
    ? { bg: 'rgba(34, 197, 94, 0.10)', border: 'rgba(34, 197, 94, 0.18)', text: '#7dd3a6' }
    : tone === 'accent'
      ? { bg: goldSoft, border: goldBorder, text: '#d4af37' }
      : { bg: 'rgba(255,255,255,0.04)', border: cardBorder, text: 'var(--text-muted)' }

  return (
    <span style={{
      display: 'inline-flex',
      padding: '5px 8px',
      borderRadius: 999,
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      color: colors.text,
      fontSize: 11,
      fontWeight: 700,
      lineHeight: 1,
    }}>
      {label}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   UTILITY FUNCTIONS
   ───────────────────────────────────────────────────────────────────────── */

function getFileExtension(filename: string) {
  const dot = filename.lastIndexOf('.')
  return dot === -1 ? '' : filename.slice(dot + 1).toUpperCase()
}

function getFileExtensionWithDot(filename: string) {
  const dot = filename.lastIndexOf('.')
  return dot === -1 ? '' : filename.slice(dot).toLowerCase()
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} МБ`
  return `${Math.max(1, Math.round(size / 1024))} КБ`
}

function validateIncomingFiles(incoming: File[], existing: File[]) {
  const known = new Set(existing.map(f => `${f.name}:${f.size}:${f.lastModified}`))
  const accepted: File[] = []
  const blocked: string[] = []
  const oversized: string[] = []
  const duplicates: string[] = []

  incoming.forEach(file => {
    const sig = `${file.name}:${file.size}:${file.lastModified}`
    const ext = getFileExtensionWithDot(file.name)

    if (known.has(sig) || accepted.some(a => `${a.name}:${a.size}:${a.lastModified}` === sig)) {
      duplicates.push(file.name); return
    }
    if (ext && !ACCEPTED_EXTENSIONS.includes(ext)) {
      blocked.push(file.name); return
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      oversized.push(file.name); return
    }
    accepted.push(file)
  })

  return { accepted, blocked, oversized, duplicates }
}

function buildFileNotice(v: ReturnType<typeof validateIncomingFiles>) {
  const p: string[] = []
  if (v.accepted.length > 0) p.push(`Добавили ${v.accepted.length} файл(ов).`)
  if (v.duplicates.length > 0) p.push(`Повторы пропустили: ${v.duplicates.join(', ')}.`)
  if (v.blocked.length > 0) p.push(`Неподдерживаемый тип: ${v.blocked.join(', ')}.`)
  if (v.oversized.length > 0) p.push(`Слишком большие (лимит 50 МБ): ${v.oversized.join(', ')}.`)
  return p.length > 0 ? p.join(' ') : null
}

function getTemplateLabel(key: string) {
  if (key === 'default') return 'Общий'
  return SERVICE_TYPES.find(s => s.id === key)?.label || key
}
