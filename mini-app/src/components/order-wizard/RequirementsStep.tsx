import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardPaste,
  FileText,
  FileUp,
  Paperclip,
  PenTool,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useModalRegistration } from '../../contexts/NavigationContext'
import { SERVICE_TYPES, REQUIREMENTS_TEMPLATES } from './constants'

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <DetailsPrelude serviceName={service?.label} />

      <InputCard
        label="Предмет / дисциплина"
        value={subject}
        onChange={onSubjectChange}
        placeholder="Экономика, маркетинг, Python"
        icon={BookOpen}
        required
        disabled={disabled}
      />

      <InputCard
        label="Тема работы"
        value={topic}
        onChange={onTopicChange}
        placeholder="Если тема уже есть, напишите её"
        icon={FileText}
        disabled={disabled}
        hint="По желанию"
      />

      <RequirementsSummaryCard
        value={requirements}
        onEdit={() => setShowEditor(true)}
        onClear={() => onRequirementsChange('')}
        disabled={disabled}
      />

      <AttachmentsCard
        files={files}
        onAdd={onFilesAdd}
        onRemove={onFileRemove}
        disabled={disabled}
      />

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

function DetailsPrelude({ serviceName }: { serviceName?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      style={{
        padding: '16px 16px 14px',
        borderRadius: 20,
        background: `
          radial-gradient(circle at top right, rgba(212, 175, 55, 0.10), transparent 32%),
          linear-gradient(180deg, rgba(20, 18, 12, 0.92), rgba(11, 11, 16, 0.94))
        `,
        border: '1px solid rgba(212, 175, 55, 0.14)',
        boxShadow: '0 16px 36px -34px rgba(0, 0, 0, 0.88)',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: 'rgba(212, 175, 55, 0.10)',
          border: '1px solid rgba(212, 175, 55, 0.14)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Sparkles size={18} color="var(--gold-300)" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: 5,
            lineHeight: 1.35,
          }}>
            Контекст для точной оценки
          </div>
          <div style={{
            fontSize: 12.5,
            lineHeight: 1.55,
            color: 'var(--text-secondary)',
          }}>
            {serviceName
              ? `Для «${serviceName}» достаточно указать предмет, тему и приложить материалы, если они уже есть.`
              : 'Предмет, тема и материалы помогают быстрее собрать сценарий, цену и сроки без лишних уточнений.'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <PreludeFact icon={CheckCircle2} label="точная оценка" />
        <PreludeFact icon={PenTool} label="ясные требования" />
        <PreludeFact icon={ShieldCheck} label="материалы под рукой" />
      </div>
    </motion.section>
  )
}

function PreludeFact({
  icon: Icon,
  label,
}: {
  icon: typeof Sparkles
  label: string
}) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      padding: '8px 10px',
      borderRadius: 999,
      background: 'rgba(255, 255, 255, 0.04)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      color: 'var(--text-secondary)',
    }}>
      <Icon size={13} color="var(--gold-300)" />
      <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
    </div>
  )
}

function getSectionShellStyle(active = false, subtle = false) {
  return {
    position: 'relative' as const,
    overflow: 'hidden' as const,
    background: subtle
      ? 'linear-gradient(180deg, rgba(16, 15, 18, 0.92), rgba(11, 11, 16, 0.94))'
      : `
          radial-gradient(circle at top right, rgba(212, 175, 55, 0.07), transparent 34%),
          linear-gradient(180deg, rgba(18, 17, 22, 0.96), rgba(10, 10, 16, 0.94))
        `,
    borderRadius: 22,
    border: active ? '1px solid rgba(212, 175, 55, 0.28)' : '1px solid rgba(255, 255, 255, 0.06)',
    boxShadow: active ? '0 0 22px -10px rgba(212, 175, 55, 0.26)' : '0 18px 34px -34px rgba(0, 0, 0, 0.85)',
  }
}

function getInnerSurfaceStyle(active = false, dashed = false) {
  return {
    background: active
      ? 'linear-gradient(180deg, rgba(212, 175, 55, 0.10), rgba(255, 255, 255, 0.03))'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.02))',
    border: dashed
      ? '1px dashed rgba(212, 175, 55, 0.32)'
      : `1px solid ${active ? 'rgba(212, 175, 55, 0.18)' : 'rgba(255, 255, 255, 0.05)'}`,
    borderRadius: 18,
  }
}

