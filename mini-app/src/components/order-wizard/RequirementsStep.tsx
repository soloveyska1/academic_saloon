import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
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
import { PremiumInput, PremiumInputGroup, PremiumInputDivider } from '../ui/PremiumInput'

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

/* ── Popular subjects for quick tap suggestions ──────────────────────── */
const POPULAR_SUBJECTS = [
  'Экономика', 'Менеджмент', 'Маркетинг', 'Юриспруденция',
  'Психология', 'Информатика', 'Финансы', 'Педагогика',
  'История', 'Математика', 'Социология', 'Бухучёт',
]

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
  const isExpress = service?.category === 'express'

  // Filter suggestions: hide already-typed subject, show max 6
  const suggestions = useMemo(() => {
    if (subject.trim().length > 0) return []
    return POPULAR_SUBJECTS.slice(0, 8)
  }, [subject])

  const reqPreview = requirements.trim()
    ? `${requirements.trim().split('\n').filter(Boolean).length} пунктов`
    : undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ─── Subject + Topic — Premium grouped inputs ─────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <PremiumInputGroup>
          <PremiumInput
            label={isExpress ? 'Предмет' : 'Предмет *'}
            value={subject}
            onChange={onSubjectChange}
            placeholder="Микроэкономика, Python, маркетинг..."
            disabled={disabled}
            icon={<BookOpen size={16} />}
          />
          <PremiumInputDivider />
          <PremiumInput
            label="Тема работы"
            value={topic}
            onChange={onTopicChange}
            placeholder="Анализ рентабельности предприятия"
            disabled={disabled}
            icon={<FileText size={16} />}
          />
        </PremiumInputGroup>
      </motion.div>

      {/* Quick subject suggestions */}
      {suggestions.length > 0 && !disabled && !subject.trim() && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          {suggestions.map((s) => (
            <motion.button
              key={s}
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={() => onSubjectChange(s)}
              style={{
                padding: '6px 12px',
                borderRadius: 10,
                background: 'rgba(212, 175, 55, 0.04)',
                border: '1px solid rgba(212, 175, 55, 0.08)',
                color: 'rgba(212, 175, 55, 0.6)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                letterSpacing: '0.01em',
              }}
            >
              {s}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* ─── Requirements + Files — Premium grouped ───────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <PremiumInputGroup groupLabel="Дополнительно">
          <PremiumInput
            label="Требования"
            value=""
            onChange={() => {}}
            asTrigger
            onClick={() => setShowEditor(true)}
            displayValue={reqPreview}
            placeholder="Объём, оформление, пожелания"
            icon={<PenTool size={16} />}
          />
          <PremiumInputDivider />
          <AttachmentsCard
            files={files}
            onAdd={onFilesAdd}
            onRemove={onFileRemove}
            disabled={disabled}
          />
        </PremiumInputGroup>
      </motion.div>

      {/* ─── Reassurance ──────────────────────────────────────── */}
      <div style={{
        fontSize: 11,
        color: 'var(--text-muted)',
        opacity: 0.4,
        textAlign: 'center',
        padding: '4px 0',
        letterSpacing: '0.01em',
      }}>
        Всё можно уточнить в чате после оформления
      </div>

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

const goldBorder = 'rgba(212, 175, 55, 0.22)'
const goldSoft = 'rgba(212, 175, 55, 0.06)'
const cardBorder = 'rgba(255, 255, 255, 0.06)'

/* RequirementsButton removed — replaced by PremiumInput asTrigger */

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

  const hasFiles = files.length > 0

  return (
    <div>
      {/* Upload zone — matches PremiumInput visual style */}
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        style={{
          position: 'relative',
          minHeight: 56,
          borderRadius: 12,
          background: isDragging
            ? 'rgba(212, 175, 55, 0.04)'
            : hasFiles
              ? 'rgba(212, 175, 55, 0.03)'
              : 'rgba(0, 0, 0, 0.15)',
          border: hasFiles || isDragging
            ? '1px solid rgba(212, 175, 55, 0.12)'
            : '1px solid rgba(255, 255, 255, 0.03)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'background 0.3s',
          overflow: 'hidden',
        }}
      >
        {/* Bottom accent line when has files */}
        {hasFiles && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            background: 'linear-gradient(90deg, transparent 0%, var(--gold-400) 20%, rgba(255,248,214,0.6) 50%, var(--gold-400) 80%, transparent 100%)',
            borderRadius: '0 0 12px 12px',
          }} />
        )}

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={disabled}
        />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 16px',
          minHeight: 56,
        }}>
          <motion.div
            animate={{
              color: hasFiles ? 'var(--gold-400)' : 'var(--text-muted)',
            }}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              width: 20,
              height: 20,
              opacity: hasFiles ? 1 : 0.5,
            }}
          >
            {hasFiles ? <Paperclip size={16} /> : <FileUp size={16} />}
          </motion.div>

          <div style={{ flex: 1, padding: '8px 0' }}>
            <div style={{
              fontSize: hasFiles ? 14 : 14,
              fontWeight: hasFiles ? 600 : 500,
              color: hasFiles ? 'var(--text-primary)' : 'rgba(255, 255, 255, 0.4)',
              fontFamily: "'Manrope', sans-serif",
            }}>
              {hasFiles
                ? `${files.length} ${pluralizeFiles(files.length)} · ${formatFileSize(totalSize)}`
                : 'Файлы'}
            </div>
            {!hasFiles && (
              <div style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                opacity: 0.5,
                marginTop: 1,
              }}>
                PDF, DOCX, JPG, ZIP — до 50 МБ
              </div>
            )}
          </div>

          {hasFiles && (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(212, 175, 55, 0.6)',
              letterSpacing: '0.02em',
            }}>
              + ещё
            </span>
          )}
        </div>
      </div>

      {/* Notice */}
      {notice && (
        <div style={{
          margin: '8px 16px 0',
          padding: '8px 10px',
          borderRadius: 8,
          background: 'rgba(212, 175, 55, 0.04)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 6,
        }}>
          <AlertTriangle size={12} color="rgba(212, 175, 55, 0.6)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11, lineHeight: 1.5, color: 'rgba(212, 175, 55, 0.55)' }}>{notice}</span>
        </div>
      )}

      {/* File list */}
      {hasFiles && (
        <div style={{
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
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
    </div>
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
      gap: 8,
      padding: '6px 4px',
    }}>
      <span style={{
        padding: '3px 6px',
        borderRadius: 4,
        background: 'rgba(212, 175, 55, 0.06)',
        color: 'rgba(212, 175, 55, 0.7)',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        flexShrink: 0,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {ext || '?'}
      </span>

      <div style={{
        flex: 1,
        minWidth: 0,
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--text-secondary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {file.name}
      </div>

      <span style={{
        fontSize: 11,
        color: 'var(--text-muted)',
        opacity: 0.5,
        flexShrink: 0,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {formatFileSize(file.size)}
      </span>

      {!disabled && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onRemove}
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: 'none',
            background: 'rgba(255, 255, 255, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X size={10} color="var(--text-muted)" />
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
    : `Объём, уникальность, оформление, пожелания...`

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
            borderBottom: '1px solid rgba(212, 175, 55, 0.06)',
            background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.03), transparent)',
          }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={handleSave}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeft size={18} color="var(--text-secondary)" />
            </motion.button>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Требования
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', opacity: 0.7 }}>
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
            borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
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
                        color: key === primaryKey ? 'var(--gold-400)' : 'var(--text-secondary)',
                        background: key === primaryKey ? goldSoft : 'var(--bg-glass)',
                        border: `1px solid ${key === primaryKey ? goldBorder : cardBorder}`,
                        borderRadius: 8,
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
                fontSize: 16,
                fontFamily: "'Manrope', sans-serif",
                color: 'var(--text-primary)',
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
            borderTop: '1px solid rgba(212, 175, 55, 0.06)',
            background: 'linear-gradient(180deg, transparent, rgba(212, 175, 55, 0.02))',
          }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 14,
                border: 'none',
                background: 'var(--gold-metallic)',
                color: 'var(--text-on-gold)',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px -4px rgba(212, 175, 55, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
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
        padding: '7px 12px',
        fontSize: 12,
        fontWeight: 600,
        color: danger ? 'var(--error-text)' : active ? 'var(--gold-400)' : 'var(--text-muted)',
        background: active ? 'rgba(212, 175, 55, 0.06)' : 'rgba(255, 255, 255, 0.03)',
        border: `1px solid ${active ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.06)'}`,
        borderRadius: 10,
        cursor: 'pointer',
        boxShadow: active ? '0 0 8px -3px rgba(212, 175, 55, 0.15)' : 'none',
      }}
    >
      <Icon size={13} />
      {label}
    </motion.button>
  )
}

function Pill({ label, tone }: { label: string; tone: 'good' | 'muted' | 'accent' }) {
  const colors = tone === 'good'
    ? { bg: 'rgba(212, 175, 55, 0.08)', border: 'rgba(212, 175, 55, 0.15)', text: 'rgba(212, 175, 55, 0.8)' }
    : tone === 'accent'
      ? { bg: goldSoft, border: goldBorder, text: 'var(--gold-400)' }
      : { bg: 'rgba(255, 255, 255, 0.03)', border: 'rgba(255, 255, 255, 0.06)', text: 'var(--text-muted)' }

  return (
    <span style={{
      display: 'inline-flex',
      padding: '4px 8px',
      borderRadius: 8,
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      color: colors.text,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.04em',
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
  if (v.accepted.length > 0) p.push(`Добавили ${v.accepted.length} ${pluralizeFiles(v.accepted.length)}.`)
  if (v.duplicates.length > 0) p.push(`Повторы пропустили: ${v.duplicates.join(', ')}.`)
  if (v.blocked.length > 0) p.push(`Неподдерживаемый тип: ${v.blocked.join(', ')}.`)
  if (v.oversized.length > 0) p.push(`Слишком большие (лимит 50 МБ): ${v.oversized.join(', ')}.`)
  return p.length > 0 ? p.join(' ') : null
}

function pluralizeFiles(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod100 >= 11 && mod100 <= 19) return 'файлов'
  if (mod10 === 1) return 'файл'
  if (mod10 >= 2 && mod10 <= 4) return 'файла'
  return 'файлов'
}

function getTemplateLabel(key: string) {
  if (key === 'default') return 'Общий'
  return SERVICE_TYPES.find(s => s.id === key)?.label || key
}
