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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ─── Предмет ──────────────────────────────────────────── */}
      <FieldCard
        label="Предмет"
        required={!isExpress}
        hint={isExpress ? 'необязательно' : undefined}
        icon={BookOpen}
        disabled={disabled}
        delay={0.03}
      >
        <input
          type="text"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder="Например: Микроэкономика"
          disabled={disabled}
          enterKeyHint="next"
          autoCapitalize="sentences"
          style={inputStyle}
        />
      </FieldCard>

      {/* Quick subject suggestions */}
      {suggestions.length > 0 && !disabled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: -4,
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

      {/* ─── Тема ─────────────────────────────────────────────── */}
      <FieldCard
        label="Тема работы"
        hint="необязательно"
        icon={FileText}
        disabled={disabled}
        delay={0.06}
      >
        <input
          type="text"
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          placeholder="Например: Анализ рентабельности предприятия"
          disabled={disabled}
          enterKeyHint="done"
          autoCapitalize="sentences"
          style={inputStyle}
        />
      </FieldCard>

      {/* ─── Требования + Файлы (secondary section) ───────────── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        marginTop: 4,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 4px',
        }}>
          <div style={{
            flex: 1,
            height: 1,
            background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.08), transparent)',
          }} />
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'rgba(212, 175, 55, 0.35)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            flexShrink: 0,
          }}>
            дополнительно
          </span>
          <div style={{
            flex: 1,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.08))',
          }} />
        </div>

        <RequirementsButton
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
      </div>

      {/* ─── Reassurance ──────────────────────────────────────── */}
      <div style={{
        fontSize: 11,
        color: 'var(--text-muted)',
        opacity: 0.45,
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontSize: 16,
  lineHeight: 1.4,
  fontWeight: 600,
  fontFamily: "'Manrope', sans-serif",
  color: 'var(--text-primary)',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  padding: 0,
}

const goldBorder = 'rgba(212, 175, 55, 0.22)'

/* ─────────────────────────────────────────────────────────────────────────
   FIELD CARD — Premium glass input wrapper with gold accents
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
      onFocusCapture={(e) => {
        setFocused(true)
        setTimeout(() => {
          (e.target as HTMLElement)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
        }, 150)
      }}
      onBlurCapture={() => setFocused(false)}
      style={{
        borderRadius: 16,
        border: `1.5px solid ${focused ? goldBorder : 'rgba(212, 175, 55, 0.08)'}`,
        background: focused
          ? 'linear-gradient(145deg, rgba(212, 175, 55, 0.06), rgba(14, 13, 12, 0.92) 40%)'
          : 'linear-gradient(145deg, rgba(212, 175, 55, 0.02), rgba(14, 13, 12, 0.90) 30%)',
        backdropFilter: 'blur(20px) saturate(130%)',
        WebkitBackdropFilter: 'blur(20px) saturate(130%)',
        padding: '14px 16px',
        opacity: disabled ? 0.5 : 1,
        transition: 'border-color 0.3s ease, background 0.3s ease, box-shadow 0.4s ease',
        boxShadow: focused
          ? [
              '0 0 24px -6px rgba(212, 175, 55, 0.12)',
              'inset 0 1px 0 rgba(255, 248, 214, 0.06)',
              'inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
            ].join(', ')
          : [
              'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
              'inset 0 -1px 0 rgba(0, 0, 0, 0.15)',
              '0 2px 8px -4px rgba(0, 0, 0, 0.3)',
            ].join(', '),
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent line — visible on focus */}
      {focused && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            right: '15%',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.30), transparent)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Label row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
      }}>
        <div style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          background: focused ? 'rgba(212, 175, 55, 0.10)' : 'rgba(212, 175, 55, 0.04)',
          border: `1px solid ${focused ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.06)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.25s ease',
        }}>
          <Icon
            size={11}
            color={focused ? 'var(--gold-400)' : 'var(--text-muted)'}
            strokeWidth={2}
            style={{ transition: 'color 0.2s', opacity: focused ? 1 : 0.5 }}
          />
        </div>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: focused ? 'var(--gold-400)' : 'rgba(255, 255, 255, 0.4)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase' as const,
          transition: 'color 0.2s',
        }}>
          {label}{required && ' *'}
        </span>
        {hint && (
          <span style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            opacity: 0.4,
            marginLeft: 'auto',
            letterSpacing: '0.02em',
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
        borderRadius: 16,
        border: `1.5px solid ${hasContent ? goldBorder : 'rgba(212, 175, 55, 0.08)'}`,
        background: hasContent
          ? 'linear-gradient(145deg, rgba(212, 175, 55, 0.06), rgba(14, 13, 12, 0.92) 40%)'
          : 'linear-gradient(145deg, rgba(212, 175, 55, 0.02), rgba(14, 13, 12, 0.90) 30%)',
        backdropFilter: 'blur(20px) saturate(130%)',
        WebkitBackdropFilter: 'blur(20px) saturate(130%)',
        opacity: disabled ? 0.5 : 1,
        overflow: 'hidden',
        boxShadow: [
          'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
          'inset 0 -1px 0 rgba(0, 0, 0, 0.15)',
          '0 2px 8px -4px rgba(0, 0, 0, 0.3)',
        ].join(', '),
      }}
    >
      <motion.button
        type="button"
        whileTap={disabled ? undefined : { scale: 0.98 }}
        onClick={disabled ? undefined : onEdit}
        style={{
          width: '100%',
          padding: '14px 16px',
          border: 'none',
          background: 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: hasContent
            ? 'radial-gradient(circle at center, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.04) 70%)'
            : 'rgba(212, 175, 55, 0.04)',
          border: `1px solid ${hasContent ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.06)'}`,
          boxShadow: hasContent ? '0 0 12px -4px rgba(212, 175, 55, 0.15)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.3s ease',
        }}>
          <PenTool
            size={16}
            color={hasContent ? 'var(--gold-400)' : 'var(--text-muted)'}
            strokeWidth={1.5}
            style={{
              opacity: hasContent ? 1 : 0.5,
              filter: hasContent ? 'drop-shadow(0 0 3px rgba(212, 175, 55, 0.3))' : 'none',
              transition: 'all 0.3s',
            }}
          />
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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
              <Trash2 size={12} color="var(--error-text)" />
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
        borderRadius: 16,
        border: `1.5px solid ${isDragging ? goldBorder : files.length > 0 ? goldBorder : 'rgba(212, 175, 55, 0.08)'}`,
        background: isDragging
          ? 'linear-gradient(145deg, rgba(212, 175, 55, 0.06), rgba(14, 13, 12, 0.92) 40%)'
          : files.length > 0
            ? 'linear-gradient(145deg, rgba(212, 175, 55, 0.04), rgba(14, 13, 12, 0.92) 40%)'
            : 'linear-gradient(145deg, rgba(212, 175, 55, 0.02), rgba(14, 13, 12, 0.90) 30%)',
        backdropFilter: 'blur(20px) saturate(130%)',
        WebkitBackdropFilter: 'blur(20px) saturate(130%)',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.3s ease',
        boxShadow: [
          'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
          'inset 0 -1px 0 rgba(0, 0, 0, 0.15)',
          '0 2px 8px -4px rgba(0, 0, 0, 0.3)',
        ].join(', '),
      }}
    >
      {/* Drop zone / Upload button */}
      <motion.div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        style={{
          padding: '14px 16px',
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
            width: 38,
            height: 38,
            borderRadius: 12,
            background: files.length > 0
              ? 'radial-gradient(circle at center, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.04) 70%)'
              : 'rgba(212, 175, 55, 0.04)',
            border: `1px solid ${files.length > 0 ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.06)'}`,
            boxShadow: files.length > 0 ? '0 0 12px -4px rgba(212, 175, 55, 0.15)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.3s ease',
          }}>
            {files.length > 0
              ? <Paperclip size={16} color="var(--gold-400)" style={{ filter: 'drop-shadow(0 0 3px rgba(212, 175, 55, 0.3))' }} />
              : <FileUp size={16} color="var(--text-muted)" style={{ opacity: 0.5 }} />}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', marginBottom: 2 }}>
              {files.length > 0 ? `${files.length} ${pluralizeFiles(files.length)}` : 'Прикрепить файлы'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {files.length > 0
                ? `${formatFileSize(totalSize)} · Нажмите чтобы добавить ещё`
                : 'Прикрепите задание — оценка будет точнее'}
            </div>
          </div>

          {files.length > 0 && (
            <Pill tone="accent" label={`${files.length}`} />
          )}
        </div>

        {/* File type chips */}
        {files.length === 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
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
          borderRadius: 8,
          background: 'rgba(212, 175, 55, 0.06)',
          border: '1px solid rgba(212, 175, 55, 0.12)',

          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}>
          <AlertTriangle size={14} color="rgba(212, 175, 55, 0.7)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, lineHeight: 1.5, color: 'rgba(212, 175, 55, 0.65)' }}>{notice}</span>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div style={{
          borderTop: '1px solid var(--surface-hover)',
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
      gap: 8,
      padding: '8px 10px',
      borderRadius: 10,
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.04)',
    }}>
      <span style={{
        padding: '4px 8px',
        borderRadius: 4,
        background: goldSoft,
        color: 'var(--gold-400)',
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
          <X size={12} color="var(--error-text)" />
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
            borderBottom: '1px solid var(--surface-hover)',
          }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={handleSave}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-strong)',
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
            borderBottom: '1px solid var(--bg-glass)',
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
            borderTop: '1px solid var(--surface-hover)',
          }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                border: 'none',
                background: 'var(--gold-metallic)',
                color: 'var(--text-on-gold)',
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
        color: danger ? 'var(--error-text)' : active ? 'var(--gold-400)' : 'var(--text-secondary)',
        background: active ? goldSoft : 'var(--bg-glass)',
        border: `1px solid ${active ? goldBorder : cardBorder}`,
        borderRadius: 8,
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