interface InputCardProps {
  label: string
  value: string
  onChange: (val: string) => void
  placeholder?: string
  icon?: typeof FileText
  required?: boolean
  disabled?: boolean
  hint?: string
  helper?: string
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
  helper,
}: InputCardProps) {
  const [focused, setFocused] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        ...getSectionShellStyle(focused),
        padding: '14px',
        opacity: disabled ? 0.65 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: focused ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.08)',
          border: `1px solid ${focused ? 'rgba(212, 175, 55, 0.20)' : 'rgba(212, 175, 55, 0.12)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {Icon && <Icon size={16} color="var(--gold-400)" strokeWidth={2} />}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 2,
          }}>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--gold-400)',
            }}>
              {label} {required && <span style={{ opacity: 0.75 }}>*</span>}
            </span>

            {hint && <StatusPill tone="muted" label={hint} />}
          </div>

          {helper && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>
              {helper}
            </div>
          )}
        </div>
      </div>

      <div style={{
        ...getInnerSurfaceStyle(focused),
        marginTop: 12,
        padding: '13px 14px',
      }}>
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            fontSize: value ? 16 : 15,
            lineHeight: 1.35,
            fontWeight: value ? 600 : 500,
            fontFamily: "'Manrope', sans-serif",
            color: value ? 'var(--text-main)' : 'var(--text-secondary)',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: 0,
            minWidth: 0,
          }}
        />
      </div>
    </motion.div>
  )
}

interface RequirementsSummaryCardProps {
  value: string
  onEdit: () => void
  onClear: () => void
  disabled?: boolean
}

function RequirementsSummaryCard({
  value,
  onEdit,
  onClear,
  disabled,
}: RequirementsSummaryCardProps) {
  const trimmedValue = value.trim()
  const hasContent = trimmedValue.length > 0
  const lineCount = trimmedValue ? trimmedValue.split('\n').filter(Boolean).length : 0
  const preview = trimmedValue.split('\n').slice(0, 3).join('\n')
  const previewTag = hasContent ? `${Math.max(lineCount, 1)} пункт.` : 'По желанию'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        ...getSectionShellStyle(false),
        padding: '14px',
        opacity: disabled ? 0.65 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: 'rgba(212, 175, 55, 0.08)',
          border: '1px solid rgba(212, 175, 55, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <PenTool size={16} color="var(--gold-400)" strokeWidth={2} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--gold-400)',
            marginBottom: 2,
          }}>
            Требования
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>
            Объём, оформление, особые пожелания
          </div>
        </div>

        <StatusPill tone={hasContent ? 'accent' : 'muted'} label={previewTag} />
        {hasContent && !disabled && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={onClear}
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={14} color="#ef4444" />
          </motion.button>
        )}
      </div>

      <motion.button
        type="button"
        whileTap={disabled ? undefined : { scale: 0.99 }}
        onClick={disabled ? undefined : onEdit}
        style={{
          width: '100%',
          ...getInnerSurfaceStyle(hasContent, !hasContent),
          padding: hasContent ? '16px' : '16px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: hasContent ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <PenTool size={18} color="var(--gold-400)" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginBottom: 5 }}>
            {hasContent ? 'Требования добавлены' : 'Добавить требования'}
          </div>
          <div style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: hasContent ? 'var(--text-secondary)' : 'var(--text-muted)',
            whiteSpace: hasContent ? 'pre-wrap' : 'normal',
            display: '-webkit-box',
            WebkitLineClamp: hasContent ? 3 : undefined,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {hasContent
              ? preview
              : 'Опишите объём, формат оформления, особые пожелания и все, что важно учесть в работе.'}
          </div>
        </div>

        <div style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <ChevronRight size={18} color="var(--text-muted)" />
        </div>
      </motion.button>
    </motion.div>
  )
}

interface AttachmentsCardProps {
  files: File[]
  onAdd: (files: File[]) => void
  onRemove: (index: number) => void
  disabled?: boolean
}

function AttachmentsCard({ files, onAdd, onRemove, disabled }: AttachmentsCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const totalSize = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files]
  )

  const handleIncomingFiles = useCallback((incomingFiles: File[]) => {
    const validation = validateIncomingFiles(incomingFiles, files)

    if (validation.accepted.length > 0) {
      onAdd(validation.accepted)
    }

    const nextNotice = buildFileNotice(validation)
    setNotice(nextNotice)
  }, [files, onAdd])

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    if (disabled) {
      return
    }
    handleIncomingFiles(Array.from(event.dataTransfer.files))
  }, [disabled, handleIncomingFiles])

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      return
    }

    const selectedFiles = event.target.files ? Array.from(event.target.files) : []
    handleIncomingFiles(selectedFiles)
    event.target.value = ''
  }, [disabled, handleIncomingFiles])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        ...getSectionShellStyle(isDragging),
        padding: '14px',
        opacity: disabled ? 0.65 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: 'rgba(212, 175, 55, 0.08)',
          border: '1px solid rgba(212, 175, 55, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Paperclip size={16} color="var(--gold-400)" strokeWidth={2} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--gold-400)',
            marginBottom: 2,
          }}>
            Файлы
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>
            Методичка, задание, пример или скрин
          </div>
        </div>

        <StatusPill
          tone={files.length > 0 ? 'accent' : 'muted'}
          label={files.length > 0 ? `${files.length} файл(ов)` : 'По желанию'}
        />
      </div>

      <motion.div
        animate={{
          scale: isDragging ? 0.995 : 1,
          backgroundColor: isDragging ? 'rgba(212, 175, 55, 0.08)' : 'rgba(255, 255, 255, 0.02)',
        }}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        style={{
          ...getInnerSurfaceStyle(isDragging, files.length === 0),
          padding: '15px 16px',
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

        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: 'rgba(212, 175, 55, 0.10)',
            border: '1px solid rgba(212, 175, 55, 0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <FileUp size={20} color="var(--gold-400)" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginBottom: 5 }}>
              {files.length > 0 ? 'Добавить ещё файлы' : 'Прикрепить файлы'}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
              Поддерживаем документы, изображения, архивы и медиа. До 50 МБ на файл.
            </div>
          </div>

          <StatusPill tone="accent" label="до 50 МБ" />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <StatusPill tone="muted" label="PDF / DOCX" />
          <StatusPill tone="muted" label="JPG / PNG" />
          <StatusPill tone="muted" label="ZIP / XLSX" />
        </div>
      </motion.div>

      {(files.length > 0 || notice) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {files.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <StatusPill tone="accent" label={`${files.length} файл(ов)`} />
              <StatusPill tone="muted" label={formatFileSize(totalSize)} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Все выбранные материалы загрузим после создания заказа.
              </span>
            </div>
          )}

          {notice && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.18)',
            }}>
              <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, lineHeight: 1.55, color: '#f8c26a' }}>{notice}</span>
            </div>
          )}
        </div>
      )}

      {files.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {files.map((file, index) => (
            <AttachedFileRow
              key={buildFileSignature(file)}
              file={file}
              onRemove={() => onRemove(index)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

function AttachedFileRow({
  file,
  onRemove,
  disabled,
}: {
  file: File
  onRemove: () => void
  disabled?: boolean
}) {
  const extension = getFileExtension(file.name)

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 16,
        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.02))',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <div style={{
        minWidth: 46,
        padding: '8px 10px',
        borderRadius: 12,
        background: 'rgba(212, 175, 55, 0.10)',
        color: 'var(--gold-300)',
        fontSize: 11,
        fontWeight: 700,
        textAlign: 'center',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        {extension || 'Файл'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text-main)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: 4,
        }}>
          {file.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StatusPill tone="muted" label={formatFileSize(file.size)} />
          <StatusPill tone="muted" label={getFileKindLabel(file.name)} />
        </div>
      </div>

      {!disabled && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={onRemove}
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            border: '1px solid rgba(239, 68, 68, 0.18)',
            background: 'rgba(239, 68, 68, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X size={14} color="#ef4444" />
        </motion.button>
      )}
    </motion.div>
  )
}

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
  useModalRegistration(isOpen, 'requirements-editor-modal')

  useEffect(() => {
    if (isOpen) {
      setLocalValue(value)
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen, value])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleViewportResize = () => {
      textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
      setLocalValue(prev => prev ? `${prev}\n${text}` : text)
    } catch {
      // Clipboard API may be unavailable inside Telegram WebView.
    }
  }, [])

  const handleTemplateInsert = useCallback((templateKey: string) => {
    const template = REQUIREMENTS_TEMPLATES[templateKey] || REQUIREMENTS_TEMPLATES.default
    setLocalValue(prev => prev ? `${prev}\n\n${template}` : template)
    setShowTemplates(false)
  }, [])

  const placeholder = serviceTypeId && REQUIREMENTS_TEMPLATES[serviceTypeId]
    ? REQUIREMENTS_TEMPLATES[serviceTypeId]
    : `Опишите ожидания:

