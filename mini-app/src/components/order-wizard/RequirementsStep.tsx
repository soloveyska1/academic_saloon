import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Camera,
  Check,
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
   REQUIREMENTS STEP — v5 «Concierge Briefing»

   Architecture:
   - iOS Settings-style grouped list (ONE surface, NO child borders)
   - Conversational labels ("Какой предмет?" not "Предмет *")
   - Each row: label left, value right, chevron for triggers
   - Inline requirements textarea (NO fullscreen modal)
   - Large, visible subject suggestion chips
   - Service-type adaptive copy
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

/* ── Service-type adaptive copy ──────────────────────────────────────── */

const SUBJECT_PLACEHOLDERS: Record<string, string> = {
  diploma: 'Экономика предприятия, информатика...',
  masters: 'Финансовый менеджмент, педагогика...',
  coursework: 'Макроэкономика, гражданское право...',
  essay: 'Философия, культурология, политология...',
  control: 'Математика, статистика, бухучёт...',
  practice: 'Менеджмент, бухучёт, юриспруденция...',
}

const TOPIC_CONFIG: Record<string, { label: string; placeholder: string }> = {
  diploma: { label: 'Тема ВКР', placeholder: 'Если утверждена — напиши как есть' },
  masters: { label: 'Тема диссертации', placeholder: 'Точная формулировка или направление' },
  coursework: { label: 'О чём курсовая?', placeholder: 'Тема или хотя бы направление' },
  essay: { label: 'На какую тему?', placeholder: 'Можно примерно — поможем сформулировать' },
  presentation: { label: 'Тема выступления', placeholder: 'О чём презентация?' },
  practice: { label: 'Где проходил практику?', placeholder: 'Название организации' },
  control: { label: 'Какие задания?', placeholder: 'Тема, номер варианта' },
}

