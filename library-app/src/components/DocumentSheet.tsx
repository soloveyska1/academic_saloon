import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Download, Eye, Link2, Star, X } from 'lucide-react'
import {
  canPreviewDocument,
  CatalogDocument,
  getSnippet,
  launchDocumentFile,
  normalizeDocType,
  resolveDocumentBadge,
  resolveDocumentShareHeadline,
  resolveDocumentShareText,
  resolveDocumentShareUrl,
  shareResource,
} from '../lib/catalog'

interface DocumentSheetProps {
  document: CatalogDocument | null
  isFavorite: boolean
  relatedDocuments?: CatalogDocument[]
  onClose: () => void
  onOpenCategory?: (category: string) => void
  onOpenFavorites?: () => void
  onOpenRelatedDocument?: (doc: CatalogDocument) => void
  onToggleFavorite: (doc: CatalogDocument) => void
  onOrderByDoc: (doc: CatalogDocument) => void
}

export function DocumentSheet({
  document,
  isFavorite,
  relatedDocuments = [],
  onClose,
  onOpenCategory,
  onOpenFavorites,
  onOpenRelatedDocument,
  onToggleFavorite,
  onOrderByDoc,
}: DocumentSheetProps) {
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [shareLabel, setShareLabel] = useState('Поделиться')
  const summary = document ? getSnippet(document) : ''
  const shareReady = shareLabel !== 'Поделиться'
  const categoryMeta = document?.category || 'Каталог'
  const canPreview = document ? canPreviewDocument(document) : false
  const docTypeLabel = document ? normalizeDocType(document) : ''
  const fileActionLabel = canPreview ? 'Открыть файл' : 'Скачать файл'
  const fileActionNote = canPreview
    ? 'PDF откроется отдельно.'
    : 'Файл откроется в браузере или сохранится на устройстве.'
  const decisionLead = canPreview
    ? 'Можно посмотреть работу и вернуться к подборке.'
    : 'Можно открыть файл отдельно и вернуться к подборке.'

  useEffect(() => {
    if (!document) return
    window.document.body.classList.add('has-overlay')
    contentRef.current?.scrollTo({ top: 0, behavior: 'auto' })
    setShareLabel('Поделиться')
    return () => window.document.body.classList.remove('has-overlay')
  }, [document])

  async function handleShare() {
    if (!document) return

    const outcome = await shareResource({
      title: resolveDocumentShareHeadline(document),
      text: resolveDocumentShareText(document),
      url: resolveDocumentShareUrl(document),
    })
    if (outcome === 'dismissed') return
    setShareLabel(outcome === 'shared' ? 'Отправлено' : 'Ссылка скопирована')
    window.setTimeout(() => setShareLabel('Поделиться'), 1600)
  }

  function handleOpenFile() {
    if (!document) return
    const result = launchDocumentFile(document)
    if (result === 'new-tab') {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {document ? (
        <>
          <motion.button
            type="button"
            aria-label="Закрыть карточку документа"
            className="sheet-backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.section
            className="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.16 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 96 || info.velocity.y > 720) {
                onClose()
              }
            }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            <div className="sheet__handle" />
            <div className="sheet__header">
              <div className="sheet__header-copy">
                <div className="sheet__eyebrow-line">
                  <div className="doc-pill">{resolveDocumentBadge(document)}</div>
                  <span className="sheet__context-chip">{normalizeDocType(document)}</span>
                </div>
                <h2>{document.title}</h2>
                <p>
                  {document.subject ? `${document.subject} · ${document.category}` : document.category}
                </p>
              </div>
              <button type="button" className="icon-button" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <div ref={contentRef} className="sheet__content">
              <div className="sheet__decision-card">
                <span>Сейчас удобнее всего</span>
                <strong>{canPreview ? 'Открыть файл' : 'Скачать файл'}</strong>
                <small>{decisionLead}</small>
              </div>

              {summary ? (
                <div className="sheet__summary">
                  <span>О работе</span>
                  <p>{summary}</p>
                </div>
              ) : null}

              <div className="sheet__source-row">
                <div className="sheet__source-copy">
                  <span>Откуда документ</span>
                  <strong>Библиотека Салона</strong>
                  <small>
                    {document.subject && document.subject !== categoryMeta
                      ? `Тема «${document.subject}», раздел «${categoryMeta}».`
                      : `Раздел «${categoryMeta}».`}
                  </small>
                </div>
                {onOpenCategory ? (
                  <button
                    type="button"
                    className="sheet__source-link"
                    onClick={() => onOpenCategory(document.category)}
                  >
                    Открыть раздел
                  </button>
                ) : null}
              </div>

              {relatedDocuments.length > 0 && onOpenRelatedDocument ? (
                <div className="sheet__related">
                  <div className="sheet__related-head">
                    <strong>Похожие работы</strong>
                  </div>
                  <div className="sheet__related-list">
                    {relatedDocuments.slice(0, 2).map((item) => (
                      <button
                        key={`${item.file}-${item.title}`}
                        type="button"
                        className="sheet__related-item"
                        onClick={() => onOpenRelatedDocument(item)}
                      >
                        <div className="sheet__related-copy">
                          <strong>{item.title}</strong>
                          <small>
                            {normalizeDocType(item)} · {item.size}
                          </small>
                        </div>
                        <ArrowRight size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="sheet__actions">
              <div className="sheet__primary-stack">
                <button type="button" className="primary-action primary-action--wide" onClick={handleOpenFile}>
                  {canPreview ? <Eye size={18} /> : <Download size={18} />}
                  <span>{fileActionLabel}</span>
                </button>
                <p className="sheet__file-note">{fileActionNote}</p>
              </div>
              <div className="sheet__utility-grid">
                <button
                  type="button"
                  className={
                    isFavorite
                      ? 'secondary-action secondary-action--icon secondary-action--active'
                      : 'secondary-action secondary-action--icon'
                  }
                  onClick={() => onToggleFavorite(document)}
                >
                  <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
                  <span>{isFavorite ? 'Сохранено' : 'Сохранить'}</span>
                </button>
                <button
                  type="button"
                  className={
                    shareReady
                      ? 'secondary-action secondary-action--icon secondary-action--active'
                      : 'secondary-action secondary-action--icon'
                  }
                  onClick={handleShare}
                >
                  <Link2 size={18} />
                  <span>{shareLabel}</span>
                </button>
              </div>
              <div className="sheet__secondary-grid">
                <button type="button" className="secondary-action" onClick={() => onOrderByDoc(document)}>
                  <ArrowUpRight size={18} />
                  <span>{canPreview ? 'Заказать по теме' : 'Заказать похожую'}</span>
                </button>
              </div>
              {isFavorite && onOpenFavorites ? (
                <div className="sheet__saved-row">
                  <span>Работа уже в избранном.</span>
                  <button type="button" className="sheet__saved-link" onClick={onOpenFavorites}>
                    В избранное
                  </button>
                </div>
              ) : null}
            </div>
          </motion.section>
        </>
      ) : null}
    </AnimatePresence>
  )
}