• объём или количество слайдов
• требования к уникальности
• оформление по ГОСТ или методичке
• особые пожелания`

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
          <motion.div
            initial={{ y: -16, opacity: 0 }}
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
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={handleSave}
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
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
                Требования
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {serviceName || 'Опишите детали в свободной форме'}
              </div>
            </div>

            <StatusPill tone={charCount > 0 ? 'good' : 'muted'} label={`${charCount} символов`} />
          </motion.div>

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
              flexWrap: 'wrap',
            }}
          >
            <ToolbarButton icon={ClipboardPaste} label="Вставить" onClick={handlePaste} />
            <ToolbarButton
              icon={Sparkles}
              label="Шаблоны"
              onClick={() => setShowTemplates(prev => !prev)}
              active={showTemplates}
            />
            <div style={{ flex: 1 }} />
            <ToolbarButton icon={Trash2} label="Очистить" onClick={handleClear} danger />
          </motion.div>

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
                        color: 'var(--text-secondary)',
                        background: 'var(--bg-glass)',
                        border: '1px solid var(--border-default)',
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
              onChange={(event) => setLocalValue(event.target.value)}
              placeholder={placeholder}
              style={{
                width: '100%',
                minHeight: 320,
                height: '100%',
                fontSize: 16,
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

          <div style={{
            padding: '14px 20px calc(14px + env(safe-area-inset-bottom, 0px))',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
          }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: 16,
                border: 'none',
                background: 'var(--gold-metallic)',
                color: '#050505',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Сохранить требования
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

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
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px',
        fontSize: 12,
        fontWeight: 600,
        color: danger ? '#ef4444' : active ? 'var(--gold-400)' : 'var(--text-secondary)',
        background: active ? 'rgba(212, 175, 55, 0.10)' : 'var(--bg-glass)',
        border: `1px solid ${active ? 'var(--border-gold)' : 'var(--border-default)'}`,
        borderRadius: 10,
        cursor: 'pointer',
      }}
    >
      <Icon size={14} />
      {label}
    </motion.button>
  )
}

function StatusPill({
  label,
  tone,
}: {
  label: string
  tone: 'good' | 'muted' | 'accent'
}) {
  const palette = tone === 'good'
    ? {
      background: 'rgba(34, 197, 94, 0.10)',
      border: 'rgba(34, 197, 94, 0.18)',
      color: '#7dd3a6',
    }
    : tone === 'accent'
      ? {
        background: 'rgba(212, 175, 55, 0.10)',
        border: 'rgba(212, 175, 55, 0.20)',
        color: 'var(--gold-300)',
      }
      : {
        background: 'rgba(255, 255, 255, 0.04)',
        border: 'rgba(255, 255, 255, 0.06)',
        color: 'var(--text-muted)',
      }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '7px 10px',
      borderRadius: 999,
      background: palette.background,
      border: `1px solid ${palette.border}`,
      color: palette.color,
      fontSize: 11,
      fontWeight: 700,
      lineHeight: 1,
    }}>
      {label}
    </span>
  )
}

function buildFileSignature(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function getFileExtension(filename: string) {
  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex === -1) {
    return ''
  }
  return filename.slice(dotIndex + 1).toUpperCase()
}

function getFileExtensionWithDot(filename: string) {
  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex === -1) {
    return ''
  }
  return filename.slice(dotIndex).toLowerCase()
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} МБ`
  }

  return `${Math.max(1, Math.round(size / 1024))} КБ`
}

