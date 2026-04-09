import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Trash2,
  X,
} from 'lucide-react'
import { getFriendlyErrorMessage } from '../lib/errors'
import {
  DEADLINE_OPTIONS,
  estimatePrice,
  getWorkTypeMeta,
  ORIGINALITY_OPTIONS,
  recommendWorkType,
  WORK_TYPES,
} from '../lib/order'
import { getSupportLink } from '../lib/support'
import { clearOrderDraft, loadOrderDraft, saveOrderDraft } from '../lib/uiState'

const WORK_TYPE_COPY: Record<string, string> = {
  'Контрольная работа': 'небольшая работа',
  Реферат: 'по теме',
  'Доклад / презентация': 'для выступления',
  Эссе: 'авторский текст',
  'Курсовая работа': 'с анализом',
  'Отчёт по практике': 'по практике',
  'ВКР / Дипломная': 'к защите',
  'Магистерская диссертация': 'к защите',
}

const DEADLINE_COPY: Record<string, string> = {
  '24 часа': 'срочно',
  '3 дня': 'в ближайшие дни',
  '7 дней': 'обычный срок',
  '2 недели': 'можно заранее',
}

const ORIGINALITY_COPY: Record<string, string> = {
  Базовая: 'если без строгой проверки',
  Повышенная: 'стандартный вариант',
  Максимальная: 'если требования высокие',
}

const ORDER_SUCCESS_STEPS = [
  {
    title: 'Уточним тему',
    body: 'Посмотрим требования и формат.',
  },
  {
    title: 'Напишем по контакту',
    body: 'Продолжим диалог там, где тебе удобно.',
  },
  {
    title: 'Согласуем работу',
    body: 'Подтвердим срок, цену и объём.',
  },
]

type OrderExtraKey = 'method-guide' | 'teacher-notes' | 'presentation' | 'plan-first'
type ContactChannelKey = 'vk' | 'max' | 'telegram' | 'phone'
type OrderGoalKey = 'pass' | 'strong' | 'defense'

const ORDER_EXTRA_OPTIONS: Array<{
  key: OrderExtraKey
  label: string
  body: string
}> = [
  {
    key: 'method-guide',
    label: 'Есть методичка',
    body: 'Учтём структуру и оформление.',
  },
  {
    key: 'teacher-notes',
    label: 'Есть замечания преподавателя',
    body: 'Сразу подстроим под правки.',
  },
  {
    key: 'presentation',
    label: 'Нужна презентация',
    body: 'Подготовим слайды к защите.',
  },
  {
    key: 'plan-first',
    label: 'Сначала нужен план',
    body: 'Начнём со структуры и согласования.',
  },
]

const CONTACT_CHANNEL_OPTIONS: Array<{
  key: ContactChannelKey
  label: string
  placeholder: string
  caption: string
}> = [
  {
    key: 'vk',
    label: 'VK',
    placeholder: 'Ссылка на профиль VK или @id',
    caption: 'Переписка и файлы.',
  },
  {
    key: 'max',
    label: 'MAX',
    placeholder: 'Ссылка на MAX или ник',
    caption: 'Если удобнее MAX.',
  },
  {
    key: 'telegram',
    label: 'Telegram',
    placeholder: '@telegram или ссылка на профиль',
    caption: 'Если удобнее Telegram.',
  },
  {
    key: 'phone',
    label: 'Телефон',
    placeholder: '+7 9XX XXX-XX-XX',
    caption: 'Если удобнее номер телефона.',
  },
]

const ORDER_GOAL_OPTIONS: Array<{
  key: OrderGoalKey
  label: string
  body: string
  effect: string
}> = [
  {
    key: 'pass',
    label: 'Базовый вариант',
    body: 'Аккуратно по требованиям.',
    effect: 'Стандартный объём.',
  },
  {
    key: 'strong',
    label: 'Хороший уровень',
    body: 'Сильнее по структуре и содержанию.',
    effect: 'Чище подача.',
  },
  {
    key: 'defense',
    label: 'Для защиты',
    body: 'С акцентом на защиту.',
    effect: 'Добавим опору для выступления.',
  },
]

interface OrderScreenProps {
  isOnline: boolean
}

type OrderFieldName = 'topic' | 'contact'

interface OrderSuccessState {
  workType: string
  deadline: string
  originality: string
  price: number
  pages: number
  topic: string
  contact: string
}

