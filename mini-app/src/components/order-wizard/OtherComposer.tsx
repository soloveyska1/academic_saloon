import { useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  Paperclip,
  X,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   OTHER COMPOSER — Guided free-text composer for custom requests

   Оптимизирован для неуверенных пользователей: теги категорий помощи,
   отдельное поле предмета, контекстный placeholder.
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

interface HelpCategory {
  id: string
  label: string
  placeholder: string
}

const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'coding',
    label: 'Код / Программа',
    placeholder: 'Язык, задание, что должна делать программа...',
  },
  {
    id: 'exam_prep',
    label: 'Подготовка к экзамену',
    placeholder: 'Предмет, формат (устный/письменный), дата экзамена...',
  },
  {
    id: 'lab_report',
    label: 'Лабораторная',
    placeholder: 'Предмет, номер лабы, что нужно: отчёт, расчёты, код...',
  },
  {
    id: 'translation',
    label: 'Перевод',
    placeholder: 'С какого на какой язык, объём, тема текста...',
  },
  {
    id: 'problem_solving',
    label: 'Расчёты / Задачи',
    placeholder: 'Предмет, количество задач, есть ли методичка...',
  },
  {
    id: 'misc',
    label: 'Что-то ещё',
    placeholder: 'Опишите задачу — мы подберём подходящего автора',
  },
]

const DEFAULT_PLACEHOLDER = `Например:
— Нужен код на C++ для курсового проекта
— Помогите подготовиться к устному экзамену
— Нужен обзор литературы по 3 статьям

Чем подробнее опишете — тем точнее оценим`

interface OtherComposerProps {
  description: string
  onDescriptionChange: (val: string) => void
  subject: string
  onSubjectChange: (val: string) => void
  helpCategory: string
  onHelpCategoryChange: (val: string) => void
  files: File[]
  onFilesAdd: (files: File[]) => void
  onFileRemove: (index: number) => void
  disabled?: boolean
}

