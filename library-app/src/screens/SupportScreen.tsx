import { useState } from 'react'
import {
  ArrowUpRight,
  ChevronDown,
  HelpCircle,
} from 'lucide-react'
import {
  getSupportLink,
  SITE_SUPPORT,
  SUPPORT_FAQ_ITEMS,
  SupportLink,
} from '../lib/support'

function SupportPrimaryLink({
  item,
  title,
  body,
  action,
}: {
  item: SupportLink
  title: string
  body: string
  action: string
}) {
  return (
    <a
      className={`support-primary-link support-primary-link--${item.tone}`}
      href={item.href}
      target="_blank"
      rel="noreferrer"
    >
      <div className="support-primary-link__head">
        <div className="support-primary-link__identity">
          <span className="support-primary-link__badge">{item.badge}</span>
          <strong>{title}</strong>
        </div>
        <span className="support-primary-link__action">{action}</span>
      </div>
      <p>{body}</p>
      <small className="support-primary-link__meta-line">{item.meta}</small>
    </a>
  )
}

function SupportMiniLink({
  item,
  title,
  body,
}: {
  item: SupportLink
  title: string
  body: string
}) {
  return (
    <a className={`support-mini-link support-mini-link--${item.tone}`} href={item.href} target="_blank" rel="noreferrer">
      <span className="support-mini-link__badge">{item.badge}</span>
      <div className="support-mini-link__copy">
        <strong>{title}</strong>
        <small>{body}</small>
      </div>
      <ArrowUpRight size={14} />
    </a>
  )
}

export function SupportScreen() {
  const [openFaqKey, setOpenFaqKey] = useState<string | null>(null)
  const personalVk = getSupportLink('owner-vk')
  const maxSalon = getSupportLink('max-salon')
  const telegramManager = getSupportLink('manager-telegram')
  const telegramBot = getSupportLink('telegram-bot')
  const emailSupport = getSupportLink('email')
  const legalSupport = getSupportLink('legal')

  const primaryChannels = [
    {
      item: personalVk,
      title: 'Личный VK',
      body: 'Тема и обсуждение работы.',
      action: 'Написать',
    },
    {
      item: maxSalon,
      title: 'MAX',
      body: 'Файлы и переписка.',
      action: 'Открыть',
    },
  ]

  const utilityChannels = [
    {
      item: telegramManager,
      title: 'Telegram',
      body: 'Личный чат',
    },
    {
      item: telegramBot,
      title: 'Бот',
      body: 'Новая заявка',
    },
    {
      item: emailSupport,
      title: 'Почта',
      body: 'Файлы',
    },
    {
      item: legalSupport,
      title: 'Документы',
      body: 'Условия сервиса',
    },
  ]

  const faqItems = SUPPORT_FAQ_ITEMS.filter((item) => item.key !== 'find-faster')

  function handleToggleFaq(key: string) {
    setOpenFaqKey((current) => (current === key ? null : key))
  }

  return (
    <section className="screen screen--support">
      <header className="screen-header">
        <div className="eyebrow">
          <span className="eyebrow__dot" />
          <span>Связь</span>
        </div>
        <h1>Связь</h1>
        <p>Основные контакты и документы.</p>
      </header>

      <section className="support-hub">
        <div className="support-primary-grid">
          {primaryChannels.map((channel) => (
            <SupportPrimaryLink
              key={channel.item.key}
              item={channel.item}
              title={channel.title}
              body={channel.body}
              action={channel.action}
            />
          ))}
        </div>

        <div className="support-utility">
          <div className="support-utility__head">
            <strong>Дополнительно</strong>
          </div>
          <div className="support-mini-grid">
            {utilityChannels.map((channel) => (
              <SupportMiniLink
                key={channel.item.key}
                item={channel.item}
                title={channel.title}
                body={channel.body}
              />
            ))}
          </div>
        </div>
        <div className="support-hub__foot">
          <a className="support-hub__foot-link" href={SITE_SUPPORT.href} target="_blank" rel="noreferrer">
            <span>Открыть сайт</span>
            <ArrowUpRight size={15} />
          </a>
          <small className="support-hub__foot-note">Полную версию удобнее открывать с ноутбука.</small>
        </div>
      </section>

      <section className="support-faq-panel">
        <div className="support-faq-panel__head">
          <div className="section-kicker">
            <HelpCircle size={15} />
            <span>Частые вопросы</span>
          </div>
          <p>Коротко о заказе и файлах.</p>
        </div>
        <div className="support-faq support-faq--compact">
          {faqItems.map((item) => {
            const isOpen = openFaqKey === item.key

            return (
              <article
                key={item.key}
                className={isOpen ? 'support-faq__item support-faq__item--open' : 'support-faq__item'}
              >
                <button
                  type="button"
                  className="support-faq__trigger"
                  aria-expanded={isOpen}
                  onClick={() => handleToggleFaq(item.key)}
                >
                  <span className="support-faq__question">{item.question}</span>
                  <span className={isOpen ? 'support-faq__chevron support-faq__chevron--open' : 'support-faq__chevron'}>
                    <ChevronDown size={16} />
                  </span>
                </button>
                {isOpen ? <p className="support-faq__answer">{item.answer}</p> : null}
              </article>
            )
          })}
        </div>
      </section>
    </section>
  )
}
