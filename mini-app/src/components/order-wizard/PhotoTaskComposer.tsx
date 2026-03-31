import { useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  Camera,
  Plus,
  X,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   PHOTO TASK COMPOSER — Photo-first upload flow

   Оптимизирован под сценарий "сфотографировал задание → отправил".
   Фото = главный элемент. Текст = маленький опциональный комментарий.
   ═══════════════════════════════════════════════════════════════════════════ */

const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024
const ACCEPTED_PHOTO = 'image/*,.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.webp,.heic'

const SUBJECT_CHIPS = [
  'Математика',
  'Физика',
  'Экономика',
  'Программирование',
  'Химия',
  'Другой предмет',
] as const

interface PhotoTaskComposerProps {
  files: File[]
  onFilesAdd: (files: File[]) => void
  onFileRemove: (index: number) => void
  comment: string
  onCommentChange: (val: string) => void
  subject: string
  onSubjectChange: (val: string) => void
  disabled?: boolean
}

export function PhotoTaskComposer({
  files,
  onFilesAdd,
  onFileRemove,
  comment,
  onCommentChange,
  subject,
  onSubjectChange,
  disabled = false,
}: PhotoTaskComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addMoreRef = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const hasPhotos = files.length > 0

  const handleIncomingFiles = useCallback(
    (incoming: File[]) => {
      const validation = validateFiles(incoming, files)
      if (validation.accepted.length > 0) onFilesAdd(validation.accepted)
      setNotice(buildNotice(validation))
    },
    [files, onFilesAdd],
  )

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return
      handleIncomingFiles(e.target.files ? Array.from(e.target.files) : [])
      e.target.value = ''
    },
    [disabled, handleIncomingFiles],
  )

  const openPicker = useCallback(() => {
    if (!disabled) fileInputRef.current?.click()
  }, [disabled])

  const openAddMore = useCallback(() => {
    if (!disabled) addMoreRef.current?.click()
  }, [disabled])

  // Check if file is an image
  const isImage = useCallback((file: File) => {
    return file.type.startsWith('image/')
  }, [])

  // Generate thumbnail URLs
  const thumbnails = useMemo(() => {
    return files.map((f) => (isImage(f) ? URL.createObjectURL(f) : null))
  }, [files, isImage])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_PHOTO}
        capture="environment"
        onChange={handleInput}
        style={{ display: 'none' }}
        disabled={disabled}
      />
      <input
        ref={addMoreRef}
        type="file"
        multiple
        accept={ACCEPTED_PHOTO}
        onChange={handleInput}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {/* ─── Photo Zone ─── */}
      {!hasPhotos ? (
        /* Empty state: big drop zone */
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={disabled ? undefined : { scale: 0.98 }}
          onClick={openPicker}
          style={{
            width: '100%',
            minHeight: 220,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: 12,
            border: '1.5px dashed rgba(201, 162, 39, 0.15)',
            background: 'rgba(201, 162, 39, 0.02)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            transition: 'border-color 0.2s, background 0.2s',
          }}
        >
          <Camera
            size={44}
            color="var(--gold-400)"
            strokeWidth={1.3}
            style={{ opacity: 0.6 }}
          />
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            Сфотографируйте задание
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-muted)',
            }}
          >
            Или выберите из галереи
          </span>
        </motion.button>
      ) : (
        /* Photos attached: thumbnail strip */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            borderRadius: 12,
            border: '1px solid var(--border-strong)',
            background: 'var(--border-subtle)',
            overflow: 'hidden',
          }}
        >
          {/* Horizontal scroll of thumbnails */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: 12,
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
            }}
          >
            {files.map((file, i) => (
              <div
                key={`${file.name}:${file.size}:${file.lastModified}`}
                style={{
                  position: 'relative',
                  width: 110,
                  height: 110,
                  borderRadius: 12,
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--surface-hover)',
                }}
              >
                {thumbnails[i] ? (
                  <img
                    src={thumbnails[i]!}
                    alt={file.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  /* Non-image file */
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--gold-400)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {getExt(file.name)}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        maxWidth: 80,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                      }}
                    >
                      {file.name}
                    </span>
                  </div>
                )}

                {/* Remove button */}
                {!disabled && (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.85 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onFileRemove(i)
                    }}
                    style={{
                      position: 'absolute',
                      top: 5,
                      right: 5,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'rgba(0, 0, 0, 0.6)',
                      backdropFilter: 'blur(4px)',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={11} color="#fff" strokeWidth={2.5} />
                  </motion.button>
                )}
              </div>
            ))}

            {/* Add more button */}
            <motion.button
              type="button"
              whileTap={disabled ? undefined : { scale: 0.95 }}
              onClick={openAddMore}
              style={{
                width: 110,
                height: 110,
                borderRadius: 12,
                border: '1.5px dashed rgba(201, 162, 39, 0.12)',
                background: 'rgba(201, 162, 39, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                cursor: disabled ? 'not-allowed' : 'pointer',
                flexShrink: 0,
              }}
            >
              <Plus size={22} color="var(--gold-400)" strokeWidth={1.5} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Ещё
              </span>
            </motion.button>
          </div>

          {/* Photo count */}
          <div
            style={{
              padding: '6px 14px 10px',
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            {files.length} {pluralizePhotos(files.length)} ·{' '}
            {formatSize(files.reduce((s, f) => s + f.size, 0))}
          </div>
        </motion.div>
      )}

      {/* File notice */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Subject Quick-Pick ─── */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          padding: '0 1px',
        }}
      >
        {SUBJECT_CHIPS.map((chip) => {
          const isSelected = subject === chip
          return (
            <motion.button
              key={chip}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => onSubjectChange(isSelected ? '' : chip)}
              style={{
                padding: '7px 14px',
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
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
            >
              {chip}
            </motion.button>
          )
        })}
      </div>

      {/* ─── Comment (small, optional) ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          borderRadius: 12,
          border: '1px solid var(--border-strong)',
          background: 'var(--border-subtle)',
          padding: '10px 14px',
        }}
      >
        <textarea
          value={comment}
          onChange={(e) => {
            onCommentChange(e.target.value)
            const el = e.target
            el.style.height = 'auto'
            el.style.height = `${Math.min(el.scrollHeight, 100)}px`
          }}
          placeholder="Комментарий (необязательно)"
          disabled={disabled}
          rows={1}
          style={{
            width: '100%',
            minHeight: 22,
            maxHeight: 100,
            fontSize: 16,
            lineHeight: 1.4,
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
        />
      </motion.div>
    </div>
  )
}

/* ─── Utils ─── */

function getExt(name: string) {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '?' : name.slice(dot + 1).toUpperCase()
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} МБ`
  return `${Math.max(1, Math.round(bytes / 1024))} КБ`
}

function pluralizePhotos(n: number) {
  const m10 = n % 10
  const m100 = n % 100
  if (m100 >= 11 && m100 <= 19) return 'фото'
  if (m10 === 1) return 'фото'
  return 'фото'
}

function validateFiles(incoming: File[], existing: File[]) {
  const known = new Set(existing.map((f) => `${f.name}:${f.size}:${f.lastModified}`))
  const accepted: File[] = []
  const blocked: string[] = []
  const oversized: string[] = []
  const duplicates: string[] = []

  incoming.forEach((file) => {
    const sig = `${file.name}:${file.size}:${file.lastModified}`
    if (known.has(sig) || accepted.some((a) => `${a.name}:${a.size}:${a.lastModified}` === sig)) {
      duplicates.push(file.name)
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
  if (v.oversized.length > 0) p.push(`Слишком большие (лимит 50 МБ): ${v.oversized.join(', ')}.`)
  return p.length > 0 ? p.join(' ') : null
}