export function OtherComposer({
  description,
  onDescriptionChange,
  subject,
  onSubjectChange,
  helpCategory,
  onHelpCategoryChange,
  files,
  onFilesAdd,
  onFileRemove,
  disabled = false,
}: OtherComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [interacted, setInteracted] = useState(false)

  const totalSize = useMemo(
    () => files.reduce((sum, f) => sum + f.size, 0),
    [files],
  )

  const activeCategory = HELP_CATEGORIES.find((c) => c.id === helpCategory)
  const placeholder = activeCategory?.placeholder || DEFAULT_PLACEHOLDER

  const handleIncomingFiles = useCallback(
    (incoming: File[]) => {
      const validation = validateFiles(incoming, files)
      if (validation.accepted.length > 0) onFilesAdd(validation.accepted)
      setNotice(buildNotice(validation))
    },
    [files, onFilesAdd],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return
      handleIncomingFiles(e.target.files ? Array.from(e.target.files) : [])
      e.target.value = ''
    },
    [disabled, handleIncomingFiles],
  )

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onDescriptionChange(e.target.value)
      if (!interacted) setInteracted(true)
      const el = e.target
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, window.innerHeight * 0.4)}px`
    },
    [onDescriptionChange, interacted],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Reassurance microcopy — fades on interaction */}
      <AnimatePresence>
        {!interacted && !description.trim() && !subject.trim() && (
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
            Расскажите своими словами — мы разберёмся
          </motion.p>
        )}
      </AnimatePresence>

      {/* ─── Help Category Tags ─── */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {HELP_CATEGORIES.map((cat) => {
          const isSelected = helpCategory === cat.id
          return (
            <motion.button
              key={cat.id}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onHelpCategoryChange(isSelected ? '' : cat.id)
                if (!interacted) setInteracted(true)
              }}
              style={{
                padding: '7px 13px',
                borderRadius: 999,
                border: `1px solid ${isSelected ? 'rgba(201, 162, 39, 0.22)' : 'rgba(255, 255, 255, 0.06)'}`,
                background: isSelected
                  ? 'rgba(201, 162, 39, 0.06)'
                  : 'rgba(255, 255, 255, 0.03)',
                color: isSelected ? 'var(--gold-400)' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {cat.label}
            </motion.button>
          )
        })}
      </div>

      {/* ─── Subject Field ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          borderRadius: 12,
          border: '1px solid var(--border-strong)',
          background: 'var(--border-subtle)',
          padding: '10px 14px',
        }}
      >
        <label
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            marginBottom: 8,
            letterSpacing: '0.03em',
          }}
        >
          Предмет
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => {
            onSubjectChange(e.target.value)
            if (!interacted) setInteracted(true)
          }}
          placeholder="Например: математика, английский, информатика..."
          disabled={disabled}
          style={{
            width: '100%',
            fontSize: 16,
            lineHeight: 1.4,
            fontWeight: 600,
            fontFamily: "'Manrope', sans-serif",
            color: 'var(--text-main)',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: 0,
          }}
        />
      </motion.div>

      {/* ─── Main Composer ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        style={{
          borderRadius: 12,
          border: '1px solid var(--border-strong)',
          background: 'var(--border-subtle)',
          overflow: 'hidden',
        }}
      >
        {/* Textarea */}
        <div style={{ padding: '14px 14px 0' }}>
          <textarea
            ref={textareaRef}
            value={description}
            onChange={handleTextChange}
            onFocus={() => {
              if (!interacted) setInteracted(true)
            }}
            placeholder={placeholder}
            disabled={disabled}
            rows={4}
            style={{
              width: '100%',
              minHeight: 100,
              maxHeight: '40vh',
              fontSize: 16,
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

        {/* Attached files as chips */}
        {files.length > 0 && (
          <div
            style={{
              padding: '8px 14px',
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
              {formatSize(totalSize)}
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
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.18)',
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

        {/* Toolbar */}
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
            onChange={handleFileInput}
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
              background:
                files.length > 0 ? 'var(--gold-glass-medium)' : 'var(--border-default)',
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

/* ─── FileChip ─── */

function FileChip({
  file,
  onRemove,
  disabled,
}: {
  file: File
  onRemove: () => void
  disabled?: boolean
}) {
  const ext = getExt(file.name)
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
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

/* ─── Utils ─── */

function getExt(name: string) {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toUpperCase()
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} МБ`
  return `${Math.max(1, Math.round(bytes / 1024))} КБ`
}

function pluralizeFiles(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod100 >= 11 && mod100 <= 19) return 'файлов'
  if (mod10 === 1) return 'файл'
  if (mod10 >= 2 && mod10 <= 4) return 'файла'
  return 'файлов'
}

function getExtWithDot(name: string) {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot).toLowerCase()
}

function validateFiles(incoming: File[], existing: File[]) {
  const known = new Set(existing.map((f) => `${f.name}:${f.size}:${f.lastModified}`))
  const accepted: File[] = []
  const blocked: string[] = []
  const oversized: string[] = []
  const duplicates: string[] = []

  incoming.forEach((file) => {
    const sig = `${file.name}:${file.size}:${file.lastModified}`
    const ext = getExtWithDot(file.name)

    if (known.has(sig) || accepted.some((a) => `${a.name}:${a.size}:${a.lastModified}` === sig)) {
      duplicates.push(file.name)
      return
    }
    if (
      ext &&
      ![
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.odt', '.ods', '.odp', '.rtf', '.txt', '.csv',
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
        '.zip', '.rar', '.7z', '.tar', '.gz',
        '.py', '.ts', '.html', '.css', '.json', '.xml', '.sql',
        '.mp3', '.mp4', '.avi', '.mov', '.wav',
      ].includes(ext)
    ) {
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

function buildNotice(v: ReturnType<typeof validateFiles>) {
  const p: string[] = []
  if (v.duplicates.length > 0) p.push(`Повторы пропустили: ${v.duplicates.join(', ')}.`)
  if (v.blocked.length > 0) p.push(`Неподдерживаемый тип: ${v.blocked.join(', ')}.`)
  if (v.oversized.length > 0) p.push(`Слишком большие (лимит 50 МБ): ${v.oversized.join(', ')}.`)
  return p.length > 0 ? p.join(' ') : null
}
