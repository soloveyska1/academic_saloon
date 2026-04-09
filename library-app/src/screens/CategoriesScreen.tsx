import { ArrowRight, LayoutGrid } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CatalogDocument, groupedCategoryStats } from '../lib/catalog'
import { formatRussianCount } from '../lib/russian'

interface CategoriesScreenProps {
  documents: CatalogDocument[]
  isLoading: boolean
}

export function CategoriesScreen({ documents, isLoading }: CategoriesScreenProps) {
  const navigate = useNavigate()
  const categories = groupedCategoryStats(documents)
  const leadCategory = categories[0]
  const listCategories = leadCategory ? categories.slice(1) : categories

  const openCategory = (category: string) => {
    navigate(`/?category=${encodeURIComponent(category)}`)
  }

  return (
    <section className="screen screen--categories">
      <header className="screen-header">
        <div className="eyebrow">
          <span className="eyebrow__dot" />
          <span>По темам</span>
        </div>
        <h1>Разделы</h1>
        <p>Выбери нужную тему.</p>
        <div className="screen-header__meta">
          {documents.length
            ? `${formatRussianCount(documents.length, ['работа', 'работы', 'работ'])} · ${formatRussianCount(categories.length, ['раздел', 'раздела', 'разделов'])}`
            : isLoading
              ? 'Загружаем разделы'
              : 'Разделы скоро появятся'}
        </div>
      </header>

      {leadCategory ? (
        <section className="categories-showcase">
          <button
            type="button"
            className="categories-lead-card"
            onClick={() => openCategory(leadCategory.category)}
          >
            <div className="categories-lead-card__top">
              <span className="categories-lead-card__eyebrow">Главный раздел</span>
              <span className="categories-lead-card__count">
                {formatRussianCount(leadCategory.count, ['работа', 'работы', 'работ'])}
              </span>
            </div>
            <strong>{leadCategory.category}</strong>
            <p>{formatRussianCount(leadCategory.subjects, ['дисциплина', 'дисциплины', 'дисциплин'])}</p>
            <div className="categories-lead-card__footer">
              <span>Открыть раздел</span>
              <ArrowRight size={16} />
            </div>
          </button>

        </section>
      ) : null}

      {listCategories.length ? (
        <section className="categories-list-section">
          <div className="categories-list-head">
            <div className="section-kicker">
              <LayoutGrid size={15} />
              <span>Все разделы</span>
            </div>
            <span className="categories-list-head__count">
              {formatRussianCount(listCategories.length, ['раздел', 'раздела', 'разделов'])}
            </span>
          </div>
          <div className="category-stack category-stack--refined">
            {listCategories.map((item) => (
              <button
                type="button"
                key={item.category}
                className="category-row category-row--plain category-row--refined"
                onClick={() => openCategory(item.category)}
              >
                <div className="category-row__copy">
                  <strong>{item.category}</strong>
                  <div className="category-row__meta">
                    <span>{formatRussianCount(item.subjects, ['дисциплина', 'дисциплины', 'дисциплин'])}</span>
                  </div>
                </div>
                <div className="category-row__tail">
                  <strong className="category-row__count">{item.count}</strong>
                  <span className="category-row__count-label">в разделе</span>
                  <ArrowRight size={16} />
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!categories.length && isLoading ? (
        <div className="category-stack">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="category-row category-row--plain category-row--skeleton">
              <div className="category-row__copy">
                <span />
                <span />
              </div>
            </div>
          ))}
        </div>
      ) : !categories.length ? (
        <div className="panel panel--empty">
          Разделы появятся после загрузки каталога.
        </div>
      ) : null}
    </section>
  )
}