function getFileKindLabel(filename: string) {
  const ext = getFileExtensionWithDot(filename)
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].includes(ext)) {
    return 'изображение'
  }
  if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
    return 'архив'
  }
  if (['.mp3', '.wav'].includes(ext)) {
    return 'аудио'
  }
  if (['.mp4', '.avi', '.mov'].includes(ext)) {
    return 'видео'
  }
  if (['.py', '.ts', '.html', '.css', '.json', '.xml', '.sql'].includes(ext)) {
    return 'код / данные'
  }
  return 'документ'
}

function validateIncomingFiles(incomingFiles: File[], existingFiles: File[]) {
  const knownSignatures = new Set(existingFiles.map(buildFileSignature))
  const accepted: File[] = []
  const blocked: string[] = []
  const oversized: string[] = []
  const duplicates: string[] = []

  incomingFiles.forEach((file) => {
    const signature = buildFileSignature(file)
    const extension = getFileExtensionWithDot(file.name)

    if (knownSignatures.has(signature) || accepted.some(item => buildFileSignature(item) === signature)) {
      duplicates.push(file.name)
      return
    }

    if (extension && !ACCEPTED_EXTENSIONS.includes(extension)) {
      blocked.push(file.name)
      return
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      oversized.push(file.name)
      return
    }

    accepted.push(file)
  })

  return { accepted, blocked, oversized, duplicates }
}

function buildFileNotice(validation: ReturnType<typeof validateIncomingFiles>) {
  const parts: string[] = []

  if (validation.accepted.length > 0) {
    parts.push(`Добавили ${validation.accepted.length} файл(ов).`)
  }

  if (validation.duplicates.length > 0) {
    parts.push(`Повторы пропустили: ${validation.duplicates.join(', ')}.`)
  }

  if (validation.blocked.length > 0) {
    parts.push(`Неподдерживаемый тип: ${validation.blocked.join(', ')}.`)
  }

  if (validation.oversized.length > 0) {
    parts.push(`Слишком большие файлы (лимит 50 МБ): ${validation.oversized.join(', ')}.`)
  }

  return parts.length > 0 ? parts.join(' ') : null
}

function getTemplateLabel(key: string) {
  if (key === 'default') {
    return 'Общий шаблон'
  }

  return SERVICE_TYPES.find(service => service.id === key)?.label || key
}
