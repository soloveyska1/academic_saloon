type RouteSkeletonVariant = 'catalog' | 'categories' | 'favorites' | 'order' | 'support'

interface RouteTransitionSkeletonProps {
  pathname: string
}

function resolveVariant(pathname: string): RouteSkeletonVariant {
  if (pathname.startsWith('/categories')) return 'categories'
  if (pathname.startsWith('/favorites')) return 'favorites'
  if (pathname.startsWith('/order')) return 'order'
  if (pathname.startsWith('/support')) return 'support'
  return 'catalog'
}

function CatalogSkeleton() {
  return (
    <>
      <section className="route-skeleton__header route-skeleton__section">
        <div className="route-skeleton__line route-skeleton__line--eyebrow" />
        <div className="route-skeleton__line route-skeleton__line--title" />
        <div className="route-skeleton__line route-skeleton__line--body route-skeleton__line--wide" />
        <div className="route-skeleton__search" />
      </section>
      <section className="route-skeleton__command-grid route-skeleton__section">
        <div className="route-skeleton__card route-skeleton__card--hero" />
        <div className="route-skeleton__card" />
        <div className="route-skeleton__card" />
      </section>
      <section className="route-skeleton__list route-skeleton__section">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="route-skeleton__doc" key={index}>
            <div className="route-skeleton__doc-icon" />
            <div className="route-skeleton__doc-copy">
              <div className="route-skeleton__line route-skeleton__line--doc-tag" />
              <div className="route-skeleton__line route-skeleton__line--doc-title" />
              <div className="route-skeleton__line route-skeleton__line--doc-meta" />
            </div>
            <div className="route-skeleton__doc-action" />
          </div>
        ))}
      </section>
    </>
  )
}

function CategoriesSkeleton() {
  return (
    <>
      <section className="route-skeleton__header route-skeleton__section">
        <div className="route-skeleton__line route-skeleton__line--eyebrow" />
        <div className="route-skeleton__line route-skeleton__line--title route-skeleton__line--medium" />
        <div className="route-skeleton__line route-skeleton__line--body" />
      </section>
      <section className="route-skeleton__split route-skeleton__section">
        <div className="route-skeleton__card route-skeleton__card--feature" />
        <div className="route-skeleton__card route-skeleton__card--feature" />
      </section>
      <section className="route-skeleton__list route-skeleton__section">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="route-skeleton__category" key={index}>
            <div className="route-skeleton__category-index" />
            <div className="route-skeleton__category-copy">
              <div className="route-skeleton__line route-skeleton__line--category-title" />
              <div className="route-skeleton__line route-skeleton__line--category-meta" />
            </div>
            <div className="route-skeleton__category-chip" />
          </div>
        ))}
      </section>
    </>
  )
}

function FavoritesSkeleton() {
  return (
    <>
      <section className="route-skeleton__header route-skeleton__section">
        <div className="route-skeleton__line route-skeleton__line--eyebrow" />
        <div className="route-skeleton__line route-skeleton__line--title route-skeleton__line--medium" />
        <div className="route-skeleton__line route-skeleton__line--body" />
      </section>
      <section className="route-skeleton__focus-card route-skeleton__section">
        <div className="route-skeleton__line route-skeleton__line--eyebrow route-skeleton__line--short" />
        <div className="route-skeleton__line route-skeleton__line--title route-skeleton__line--medium" />
        <div className="route-skeleton__line route-skeleton__line--body route-skeleton__line--wide" />
        <div className="route-skeleton__pill-row">
          <div className="route-skeleton__pill" />
          <div className="route-skeleton__pill" />
          <div className="route-skeleton__pill route-skeleton__pill--short" />
        </div>
      </section>
      <section className="route-skeleton__list route-skeleton__section">
        {Array.from({ length: 2 }).map((_, index) => (
          <div className="route-skeleton__doc" key={index}>
            <div className="route-skeleton__doc-icon" />
            <div className="route-skeleton__doc-copy">
              <div className="route-skeleton__line route-skeleton__line--doc-tag" />
              <div className="route-skeleton__line route-skeleton__line--doc-title" />
              <div className="route-skeleton__line route-skeleton__line--doc-meta" />
            </div>
            <div className="route-skeleton__doc-action" />
          </div>
        ))}
      </section>
    </>
  )
}

function OrderSkeleton() {
  return (
    <>
      <section className="route-skeleton__header route-skeleton__section">
        <div className="route-skeleton__line route-skeleton__line--eyebrow" />
        <div className="route-skeleton__line route-skeleton__line--title route-skeleton__line--medium" />
        <div className="route-skeleton__line route-skeleton__line--body route-skeleton__line--wide" />
      </section>
      <section className="route-skeleton__price-card route-skeleton__section">
        <div className="route-skeleton__line route-skeleton__line--eyebrow route-skeleton__line--short" />
        <div className="route-skeleton__line route-skeleton__line--price" />
        <div className="route-skeleton__fact-grid">
          <div className="route-skeleton__fact" />
          <div className="route-skeleton__fact" />
          <div className="route-skeleton__fact" />
          <div className="route-skeleton__fact" />
        </div>
      </section>
      <section className="route-skeleton__form-stack route-skeleton__section">
        <div className="route-skeleton__form-card route-skeleton__form-card--tall" />
        <div className="route-skeleton__form-card" />
        <div className="route-skeleton__form-card route-skeleton__form-card--wide" />
      </section>
    </>
  )
}

function SupportSkeleton() {
  return (
    <>
      <section className="route-skeleton__header route-skeleton__section">
        <div className="route-skeleton__line route-skeleton__line--eyebrow" />
        <div className="route-skeleton__line route-skeleton__line--title route-skeleton__line--medium" />
        <div className="route-skeleton__line route-skeleton__line--body route-skeleton__line--wide" />
      </section>
      <section className="route-skeleton__support-hero route-skeleton__section">
        <div className="route-skeleton__line route-skeleton__line--title route-skeleton__line--medium" />
        <div className="route-skeleton__line route-skeleton__line--body route-skeleton__line--wide" />
        <div className="route-skeleton__pill-row">
          <div className="route-skeleton__pill" />
          <div className="route-skeleton__pill route-skeleton__pill--short" />
        </div>
      </section>
      <section className="route-skeleton__support-grid route-skeleton__section">
        <div className="route-skeleton__support-card" />
        <div className="route-skeleton__support-card" />
        <div className="route-skeleton__support-card route-skeleton__support-card--wide" />
      </section>
    </>
  )
}

export function RouteTransitionSkeleton({ pathname }: RouteTransitionSkeletonProps) {
  const variant = resolveVariant(pathname)

  return (
    <div className={`route-skeleton route-skeleton--${variant}`} aria-hidden="true">
      <div className="route-skeleton__ambience">
        <span className="route-skeleton__ambient route-skeleton__ambient--primary" />
        <span className="route-skeleton__ambient route-skeleton__ambient--secondary" />
        <span className="route-skeleton__ambient route-skeleton__ambient--beam" />
      </div>
      <div className="route-skeleton__surface">
        <div className="route-skeleton__chrome">
          <span className="route-skeleton__chrome-dot" />
          <div className="route-skeleton__chrome-lines">
            <span />
            <span />
          </div>
        </div>
        {variant === 'catalog' ? <CatalogSkeleton /> : null}
        {variant === 'categories' ? <CategoriesSkeleton /> : null}
        {variant === 'favorites' ? <FavoritesSkeleton /> : null}
        {variant === 'order' ? <OrderSkeleton /> : null}
        {variant === 'support' ? <SupportSkeleton /> : null}
      </div>
    </div>
  )
}