const POPULAR_SUBJECTS = [
  'Экономика', 'Менеджмент', 'Маркетинг', 'Юриспруденция',
  'Психология', 'Информатика', 'Финансы', 'Педагогика',
  'История', 'Математика', 'Социология', 'Бухучёт',
]

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 28 }

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

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
  const [expandedSection, setExpandedSection] = useState<string | null>('subject')
  const [showReqEditor, setShowReqEditor] = useState(false)
  const service = SERVICE_TYPES.find(item => item.id === serviceTypeId)
  const isExpress = service?.category === 'express'
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileNotice, setFileNotice] = useState<string | null>(null)

  const topicConfig = TOPIC_CONFIG[serviceTypeId || ''] || {
    label: 'О чём работа?',
    placeholder: 'Если тема уже есть — напиши сюда',
  }
  const subjectPlaceholder = SUBJECT_PLACEHOLDERS[serviceTypeId || ''] || 'Микроэкономика, Python, маркетинг...'

  const suggestions = useMemo(() => {
    if (subject.trim().length > 0) return []
    return POPULAR_SUBJECTS
  }, [subject])

  const reqLineCount = requirements.trim() ? requirements.trim().split('\n').filter(Boolean).length : 0

  const fileTotalSize = useMemo(() => files.reduce((s, f) => s + f.size, 0), [files])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files) return
    const incoming = Array.from(e.target.files)
    const validation = validateIncomingFiles(incoming, files)
    if (validation.accepted.length > 0) onFilesAdd(validation.accepted)
    setFileNotice(buildFileNotice(validation))
    e.target.value = ''
  }, [disabled, files, onFilesAdd])

  // Auto-expand next empty section after subject is filled
  useEffect(() => {
    if (subject.trim() && expandedSection === 'subject') {
      setExpandedSection('topic')
    }
  }, [subject, expandedSection])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ═══ GROUP 1: Subject + Topic ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
      >
        <GroupCard>
          {/* ── Subject row ── */}
          <BriefingRow
            label={isExpress ? 'Какой предмет?' : 'Какой предмет? *'}
            value={subject}
            icon={<BookOpen size={16} />}
            expanded={expandedSection === 'subject'}
            onToggle={() => setExpandedSection(expandedSection === 'subject' ? null : 'subject')}
            filled={!!subject.trim()}
          >
            <input
              type="text"
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              placeholder={subjectPlaceholder}
              disabled={disabled}
              autoCapitalize="sentences"
              enterKeyHint="next"
              style={inputStyle}
            />
            {/* Subject suggestions */}
            {suggestions.length > 0 && !disabled && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 12,
              }}>
                {suggestions.map((s) => (
                  <motion.button
                    key={s}
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      onSubjectChange(s)
                      triggerHaptic()
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 12,
                      background: 'rgba(212, 175, 55, 0.06)',
                      border: '1px solid rgba(212, 175, 55, 0.12)',
                      color: 'rgba(212, 175, 55, 0.75)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation',
                    }}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            )}
          </BriefingRow>

          <Hairline />

          {/* ── Topic row ── */}
          <BriefingRow
            label={topicConfig.label}
            value={topic}
            icon={<FileText size={16} />}
            expanded={expandedSection === 'topic'}
            onToggle={() => setExpandedSection(expandedSection === 'topic' ? null : 'topic')}
            filled={!!topic.trim()}
            optional
          >
            <textarea
              value={topic}
              onChange={(e) => onTopicChange(e.target.value)}
              placeholder={topicConfig.placeholder}
              disabled={disabled}
              rows={2}
              autoCapitalize="sentences"
              style={{ ...inputStyle, resize: 'none', minHeight: 48 }}
            />
            {!topic.trim() && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                marginTop: 8, fontSize: 11, color: 'var(--text-muted)', opacity: 0.5,
              }}>
                <Sparkles size={11} color="rgba(212, 175, 55, 0.4)" />
                Если темы нет — поможем сформулировать
              </div>
            )}
          </BriefingRow>
        </GroupCard>
      </motion.div>

      {/* ═══ GROUP 2: Requirements + Files ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING, delay: 0.06 }}
      >
        <GroupLabel>Если есть подробности</GroupLabel>
        <GroupCard>
          {/* ── Requirements row ── */}
          <BriefingRow
            label="Есть пожелания?"
            value={reqLineCount > 0 ? `${reqLineCount} ${reqLineCount === 1 ? 'пункт' : 'пунктов'}` : ''}
            icon={<PenTool size={16} />}
            expanded={expandedSection === 'requirements'}
            onToggle={() => setExpandedSection(expandedSection === 'requirements' ? null : 'requirements')}
            filled={reqLineCount > 0}
            optional
          >
            <textarea
              value={requirements}
              onChange={(e) => onRequirementsChange(e.target.value)}
              placeholder={
                REQUIREMENTS_TEMPLATES[serviceTypeId || ''] ||
                'Объём, оформление, особые условия...'
              }
              disabled={disabled}
              rows={4}
              autoCapitalize="sentences"
              style={{ ...inputStyle, resize: 'none', minHeight: 80, lineHeight: 1.6 }}
            />
          </BriefingRow>

          <Hairline />

          {/* ── Files row ── */}
          <BriefingRow
            label="Прикрепи файлы"
            value={files.length > 0 ? `${files.length} · ${formatFileSize(fileTotalSize)}` : ''}
            icon={<Paperclip size={16} />}
            expanded={expandedSection === 'files'}
            onToggle={() => setExpandedSection(expandedSection === 'files' ? null : 'files')}
            filled={files.length > 0}
            optional
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

            {/* Upload buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: files.length > 0 ? 12 : 0 }}>
              <ActionChip
                icon={<FileUp size={14} />}
                label="Выбрать файлы"
                onClick={() => fileInputRef.current?.click()}
              />
              <ActionChip
                icon={<Camera size={14} />}
                label="Фото задания"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'image/*'
                    fileInputRef.current.setAttribute('capture', 'environment')
                    fileInputRef.current.click()
                    // Reset accept after click
                    setTimeout(() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = ACCEPTED_EXTENSIONS.join(',')
                        fileInputRef.current.removeAttribute('capture')
                      }
                    }, 1000)
                  }
                }}
              />
            </div>

            {/* File list */}
            {files.map((file, i) => (
              <FileRow
                key={`${file.name}:${file.size}`}
                file={file}
                onRemove={() => onFileRemove(i)}
                disabled={disabled}
              />
            ))}

            {/* Notice */}
            {fileNotice && (
              <div style={{
                marginTop: 8, padding: '6px 8px', borderRadius: 8,
                background: 'rgba(212, 175, 55, 0.04)',
                fontSize: 11, color: 'rgba(212, 175, 55, 0.6)', lineHeight: 1.4,
                display: 'flex', alignItems: 'flex-start', gap: 6,
              }}>
                <AlertTriangle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                {fileNotice}
              </div>
            )}

            {files.length === 0 && (
              <div style={{
                fontSize: 11, color: 'var(--text-muted)', opacity: 0.45, marginTop: 6,
              }}>
                Методичка, задание, примеры — до 50 МБ
              </div>
            )}
          </BriefingRow>
        </GroupCard>
      </motion.div>

      {/* ═══ Reassurance ═══ */}
      <div style={{
        fontSize: 12,
        color: 'var(--text-muted)',
        opacity: 0.45,
        textAlign: 'center',
        padding: '2px 0',
      }}>
        Не переживай — всё можно уточнить в чате с менеджером
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   GROUP CARD — Single rounded surface, children have ZERO chrome
   iOS Settings-style: one border, one background, hairline dividers
   ═══════════════════════════════════════════════════════════════════════════ */

function GroupCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      borderRadius: 16,
      background: 'rgba(255, 255, 255, 0.04)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      overflow: 'hidden',
    }}>
      {children}
    </div>
  )
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text-muted)',
      opacity: 0.6,
      padding: '0 4px 8px',
    }}>
      {children}
    </div>
  )
}

function Hairline() {
  return <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.06)', margin: '0 16px' }} />
}

/* ═══════════════════════════════════════════════════════════════════════════
   BRIEFING ROW — Collapsible row with label/value/chevron
   ═══════════════════════════════════════════════════════════════════════════ */

function BriefingRow({
  label,
  value,
  icon,
  expanded,
  onToggle,
  filled,
  optional,
  children,
}: {
  label: string
  value: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  filled: boolean
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      {/* Header — always visible, tappable */}
      <motion.button
        type="button"
        onClick={onToggle}
        whileTap={{ scale: 0.99 }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
      >
        {/* Icon */}
        <div style={{
          color: filled ? 'var(--gold-400)' : 'var(--text-muted)',
          opacity: filled ? 1 : 0.4,
          transition: 'color 0.2s, opacity 0.2s',
          flexShrink: 0,
          display: 'flex',
        }}>
          {filled ? <Check size={16} strokeWidth={2.5} /> : icon}
        </div>

        {/* Label */}
        <span style={{
          flex: 1,
          fontSize: 15,
          fontWeight: filled ? 600 : 500,
          color: filled ? 'var(--text-primary)' : 'var(--text-secondary)',
          transition: 'color 0.2s',
        }}>
          {filled && value ? value : label}
          {optional && !filled && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', opacity: 0.4, marginLeft: 6 }}>
              необязательно
            </span>
          )}
        </span>

        {/* Filled badge or chevron */}
        {filled && !expanded ? (
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(212, 175, 55, 0.6)',
            padding: '3px 8px',
            borderRadius: 6,
            background: 'rgba(212, 175, 55, 0.06)',
          }}>
            ✓
          </div>
        ) : (
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ color: 'var(--text-muted)', opacity: 0.3, flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        )}
      </motion.button>

      {/* Expandable content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 16px 16px' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   ACTION CHIP — Upload button
   ═══════════════════════════════════════════════════════════════════════════ */

function ActionChip({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 10,
        background: 'rgba(212, 175, 55, 0.06)',
        border: '1px solid rgba(212, 175, 55, 0.12)',
        color: 'rgba(212, 175, 55, 0.75)',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    >
      {icon}
      {label}
    </motion.button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   FILE ROW — Compact, minimal
   ═══════════════════════════════════════════════════════════════════════════ */

function FileRow({ file, onRemove, disabled }: { file: File; onRemove: () => void; disabled?: boolean }) {
  const ext = getFileExtension(file.name)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
    }}>
      <span style={{
        padding: '2px 6px', borderRadius: 4,
        background: 'rgba(212, 175, 55, 0.06)',
        color: 'rgba(212, 175, 55, 0.65)',
        fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
        fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
      }}>
        {ext || '?'}
      </span>
      <span style={{
        flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {file.name}
      </span>
      <span style={{
        fontSize: 11, color: 'var(--text-muted)', opacity: 0.4, flexShrink: 0,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {formatFileSize(file.size)}
      </span>
      {!disabled && (
        <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={onRemove}
          style={{
            width: 22, height: 22, borderRadius: 6, border: 'none',
            background: 'rgba(255, 255, 255, 0.04)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}>
          <X size={10} color="var(--text-muted)" />
        </motion.button>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED
   ═══════════════════════════════════════════════════════════════════════════ */

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontSize: 16,
  lineHeight: 1.5,
  fontWeight: 500,
  fontFamily: "'Manrope', sans-serif",
  color: 'var(--text-primary)',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  padding: 0,
  margin: 0,
  WebkitAppearance: 'none',
  boxShadow: 'none',
}

function triggerHaptic() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tg = (window as any).Telegram?.WebApp?.HapticFeedback
    if (tg?.selectionChanged) tg.selectionChanged()
    else tg?.impactOccurred?.('light')
  } catch { /* noop */ }
}

function getFileExtension(name: string) {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toUpperCase()
}

function getFileExtensionWithDot(name: string) {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot).toLowerCase()
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
  if (v.accepted.length > 0) p.push(`Принято: ${v.accepted.length} ${v.accepted.length === 1 ? 'файл' : 'файлов'}.`)
  if (v.duplicates.length > 0) p.push(`Уже прикреплён: ${v.duplicates.join(', ')}.`)
  if (v.blocked.length > 0) p.push(`Формат не поддерживаем: ${v.blocked.join(', ')}.`)
  if (v.oversized.length > 0) p.push(`Слишком большой (макс. 50 МБ): ${v.oversized.join(', ')}.`)
  return p.length > 0 ? p.join(' ') : null
}