const ORDER_FIELD_ERROR_COPY: Record<OrderFieldName, string> = {
  topic: 'Напиши тему или кратко опиши задачу.',
  contact: 'Оставь контакт, чтобы мы могли написать.',
}

const DEFAULT_DEADLINE = DEADLINE_OPTIONS[2].value
const DEFAULT_ORIGINALITY = ORIGINALITY_OPTIONS[1].value

export function OrderScreen({ isOnline }: OrderScreenProps) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const draft = useMemo(() => loadOrderDraft(), [])
  const sampleTitle = params.get('sampleTitle') ?? ''
  const sampleSubject = params.get('subject') ?? ''
  const sampleCategory = params.get('category') ?? ''
  const sampleType = params.get('sampleType') ?? ''
  const sampleToken = params.get('sample') ?? ''
  const topicParam = params.get('topic') ?? ''
  const hasSampleContext = Boolean(sampleTitle || sampleToken || sampleSubject || sampleCategory || sampleType)
  const recommendedWorkType = useMemo(() => recommendWorkType(sampleType), [sampleType])
  const recommendedWorkMeta = useMemo(() => getWorkTypeMeta(recommendedWorkType), [recommendedWorkType])
  const defaultGoal: OrderGoalKey =
    sampleType.toLowerCase().includes('презент') || recommendedWorkType === 'ВКР / Дипломная' || recommendedWorkType === 'Магистерская диссертация'
      ? 'defense'
      : hasSampleContext
      ? 'strong'
      : 'pass'
  const personalVk = useMemo(() => getSupportLink('owner-vk'), [])
  const maxSalon = useMemo(() => getSupportLink('max-salon'), [])

  const [workType, setWorkType] = useState<string>(draft?.workType ?? recommendedWorkType)
  const [deadline, setDeadline] = useState<string>(draft?.deadline ?? DEFAULT_DEADLINE)
  const [originality, setOriginality] = useState<string>(draft?.originality ?? DEFAULT_ORIGINALITY)
  const [pages, setPages] = useState<number>(draft?.pages ?? recommendedWorkMeta.suggestedPages)
  const [topic, setTopic] = useState<string>(topicParam || draft?.topic || '')
  const [contact, setContact] = useState(draft?.contact ?? '')
  const [contactChannel, setContactChannel] = useState<ContactChannelKey>(
    (draft?.contactChannel as ContactChannelKey | undefined) ?? 'vk',
  )
  const [goal, setGoal] = useState<OrderGoalKey>(defaultGoal)
  const [notes, setNotes] = useState(draft?.notes ?? '')
  const [extras, setExtras] = useState<OrderExtraKey[]>(
    Array.isArray(draft?.extras) ? draft.extras.filter(Boolean) as OrderExtraKey[] : [],
  )
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<number | null>(draft?.updatedAt ?? null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<OrderFieldName, string>>>({})
  const [successState, setSuccessState] = useState<OrderSuccessState | null>(null)
  const [settingsExpanded, setSettingsExpanded] = useState(
    () =>
      Boolean(
        (draft?.workType && draft.workType !== recommendedWorkType) ||
          (draft?.deadline && draft.deadline !== DEFAULT_DEADLINE) ||
          (draft?.originality && draft.originality !== DEFAULT_ORIGINALITY) ||
          (draft?.pages && draft.pages !== recommendedWorkMeta.suggestedPages),
      ),
  )
  const [detailsExpanded, setDetailsExpanded] = useState(
    () => Boolean(draft?.notes?.trim() || (Array.isArray(draft?.extras) && draft.extras.length)),
  )
  const topicRef = useRef<HTMLTextAreaElement | null>(null)
  const contactRef = useRef<HTMLInputElement | null>(null)

  const price = useMemo(
    () => estimatePrice(workType, pages, deadline, originality),
    [workType, pages, deadline, originality],
  )
  const selectedWorkType = useMemo(() => getWorkTypeMeta(workType), [workType])
  const selectedContactChannel = useMemo(
    () => CONTACT_CHANNEL_OPTIONS.find((item) => item.key === contactChannel) ?? CONTACT_CHANNEL_OPTIONS[0],
    [contactChannel],
  )
  const selectedGoal = useMemo(
    () => ORDER_GOAL_OPTIONS.find((item) => item.key === goal) ?? ORDER_GOAL_OPTIONS[1],
    [goal],
  )
  const selectedExtraOptions = useMemo(
    () => ORDER_EXTRA_OPTIONS.filter((item) => extras.includes(item.key)),
    [extras],
  )
  const contextMeta = [sampleType, sampleSubject, sampleCategory].filter(Boolean).join(' · ')
  const hasCustomSettings =
    workType !== recommendedWorkType ||
    deadline !== DEFAULT_DEADLINE ||
    originality !== DEFAULT_ORIGINALITY ||
    pages !== recommendedWorkMeta.suggestedPages
  const hasAdditionalDetails = Boolean(notes.trim() || extras.length)
  const isPristineDraft =
    workType === recommendedWorkType &&
    deadline === DEFAULT_DEADLINE &&
    originality === DEFAULT_ORIGINALITY &&
    pages === recommendedWorkMeta.suggestedPages &&
    !topic.trim() &&
    !contact.trim() &&
    contactChannel === 'vk' &&
    !notes.trim()
    && extras.length === 0

  useEffect(() => {
    setTopic(topicParam || (draft?.sampleToken === sampleToken ? draft.topic : topicParam))
    setWorkType(recommendedWorkType)
    setPages(draft?.sampleToken === sampleToken && draft?.pages ? draft.pages : recommendedWorkMeta.suggestedPages)
    setContactChannel((draft?.contactChannel as ContactChannelKey | undefined) ?? 'vk')
    setDeadline(draft?.sampleToken === sampleToken && draft?.deadline ? draft.deadline : DEFAULT_DEADLINE)
    setOriginality(
      draft?.sampleToken === sampleToken && draft?.originality ? draft.originality : DEFAULT_ORIGINALITY,
    )
    setGoal(defaultGoal)
    setExtras(draft?.sampleToken === sampleToken && Array.isArray(draft?.extras) ? (draft.extras as OrderExtraKey[]) : [])
    setSettingsExpanded(
      Boolean(
        draft?.sampleToken === sampleToken &&
          ((draft?.workType && draft.workType !== recommendedWorkType) ||
            (draft?.deadline && draft.deadline !== DEFAULT_DEADLINE) ||
            (draft?.originality && draft.originality !== DEFAULT_ORIGINALITY) ||
            (draft?.pages && draft.pages !== recommendedWorkMeta.suggestedPages)),
      ),
    )
    setDetailsExpanded(
      Boolean(
        draft?.sampleToken === sampleToken &&
          (draft?.notes?.trim() || (Array.isArray(draft?.extras) && draft.extras.length)),
      ),
    )
    setResult(null)
  }, [
    draft?.deadline,
    draft?.contactChannel,
    draft?.extras,
    draft?.originality,
    draft?.pages,
    draft?.sampleToken,
    draft?.topic,
    draft?.workType,
    recommendedWorkMeta.suggestedPages,
    recommendedWorkType,
    sampleToken,
    topicParam,
    defaultGoal,
    DEFAULT_DEADLINE,
    DEFAULT_ORIGINALITY,
  ])

  useEffect(() => {
    setPages((current) => Math.min(selectedWorkType.pageMax, Math.max(selectedWorkType.pageMin, current)))
  }, [selectedWorkType.pageMax, selectedWorkType.pageMin])

  useEffect(() => {
    if (!successState) {
      document.body.classList.remove('has-overlay')
      return
    }

    document.body.classList.add('has-overlay')
    return () => document.body.classList.remove('has-overlay')
  }, [successState])

  useEffect(() => {
    if (isPristineDraft) {
      clearOrderDraft()
      setDraftUpdatedAt(null)
      return
    }

    const updatedAt = saveOrderDraft({
      workType,
      deadline,
      originality,
      pages,
      topic,
      contact,
      contactChannel,
      goal,
      notes,
      extras,
      sampleToken,
    })

    if (updatedAt) {
      setDraftUpdatedAt(updatedAt)
    }
  }, [contact, contactChannel, deadline, extras, goal, isPristineDraft, notes, originality, pages, sampleToken, topic, workType])

  function resetDraft() {
    clearOrderDraft()
    setDraftUpdatedAt(null)
    setFieldErrors({})
    setWorkType(recommendedWorkType)
    setDeadline(DEFAULT_DEADLINE)
    setOriginality(DEFAULT_ORIGINALITY)
    setPages(recommendedWorkMeta.suggestedPages)
    setTopic(topicParam)
    setContact('')
    setContactChannel('vk')
    setGoal(defaultGoal)
    setNotes('')
    setExtras([])
    setSettingsExpanded(false)
    setDetailsExpanded(false)
    setResult(null)
  }

  function closeSuccessState() {
    setSuccessState(null)
  }

  function setFieldError(field: OrderFieldName, error?: string) {
    setFieldErrors((current) => {
      if (!error) {
        if (!current[field]) {
          return current
        }

        const nextErrors = { ...current }
        delete nextErrors[field]
        return nextErrors
      }

      if (current[field] === error) {
        return current
      }

      return { ...current, [field]: error }
    })
  }

  function validateField(field: OrderFieldName, value: string) {
    if (!value.trim()) {
      return ORDER_FIELD_ERROR_COPY[field]
    }

    return ''
  }

  function handleFieldBlur(field: OrderFieldName, value: string) {
    setFieldError(field, validateField(field, value) || undefined)
  }

  function focusField(field: OrderFieldName) {
    const element = field === 'topic' ? topicRef.current : contactRef.current

    if (!element) {
      return
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    element.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'center',
      inline: 'nearest',
    })

    window.setTimeout(() => {
      element.focus({ preventScroll: true })
      if ('selectionStart' in element) {
        const caretPosition = element.value.length
        element.setSelectionRange?.(caretPosition, caretPosition)
      }
    }, prefersReducedMotion ? 0 : 180)
  }

  function validateBeforeSubmit() {
    const nextErrors: Partial<Record<OrderFieldName, string>> = {}

    const topicError = validateField('topic', topic)
    if (topicError) {
      nextErrors.topic = topicError
    }

    const contactError = validateField('contact', contact)
    if (contactError) {
      nextErrors.contact = contactError
    }

    setFieldErrors(nextErrors)

    const firstInvalidField = (['topic', 'contact'] as OrderFieldName[]).find((field) => nextErrors[field])

    if (firstInvalidField) {
      window.requestAnimationFrame(() => focusField(firstInvalidField))
      return false
    }

    return true
  }

  function handleSelectWorkType(nextWorkType: string) {
    const nextMeta = getWorkTypeMeta(nextWorkType)

    setPages((current) => {
      const currentMeta = getWorkTypeMeta(workType)
      if (current === currentMeta.suggestedPages) {
        return nextMeta.suggestedPages
      }

      if (current < nextMeta.pageMin || current > nextMeta.pageMax) {
        return nextMeta.suggestedPages
      }

      return Math.min(nextMeta.pageMax, Math.max(nextMeta.pageMin, current))
    })
    setWorkType(nextWorkType)
  }

  function toggleExtra(nextExtra: OrderExtraKey) {
    setExtras((current) =>
      current.includes(nextExtra) ? current.filter((item) => item !== nextExtra) : [...current, nextExtra],
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!validateBeforeSubmit()) {
      setResult(null)
      return
    }

    if (!isOnline) {
      setResult('Сейчас нет сети. Черновик уже сохранён, а заявку можно будет отправить позже.')
      return
    }
    setSubmitting(true)
    setResult(null)

    try {
      const source = hasSampleContext ? 'library_app_sample' : 'library_app'
      const sourceLabel = hasSampleContext ? 'Приложение БиблиоСалон · по примеру' : 'Приложение БиблиоСалон'
      const response = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workType,
          topic,
          subject: sampleSubject || '',
          deadline,
          contact,
          source,
          sourceLabel,
          sourcePath: `${window.location.pathname}${window.location.search}`,
          entryUrl: window.location.href,
          referrer: document.referrer,
          pageTitle: document.title,
          estimatedPrice: price.total,
          pages,
          originality,
          sampleTitle,
          sampleType,
          sampleSubject,
          sampleCategory,
          comment: [
            `Страницы: ${pages}.`,
            `Уникальность: ${originality}.`,
            `Цель: ${selectedGoal.label}.`,
            `Предпочтительный канал: ${selectedContactChannel.label}.`,
            hasSampleContext
              ? 'Контекст: заявка собирается по примеру из каталога.'
              : deadline === '24 часа'
              ? 'Контекст: срочная заявка.'
              : '',
            selectedExtraOptions.length ? `Дополнительно: ${selectedExtraOptions.map((item) => item.label).join(', ')}.` : '',
            hasSampleContext
              ? `Пример из каталога: ${sampleTitle || topic}.${sampleType ? ` Тип примера: ${sampleType}.` : ''}${sampleSubject ? ` Предмет: ${sampleSubject}.` : ''}${sampleCategory ? ` Раздел: ${sampleCategory}.` : ''}`
              : '',
            notes.trim(),
          ]
            .filter(Boolean)
            .join(' '),
        }),
      })

      if (!response.ok) {
        throw new Error('Не удалось отправить заявку')
      }

      const nextSuccessState: OrderSuccessState = {
        workType,
        deadline,
        originality,
        price: price.total,
        pages,
        topic: topic.trim() || sampleTitle || 'Тема уточняется',
        contact: contact.trim(),
      }

      setFieldErrors({})
      setSuccessState(nextSuccessState)
      setResult('Заявка отправлена. Скоро напишем.')
      clearOrderDraft()
      setDraftUpdatedAt(null)
      setContact('')
      setNotes('')
      navigator.vibrate?.(24)
    } catch (error) {
      setResult(getFriendlyErrorMessage(error, 'Не удалось отправить заявку. Проверь интернет и попробуй ещё раз.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <section className="screen screen--order">
        <header className="screen-header screen-header--order">
          <div className="eyebrow">
            <span className="eyebrow__dot" />
            <span>Помощь с работой</span>
          </div>
          <h1>Заказать работу</h1>
          <p>
            {hasSampleContext
              ? 'Тема и контакт. Остальное можно спокойно уточнить ниже.'
              : 'Тема, контакт и несколько параметров.'}
          </p>
        </header>

        <section className="order-overview" data-tour="order-hero">
          <div className="order-overview__top">
            <div className="order-overview__price">
              <div>
                <span>{hasSampleContext ? 'По примеру' : 'Предварительно'}</span>
                <strong>{price.total.toLocaleString('ru-RU')} ₽</strong>
              </div>
            </div>
            <div className="order-overview__badge">
              {hasSampleContext ? 'Пример' : hasCustomSettings ? 'Настроено' : 'Расчёт'}
            </div>
          </div>
          <p className="order-overview__lead">Итог уточним после темы и требований.</p>
          <div className="order-overview__chips">
            <span>{selectedWorkType.value}</span>
            <span>{deadline}</span>
            <span>{price.pages} стр.</span>
            <span>{originality}</span>
          </div>
          {hasSampleContext ? (
            <div className="order-overview__sample">
              <div className="order-overview__sample-copy">
                <span>Пример</span>
                <strong>{sampleTitle || topic}</strong>
                <small>{contextMeta || sampleType || 'Материал из каталога'}</small>
              </div>
              <div className="order-overview__sample-actions">
                {sampleToken ? (
                  <button
                    type="button"
                    className="secondary-action secondary-action--wide"
                    onClick={() => navigate(`/?share=${encodeURIComponent(sampleToken)}`)}
                  >
                    Открыть пример
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          {(draftUpdatedAt || !isPristineDraft || !isOnline) ? (
            <div className="order-overview__utility">
              {draftUpdatedAt || !isPristineDraft ? (
                <div className="order-overview__utility-item">
                  <div>
                    <span>Черновик</span>
                    <strong>
                      {draftUpdatedAt
                        ? `Сохранён ${new Intl.RelativeTimeFormat('ru', { numeric: 'auto' }).format(
                            -Math.max(1, Math.round((Date.now() - draftUpdatedAt) / 60000)),
                            'minute',
                          )}`
                        : 'Сохраняется на этом устройстве'}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="order-overview__utility-action"
                    onClick={resetDraft}
                    aria-label="Очистить черновик"
                  >
                    <Trash2 size={15} />
                    <span>Очистить</span>
                  </button>
                </div>
              ) : null}
              {!isOnline ? (
                <div className="order-overview__utility-item order-overview__utility-item--offline">
                  <div>
                    <span>Нет сети</span>
                    <strong>Заполни сейчас, отправишь позже.</strong>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <form className="order-form" onSubmit={handleSubmit} noValidate>
          <section className="form-card form-card--priority">
            <div className="form-card__head">
              <div>
                <label htmlFor="topic">Основное</label>
                <small>Тема и способ связи.</small>
              </div>
            </div>
            {hasSampleContext && sampleTitle && !topic.trim() ? (
              <div className="form-card__helper">
                <button
                  type="button"
                  className="secondary-action secondary-action--wide"
                  onClick={() => {
                    setTopic(sampleTitle)
                    setFieldError('topic')
                    window.requestAnimationFrame(() => focusField('topic'))
                  }}
                >
                  Подставить тему из примера
                </button>
              </div>
            ) : null}
            <div className={fieldErrors.topic ? 'field-group order-field-group order-field-group--topic field-group--error' : 'field-group order-field-group order-field-group--topic'}>
              <label htmlFor="topic">Тема</label>
              <textarea
                ref={topicRef}
                id="topic"
                value={topic}
                onChange={(event) => {
                  setTopic(event.target.value)
                  if (fieldErrors.topic) {
                    setFieldError('topic')
                  }
                }}
                onBlur={(event) => handleFieldBlur('topic', event.target.value)}
                placeholder={
                  hasSampleContext
                    ? 'Уточни тему, требования преподавателя или нужный ракурс'
                    : 'Например: социальная адаптация детей-сирот'
                }
                aria-invalid={Boolean(fieldErrors.topic)}
                aria-describedby={fieldErrors.topic ? 'topic-error' : undefined}
                required
                rows={2}
              />
              {fieldErrors.topic ? (
                <small id="topic-error" className="field-group__error" role="alert">
                  {fieldErrors.topic}
                </small>
              ) : null}
            </div>

            <div className={fieldErrors.contact ? 'field-group order-field-group order-field-group--contact field-group--error' : 'field-group order-field-group order-field-group--contact'}>
              <label htmlFor="contact">Контакт</label>
              <input
                ref={contactRef}
                id="contact"
                type={contactChannel === 'phone' ? 'tel' : 'text'}
                value={contact}
                onChange={(event) => {
                  setContact(event.target.value)
                  if (fieldErrors.contact) {
                    setFieldError('contact')
                  }
                }}
                onBlur={(event) => handleFieldBlur('contact', event.target.value)}
                placeholder={selectedContactChannel.placeholder}
                autoComplete={contactChannel === 'phone' ? 'tel' : 'on'}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                inputMode={contactChannel === 'phone' ? 'tel' : undefined}
                enterKeyHint="done"
                aria-invalid={Boolean(fieldErrors.contact)}
                aria-describedby={fieldErrors.contact ? 'contact-error' : undefined}
                required
              />
              {fieldErrors.contact ? (
                <small id="contact-error" className="field-group__error" role="alert">
                  {fieldErrors.contact}
                </small>
              ) : null}
            </div>

            <div className="order-contact-channel order-contact-channel--compact">
              <span>Куда написать</span>
              <div className="order-contact-channel__grid order-contact-channel__grid--compact">
                {CONTACT_CHANNEL_OPTIONS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={
                      item.key === contactChannel
                        ? 'order-contact-chip order-contact-chip--active'
                        : 'order-contact-chip'
                    }
                    onClick={() => setContactChannel(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <small>{selectedContactChannel.caption}</small>
            </div>

            <div className="submit-dock">
              <div className="submit-dock__price">
                <span>Предварительно</span>
                <strong>{price.total.toLocaleString('ru-RU')} ₽</strong>
              </div>
              <div className="submit-dock__summary">
                {!isOnline
                  ? 'Черновик сохранится на устройстве.'
                  : `${deadline} · ${price.pages} стр.`}
              </div>
              <button type="submit" className="primary-action primary-action--wide" disabled={submitting || !isOnline}>
                {!isOnline ? 'Нет сети' : submitting ? 'Отправляем...' : 'Оставить заявку'}
              </button>
            </div>
            {result ? <div className="panel panel--result">{result}</div> : null}
          </section>

          <section className="form-card form-card--compact">
            <div className="order-fold__head">
              <div className="order-fold__copy">
                <span className="order-fold__label">Параметры</span>
                <small>{hasCustomSettings ? 'Изменено вручную' : 'По умолчанию'}</small>
                <div className="order-fold__chips">
                  <span>{selectedWorkType.value}</span>
                  <span>{deadline}</span>
                  <span>{price.pages} стр.</span>
                </div>
              </div>
              <button
                type="button"
                className={settingsExpanded ? 'order-fold__toggle order-fold__toggle--open' : 'order-fold__toggle'}
                aria-expanded={settingsExpanded}
                aria-controls="order-settings-panel"
                onClick={() => setSettingsExpanded((current) => !current)}
              >
                <span>{settingsExpanded ? 'Скрыть' : 'Изменить'}</span>
                <ChevronDown size={16} />
              </button>
            </div>

            <AnimatePresence initial={false}>
              {settingsExpanded ? (
                <motion.div
                  id="order-settings-panel"
                  className="order-fold__body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="form-card__section">
                    <div className="form-card__section-head">
                      <span>Тип работы</span>
                      <strong>{selectedWorkType.value}</strong>
                    </div>
                    <div className="choice-list">
                      {WORK_TYPES.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          className={item.value === workType ? 'choice-row choice-row--active' : 'choice-row'}
                          onClick={() => handleSelectWorkType(item.value)}
                        >
                          <div className="choice-row__copy">
                            <strong>{item.value}</strong>
                            <span>{`${WORK_TYPE_COPY[item.value] ?? 'под твою задачу'} · ${item.pageLabel}`}</span>
                          </div>
                          <div className="choice-row__aside">
                            <small>от</small>
                            <strong>{item.base.toLocaleString('ru-RU')} ₽</strong>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-card__section">
                    <div className="form-card__section-head">
                      <span>Срок</span>
                      <strong>{deadline}</strong>
                    </div>
                    <div className="selection-grid selection-grid--order-choice">
                      {DEADLINE_OPTIONS.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          className={
                            item.value === deadline
                              ? 'selection-card selection-card--choice selection-card--active'
                              : 'selection-card selection-card--choice'
                          }
                          onClick={() => setDeadline(item.value)}
                        >
                          <strong>{item.value}</strong>
                          <span>{DEADLINE_COPY[item.value] ?? 'по удобному сроку'}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-card__section">
                    <div className="form-card__section-head">
                      <span>Проверка</span>
                      <strong>{originality}</strong>
                    </div>
                    <div className="selection-grid selection-grid--order-choice selection-grid--order-choice-wide">
                      {ORIGINALITY_OPTIONS.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          className={
                            item.value === originality
                              ? 'selection-card selection-card--choice selection-card--active'
                              : 'selection-card selection-card--choice'
                          }
                          onClick={() => setOriginality(item.value)}
                        >
                          <strong>{item.value}</strong>
                          <span>{ORIGINALITY_COPY[item.value] ?? 'под обычную проверку'}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-card__section">
                    <div className="form-card__section-head">
                      <span>Объём</span>
                      <strong>{price.pages} стр.</strong>
                    </div>
                    <div className="range-panel">
                      <div className="range-panel__glance">
                        <div>
                          <span>В стартовой цене</span>
                          <strong>{selectedWorkType.includedPages} стр.</strong>
                        </div>
                        <div>
                          <span>После этого</span>
                          <strong>+{selectedWorkType.extraPageRate.toLocaleString('ru-RU')} ₽ / стр.</strong>
                        </div>
                      </div>
                      <input
                        id="pages"
                        type="range"
                        min={selectedWorkType.pageMin}
                        max={selectedWorkType.pageMax}
                        step="1"
                        value={pages}
                        onChange={(event) => setPages(Number(event.target.value))}
                      />
                      <div className="range-meta">
                        <span>{selectedWorkType.pageMin}</span>
                        <strong>{price.pages} стр.</strong>
                        <span>{selectedWorkType.pageMax}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>

          <section className="form-card form-card--compact">
            <div className="order-fold__head">
              <div className="order-fold__copy">
                <span className="order-fold__label">Дополнительно</span>
                <small>
                  {hasAdditionalDetails
                    ? notes.trim()
                      ? 'Есть комментарий.'
                      : 'Есть материалы.'
                    : 'Комментарий и материалы.'}
                </small>
                {selectedExtraOptions.length ? (
                  <div className="order-fold__chips">
                    {selectedExtraOptions.map((item) => (
                      <span key={item.key}>{item.label}</span>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className={detailsExpanded ? 'order-fold__toggle order-fold__toggle--open' : 'order-fold__toggle'}
                aria-expanded={detailsExpanded}
                aria-controls="order-details-panel"
                onClick={() => setDetailsExpanded((current) => !current)}
              >
                <span>{detailsExpanded ? 'Скрыть' : 'Добавить'}</span>
                <ChevronDown size={16} />
              </button>
            </div>

            <AnimatePresence initial={false}>
              {detailsExpanded ? (
                <motion.div
                  id="order-details-panel"
                  className="order-fold__body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="field-group">
                    <label htmlFor="notes">Комментарий</label>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Требования, методичка, вуз, замечания преподавателя"
                      enterKeyHint="done"
                      rows={3}
                    />
                  </div>
                  <div className="form-card__section">
                    <div className="form-card__section-head">
                      <span>Что ещё учесть</span>
                      <strong>По желанию</strong>
                    </div>
                    <div className="selection-grid selection-grid--order-extras">
                      {ORDER_EXTRA_OPTIONS.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          className={
                            extras.includes(item.key)
                              ? 'selection-card selection-card--extra selection-card--active'
                              : 'selection-card selection-card--extra'
                          }
                          onClick={() => toggleExtra(item.key)}
                        >
                          <strong>{item.label}</strong>
                          <span>{item.body}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>

        </form>

        <section className="order-support-inline">
          <div className="order-support-inline__copy">
            <span>Если удобнее</span>
            <strong>Личный VK и MAX</strong>
          </div>
          <div className="order-support-inline__actions">
            <a href={personalVk.href} target="_blank" rel="noreferrer" className="order-support-inline__link">
              Личный VK
            </a>
            <a href={maxSalon.href} target="_blank" rel="noreferrer" className="order-support-inline__link">
              MAX
            </a>
            <button
              type="button"
              className="order-support-inline__link"
              onClick={() => navigate('/support')}
            >
              Все контакты
            </button>
          </div>
        </section>
      </section>

      <AnimatePresence>
        {successState ? (
          <>
            <motion.button
              type="button"
              className="sheet-backdrop order-success-backdrop"
              aria-label="Закрыть подтверждение отправки"
              onClick={closeSuccessState}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.section
              className="order-success-sheet"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            >
              <div className="order-success-sheet__top">
                <div className="order-success-sheet__seal">
                  <CheckCircle2 size={28} strokeWidth={2.3} />
                </div>
                <button
                  type="button"
                  className="icon-button order-success-sheet__close"
                  onClick={closeSuccessState}
                  aria-label="Закрыть подтверждение"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="order-success-sheet__copy">
                <span>Заявка отправлена</span>
                <strong>Запрос получен.</strong>
                <p>
                  Напишем по контакту <b>{successState.contact}</b> и уточним тему, срок и требования.
                </p>
              </div>

              <div className="order-success-sheet__steps">
                {ORDER_SUCCESS_STEPS.map((item, index) => (
                  <div key={item.title}>
                    <span>{index + 1}</span>
                    <strong>{item.title}</strong>
                    <small>{item.body}</small>
                  </div>
                ))}
              </div>

              <div className="order-success-sheet__facts">
                <div>
                  <span>Тип</span>
                  <strong>{successState.workType}</strong>
                </div>
                <div>
                  <span>Срок</span>
                  <strong>{successState.deadline}</strong>
                </div>
                <div>
                  <span>Ориентир</span>
                  <strong>{successState.price.toLocaleString('ru-RU')} ₽</strong>
                </div>
                <div>
                  <span>Объём</span>
                  <strong>{successState.pages} стр.</strong>
                </div>
              </div>

              <div className="order-success-sheet__topic">
                <span>Тема</span>
                <strong>{successState.topic}</strong>
                <small>{successState.originality} · расчёт сохранён в заявке.</small>
              </div>

              <div className="order-success-sheet__actions">
                <button type="button" className="primary-action primary-action--wide" onClick={closeSuccessState}>
                  Понятно
                </button>
                <a
                  href={personalVk.href}
                  target="_blank"
                  rel="noreferrer"
                  className="secondary-action secondary-action--wide"
                >
                  <ArrowUpRight size={18} />
                  <span>Личный VK</span>
                </a>
                <button
                  type="button"
                  className="secondary-action secondary-action--wide"
                  onClick={() => {
                    closeSuccessState()
                    navigate('/support')
                  }}
                >
                  Все контакты
                </button>
              </div>
            </motion.section>
          </>
        ) : null}
      </AnimatePresence>
    </>
  )
}
