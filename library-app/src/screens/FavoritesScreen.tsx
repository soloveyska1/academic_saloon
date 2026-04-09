import { useMemo, useState } from 'react'
import { Clock3, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  CatalogDocument,
  documentKey,
  normalizeDocType,
  resolveDocumentBadge,
  resolveOrderRoute,
} from '../lib/catalog'
import { DocumentSheet } from '../components/DocumentSheet'
import { formatRussianCount } from '../lib/russian'

interface FavoritesScreenProps {
  documents: CatalogDocument[]
  favoriteKeys: string[]
  recentDocuments: CatalogDocument[]
  isLoading: boolean
  onClearRecent: () => void
  onOpenDocument: (doc: CatalogDocument) => void
  onToggleFavorite: (doc: CatalogDocument) => void
}

export function FavoritesScreen({
  documents,
  favoriteKeys,
  recentDocuments,
  isLoading,
  onClearRecent,
  onOpenDocument,
  onToggleFavorite,
}: FavoritesScreenProps) {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<CatalogDocument | null>(null)
  const recentIndex = useMemo(
    () => new Map(recentDocuments.map((doc, index) => [documentKey(doc), index])),
    [recentDocuments],
  )
  const favorites = useMemo(
    () => documents.filter((doc) => favoriteKeys.includes(documentKey(doc))),
    [documents, favoriteKeys],
  )
  const isResolvingFavorites = isLoading && favoriteKeys.length > 0 && !favorites.length
  const primaryFavorite = useMemo(
    () =>
      recentDocuments.find((doc) => favoriteKeys.includes(documentKey(doc))) ??
      favorites[0] ??
      null,
    [favoriteKeys, favorites, recentDocuments],
  )
  const workingSet = useMemo(() => {
    const primaryKey = primaryFavorite ? documentKey(primaryFavorite) : null
    return favorites
      .filter((doc) => documentKey(doc) !== primaryKey)
      .sort((left, right) => {
        const leftRank = recentIndex.get(documentKey(left)) ?? Number.POSITIVE_INFINITY
        const rightRank = recentIndex.get(documentKey(right)) ?? Number.POSITIVE_INFINITY
        if (leftRank !== rightRank) return leftRank - rightRank
        return left.title.localeCompare(right.title, 'ru')
      })
  }, [favorites, primaryFavorite, recentIndex])
  const relatedDocuments = useMemo(() => {
    if (!selected) return []
    const selectedKey = documentKey(selected)
    return documents
      .filter((doc) => documentKey(doc) !== selectedKey)
      .sort((left, right) => {
        const leftScore =
          (left.subject && selected.subject && left.subject === selected.subject ? 2 : 0) +
          (left.category === selected.category ? 1 : 0)
        const rightScore =
          (right.subject && selected.subject && right.subject === selected.subject ? 2 : 0) +
          (right.category === selected.category ? 1 : 0)
        return rightScore - leftScore
      })
      .filter((doc) =>
        selected.subject
          ? doc.subject === selected.subject || doc.category === selected.category
          : doc.category === selected.category,
      )
      .slice(0, 3)
  }, [documents, selected])
  function openDocument(doc: CatalogDocument) {
    onOpenDocument(doc)
    setSelected(doc)
  }

  return (
    <>
      <section className="screen screen--favorites">
        <header className="screen-header">
          <div className="eyebrow">
            <span className="eyebrow__dot" />
            <span>Сохранённое</span>
          </div>
          <h1>Избранное</h1>
          <p>Сохранённые работы.</p>
          {favoriteKeys.length ? (
            <div className="screen-header__meta">
              Сохранено {formatRussianCount(favoriteKeys.length, ['работа', 'работы', 'работ'])}
            </div>
          ) : null}
        </header>

        {isResolvingFavorites ? (
          <div className="empty-stack" data-tour="favorites-main">
            <div className="panel panel--result panel--loading">
              Загружаем сохранённые работы.
            </div>
            <div className="list">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="doc-row doc-row--skeleton">
                  <div className="doc-row__icon" />
                  <div className="doc-row__copy">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : favorites.length ? (
          <>
            {primaryFavorite ? (
              <button
                type="button"
                className="favorites-resume recent-card recent-card--resume recent-card--saved"
                data-tour="favorites-main"
                onClick={() => openDocument(primaryFavorite)}
              >
                <div className="recent-card__top">
                  <span className="recent-card__eyebrow">Продолжить</span>
                  <span className="recent-card__action">Открыть</span>
                </div>
                <strong>{primaryFavorite.title}</strong>
                <p>{primaryFavorite.subject || primaryFavorite.category} · {normalizeDocType(primaryFavorite)} · {primaryFavorite.size}</p>
              </button>
            ) : null}

            <div className="list-head list-head--compact">
              <div className="list-head__copy">
                <span>{formatRussianCount(favorites.length, ['сохранённая работа', 'сохранённые работы', 'сохранённых работ'])}</span>
                <strong>Сохранённые работы</strong>
              </div>
              <button type="button" className="list-head__reset" onClick={() => navigate('/')}>
                Каталог
              </button>
            </div>

            <div className="list">
              {(workingSet.length ? workingSet : favorites).map((doc) => (
                <button
                  key={documentKey(doc)}
                  type="button"
                  className="doc-row doc-row--favorite"
                  onClick={() => openDocument(doc)}
                >
                  <div className="doc-row__icon">{resolveDocumentBadge(doc)}</div>
                  <div className="doc-row__copy">
                    <div className="doc-row__kicker">
                      <span>{doc.subject || doc.category}</span>
                    </div>
                    <h3>{doc.title}</h3>
                    <div className="doc-row__details">
                      <span>{normalizeDocType(doc)}</span>
                      <span>{doc.size}</span>
                      {doc.subject && doc.subject !== doc.category ? <span>{doc.category}</span> : null}
                    </div>
                  </div>
                  <div className="doc-row__aside">
                    <Star size={16} fill="currentColor" />
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div
            className={recentDocuments.length ? 'empty-stack empty-stack--favorites-split' : 'empty-stack'}
            data-tour="favorites-main"
          >
            <section className="favorites-empty-callout">
              <div className="favorites-empty-callout__lead">
                <div className="favorites-empty-callout__icon">
                  <Star size={18} />
                </div>
                <div className="favorites-empty-callout__copy">
                  <div className="doc-pill">Пока пусто</div>
                  <strong>Сохрани нужную работу</strong>
                  <p>Нажми на звезду в каталоге, и материал останется здесь.</p>
                </div>
              </div>
              <div className="favorites-empty-callout__actions">
                <button type="button" className="primary-action" onClick={() => navigate('/')}>
                  Открыть каталог
                </button>
              </div>
            </section>

            {recentDocuments.length ? (
              <section className="recent-section recent-section--favorites">
                <div className="recent-section__head">
                  <div className="section-kicker">
                    <Clock3 size={15} />
                    <span>Недавно смотрели</span>
                  </div>
                  <button type="button" className="recent-section__reset" onClick={onClearRecent}>
                    Очистить
                  </button>
                </div>
                <div className="list">
                  {recentDocuments.slice(0, 1).map((doc) => (
                    <button
                      key={documentKey(doc)}
                      type="button"
                      className="doc-row"
                      onClick={() => openDocument(doc)}
                    >
                      <div className="doc-row__icon">{resolveDocumentBadge(doc)}</div>
                      <div className="doc-row__copy">
                        <div className="doc-row__kicker">
                          <span>{doc.subject || doc.category}</span>
                        </div>
                        <h3>{doc.title}</h3>
                        <div className="doc-row__details">
                          <span>{normalizeDocType(doc)}</span>
                          <span>{doc.size}</span>
                          {doc.subject && doc.subject !== doc.category ? <span>{doc.category}</span> : null}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </section>

      <DocumentSheet
        document={selected}
        isFavorite={selected ? favoriteKeys.includes(documentKey(selected)) : false}
        relatedDocuments={relatedDocuments}
        onClose={() => setSelected(null)}
        onOpenCategory={(category) => {
          setSelected(null)
          window.setTimeout(() => navigate(`/?category=${encodeURIComponent(category)}`), 180)
        }}
        onOpenFavorites={undefined}
        onOpenRelatedDocument={openDocument}
        onToggleFavorite={onToggleFavorite}
        onOrderByDoc={(doc) => navigate(resolveOrderRoute(doc))}
      />
    </>
  )
}
