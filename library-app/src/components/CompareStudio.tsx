import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Scale, Sparkles, Star, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  AppSharePayload,
  CatalogDocument,
  documentKey,
  normalizeDocType,
  resolveCatalogSharePayload,
  resolveDocumentShareToken,
  resolveLibrarySharePayload,
  resolveOrderRoute,
  resolveTopicLabel,
} from '../lib/catalog'
import { formatRussianCount } from '../lib/russian'

interface CompareStudioProps {
  compareDocuments: CatalogDocument[]
  favoriteKeys: string[]
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onClearCompare: () => void
  onToggleCompare: (doc: CatalogDocument) => void
  onToggleFavorite: (doc: CatalogDocument) => void
  onSharePayload: (payload: AppSharePayload) => void
}

export function CompareStudio({
  compareDocuments,
  favoriteKeys,
  isOpen,
  onOpen,
  onClose,
  onClearCompare,
  onToggleCompare,
  onToggleFavorite,
  onSharePayload,
}: CompareStudioProps) {
  const navigate = useNavigate()

  const compareSummary = useMemo(() => {
    if (!compareDocuments.length) return null

    const primaryDoc = compareDocuments[0]
    const topCategory = Array.from(
      compareDocuments.reduce<Map<string, number>>((acc, doc) => {
        acc.set(doc.category, (acc.get(doc.category) ?? 0) + 1)
        return acc
      }, new Map()),
    )
      .sort((left, right) => right[1] - left[1])[0]

    const topTopic = Array.from(
      compareDocuments.reduce<Map<string, number>>((acc, doc) => {
        const label = resolveTopicLabel(doc)
        acc.set(label, (acc.get(label) ?? 0) + 1)
        return acc
      }, new Map()),
    )
      .sort((left, right) => right[1] - left[1])[0]

    const topFormat = Array.from(
      compareDocuments.reduce<Map<string, number>>((acc, doc) => {
        const label = normalizeDocType(doc)
        acc.set(label, (acc.get(label) ?? 0) + 1)
        return acc
      }, new Map()),
    )
      .sort((left, right) => right[1] - left[1])[0]

    const facts = [
      formatRussianCount(compareDocuments.length, ['пример в сравнении', 'примера в сравнении', 'примеров в сравнении']),
      topFormat ? `${topFormat[0]} · ${formatRussianCount(topFormat[1], ['вариант', 'варианта', 'вариантов'])}` : primaryDoc.size,
      topCategory ? `Раздел: ${topCategory[0]}` : primaryDoc.category,
    ]

    const payload =
      topTopic && topTopic[1] > 1
        ? resolveCatalogSharePayload({
            query: topTopic[0],
            category: topCategory?.[0],
            count: compareDocuments.length,
          })
        : topCategory
          ? resolveCatalogSharePayload({
              category: topCategory[0],
              count: topCategory[1],
            })
          : resolveLibrarySharePayload()

    return {
      primaryDoc,
      title:
        topTopic && topTopic[1] > 1
          ? `Сравнение по теме «${topTopic[0]}»`
          : `Сравнение ${formatRussianCount(compareDocuments.length, ['примера', 'примеров', 'примеров'])}`,
      description:
        'Собери рядом несколько сильных вариантов, быстро выбери лучший и уже потом открывай файл, сохраняй или отправляй подборку дальше.',
      facts,
      payload,
    }
  }, [compareDocuments])

  if (!compareSummary) return null

  return (
    <>
      <AnimatePresence>
        {!isOpen ? (
          <motion.div
            className="compare-dock"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <button type="button" className="compare-dock__main" onClick={onOpen}>
              <div className="compare-dock__icon">
                <Scale size={17} />
              </div>
              <div className="compare-dock__copy">
                <span>Сравнение</span>
                <strong>{formatRussianCount(compareDocuments.length, ['пример готов', 'примера готовы', 'примеров готовы'])}</strong>
                <small>{compareSummary.title}</small>
              </div>
            </button>
            <button type="button" className="compare-dock__clear" onClick={onClearCompare} aria-label="Очистить сравнение">
              <X size={16} />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Закрыть сравнение"
              className="sheet-backdrop"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.section
              className="compare-sheet"
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
              <div className="compare-sheet__header">
                <div className="compare-sheet__copy">
                  <div className="section-kicker section-kicker--compact">
                    <Scale size={14} />
                    <span>Сравнение примеров</span>
                  </div>
                  <strong>{compareSummary.title}</strong>
                  <p>{compareSummary.description}</p>
                  <div className="compare-sheet__facts">
                    {compareSummary.facts.map((fact) => (
                      <span key={fact}>{fact}</span>
                    ))}
                  </div>
                </div>
                <button type="button" className="icon-button" onClick={onClose}>
                  <X size={18} />
                </button>
              </div>

              <div className="compare-sheet__summary">
                <div className="compare-sheet__summary-copy">
                  <span>Сильнее всего сейчас выглядит</span>
                  <strong>{compareSummary.primaryDoc.title}</strong>
                  <small>
                    {compareSummary.primaryDoc.subject || compareSummary.primaryDoc.category} · {normalizeDocType(compareSummary.primaryDoc)} ·{' '}
                    {compareSummary.primaryDoc.size}
                  </small>
                </div>
                <div className="compare-sheet__summary-actions">
                  <button
                    type="button"
                    className="primary-action primary-action--wide"
                    onClick={() => {
                      onClose()
                      navigate(`/?share=${encodeURIComponent(resolveDocumentShareToken(compareSummary.primaryDoc))}`)
                    }}
                  >
                    Подробнее
                  </button>
                  <button
                    type="button"
                    className="secondary-action secondary-action--wide"
                    onClick={() => onSharePayload(compareSummary.payload)}
                  >
                    Отправить подборку
                  </button>
                  <button
                    type="button"
                    className="secondary-action secondary-action--wide"
                    onClick={() => {
                      onClose()
                      navigate(resolveOrderRoute(compareSummary.primaryDoc))
                    }}
                  >
                    Заказать по лучшему
                  </button>
                </div>
              </div>

              <div className="compare-sheet__grid">
                {compareDocuments.map((doc) => {
                  const favorite = favoriteKeys.includes(documentKey(doc))
                  return (
                    <article key={documentKey(doc)} className="compare-sheet__card">
                      <div className="compare-sheet__card-top">
                        <small>{doc.subject || doc.category}</small>
                        <span>{normalizeDocType(doc)}</span>
                      </div>
                      <strong>{doc.title}</strong>
                      <p>
                        {doc.category} · {doc.size}
                      </p>
                      <div className="compare-sheet__card-actions">
                        <button
                          type="button"
                          className="secondary-action secondary-action--wide"
                          onClick={() => {
                            onClose()
                            navigate(`/?share=${encodeURIComponent(resolveDocumentShareToken(doc))}`)
                          }}
                        >
                          Открыть
                        </button>
                        <button
                          type="button"
                          className={favorite ? 'secondary-action secondary-action--active' : 'secondary-action'}
                          onClick={() => onToggleFavorite(doc)}
                        >
                          <Star size={16} fill={favorite ? 'currentColor' : 'none'} />
                          <span>{favorite ? 'Сохранено' : 'Сохранить'}</span>
                        </button>
                        <button type="button" className="secondary-action" onClick={() => onToggleCompare(doc)}>
                          <Trash2 size={16} />
                          <span>Убрать</span>
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className="compare-sheet__footer">
                <div className="compare-sheet__footer-copy">
                  <Sparkles size={15} />
                  <span>Собери 2–4 сильных варианта, сравни и оставь только лучшие.</span>
                </div>
                <button type="button" className="compare-sheet__clear" onClick={onClearCompare}>
                  Очистить всё
                </button>
              </div>
            </motion.section>
          </>
        ) : null}
      </AnimatePresence>
    </>
  )
}
