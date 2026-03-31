import { useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  Paperclip,
  X,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   FAST COMPOSER — Messenger-style quick request input

   Одно текстовое поле + прикрепление файлов.
   Заменяет: синюю карточку-объяснение, жёлтую подсказку,
   отдельные поля subject/topic, кнопку требований, карточку файлов.
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

const PLACEHOLDER = `Экономика, 2 курс — курсовая
Тема: анализ рентабельности предприятия
30 страниц, уникальность 60%...

Или просто прикрепите фото задания`

interface FastComposerProps {
  value: string
  onChange: (val: string) => void
  files: File[]
  onFilesAdd: (files: File[]) => void
  onFileRemove: (index: number) => void
  disabled?: boolean
}

export function FastComposer({
  value,
  onChange,
  files,
  onFilesAdd,
  onFileRemove,
  disabled = false,
}: FastComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [focused, setFocused] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const totalSize = useMemo(
    () => files.reduce((sum, f) => sum + f.size, 0),
    [files],
  )

  const handleIncomingFiles = useCallback(
    (incoming: File[]) => {
      const validation = validateIncomingFiles(incoming, files)
      if (validation.accepted.length > 0) onFilesAdd(validation.accepted)
      setNotice(buildFileNotice(validation))
    },
    [files, onFilesAdd],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return
      handleIncomingFiles(e.target.files ? Array.from(e.target.files) : [])
      e.target.value = ''
    },
    [disabled, handleIncomingFiles],
  )

  // Auto-grow textarea
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
      // Auto-resize
      const el = e.target
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, window.innerHeight * 0.45)}px`
    },
    [onChange],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Subtle hint — fades when user starts typing */}
      <AnimatePresence>
        {!value.trim() && !focused && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Опишите задачу свободным текстом — менеджер уточнит детали
          </motion.p>
        )}
      </AnimatePresence>

      {/* The Composer */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          borderRadius: 12,
          border: `1px solid ${focused ? 'var(--gold-glass-strong)' : 'var(--border-strong)'}`,
          background: 'var(--border-subtle)',
          opacity: disabled ? 0.6 : 1,
          transition: 'border-color 0.2s ease',
          overflow: 'hidden',
        }}
      >
        {/* Textarea */}
        <div style={{ padding: '16px 16px 0' }}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={PLACEHOLDER}
            disabled={disabled}
            rows={5}
            style={{
              width: '100%',
              minHeight: 130,
              maxHeight: '45vh',
              fontSize: 16, // Prevents iOS zoom
              lineHeight: 1.55,
              fontWeight: 600,
              fontFamily: "'Manrope', sans-serif",
              color: 'var(--text-main)',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              padding: 0,
            }}
            autoCapitalize="sentences"
            autoCorrect="on"
            spellCheck
          />
        </div>

        {/* Attached files as inline chips */}
        {files.length > 0 && (
          <div
            style={{
              padding: '8px 16px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {files.map((file, i) => (
              <FileChip
                key={`${file.name}:${file.size}:${file.lastModified}`}
                file={file}
                onRemove={() => onFileRemove(i)}
                disabled={disabled}
              />
            ))}
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                alignSelf: 'center',
                marginLeft: 4,
              }}
            >
              {formatFileSize(totalSize)}
            </span>
          </div>
        )}

        {/* File notice */}
        {notice && (
          <div
            style={{
              margin: '0 12px 8px',
              padding: '8px 10px',
              borderRadius: 8,
              background: 'rgba(212, 175, 55, 0.06)',
              border: '1px solid rgba(212, 175, 55, 0.12)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <AlertTriangle
              size={13}
              color="var(--warning-text)"
              style={{ flexShrink: 0, marginTop: 1 }}
            />
            <span style={{ fontSize: 12, lineHeight: 1.5, color: '#f8c26a' }}>
              {notice}
            </span>
          </div>
        )}

        {/* Toolbar — attachment button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            borderTop: '1px solid var(--surface-hover)',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS.join(',')}
            onChange={handleInputChange}
            style={{ display: 'none' }}
            disabled={disabled}
          />

          <motion.button
            type="button"
            whileTap={disabled ? undefined : { scale: 0.92 }}
            onClick={() => !disabled && fileInputRef.current?.click()}
            style={{
              position: 'relative',
              width: 38,
              height: 38,
              borderRadius: 12,
              background: files.length > 0 ? 'var(--gold-glass-medium)' : 'var(--border-default)',
              border: `1px solid ${files.length > 0 ? 'var(--gold-glass-strong)' : 'transparent'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Paperclip
              size={17}
              color={files.length > 0 ? 'var(--gold-400)' : 'var(--text-muted)'}
            />
            {/* Badge count */}
            {files.length > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'var(--gold-metallic)',
                  color: 'var(--text-on-gold)',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {files.length}
              </motion.span>
            )}
          </motion.button>

          <span
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              opacity: 0.6,
            }}
          >
            {files.length > 0
              ? `${files.length} ${pluralizeFiles(files.length)}`
              : 'Прикрепить файлы — до 50 МБ'}
          </span>
        </div>
      </motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   FILE CHIP — compact inline file indicator
   ───────────────────────────────────────────────────────────────────────── */

function FileChip({
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
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 8px',
        borderRadius: 8,
        background: 'var(--gold-glass-subtle)',
        border: '1px solid var(--gold-glass-medium)',
        maxWidth: 160,
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: 'var(--gold-400)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        {ext || '?'}
      </span>
      <span
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {file.name.replace(/\.[^.]+$/, '')}
      </span>
      {!disabled && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          style={{
            width: 18,
            height: 18,
            borderRadius: 5,
            background: 'rgba(239, 68, 68, 0.12)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X size={10} color="var(--error-text)" />
        </motion.button>
      )}
    </motion.div>
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
  if (size >= 1024 * 1024)
    return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} МБ`
  return `${Math.max(1, Math.round(size / 1024))} КБ`
}

function validateIncomingFiles(incoming: File[], existing: File[]) {
  const known = new Set(existing.map((f) => `${f.name}:${f.size}:${f.lastModified}`))
  const accepted: File[] = []
  const blocked: string[] = []
  const oversized: string[] = []
  const duplicates: string[] = []

  incoming.forEach((file) => {
    const sig = `${file.name}:${file.size}:${file.lastModified}`
    const ext = getFileExtensionWithDot(file.name)

    if (known.has(sig) || accepted.some((a) => `${a.name}:${a.size}:${a.lastModified}` === sig)) {
      duplicates.push(file.name)
      return
    }
    if (ext && !ACCEPTED_EXTENSIONS.includes(ext)) {
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
