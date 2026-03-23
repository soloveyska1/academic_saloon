# Глубокий аудит главной страницы Mini App

**Дата:** 2026-03-23
**Агенты:** Инженер, UX-дизайнер, Контент-аналитик
**Файлов проверено:** 45+

---

## Сводка

| Категория | Critical | High | Medium | Low |
|-----------|----------|------|--------|-----|
| Инженерия (баги, архитектура) | 5 | 7 | 9 | 6 |
| UX/UI (визуал, доступность) | 3 | 7 | 8 | 4 |
| Контент (тексты, тон) | 3 | 5 | 7 | 4 |
| **Итого** | **11** | **19** | **24** | **14** |

---

## I. ИНЖЕНЕРНЫЙ АУДИТ

### CRITICAL

#### 1. Memory leak: setTimeout без cleanup
**Файлы:** `HomePage.tsx:199`, `DailyBonusCard.tsx:120`
```typescript
setTimeout(() => setReferralCopied(false), 2000)
```
Таймер не очищается при размонтировании. Попытка setState на unmounted-компоненте.

#### 2. Race condition в useUserData refetch
**Файл:** `useUserData.ts:53-59`
`refetch` не обёрнут в `useCallback` — создаёт новую ссылку каждый рендер. Это вызывает пере-регистрацию touch-слушателей в `usePullToRefresh` на каждый рендер. Нет abort-механизма для конкурентных вызовов.

#### 3. useTelegram мемоизация `tg` с пустыми deps
**Файл:** `useUserData.ts:112`
```typescript
const tg = useMemo(() => window.Telegram?.WebApp, [])
```
Если Telegram SDK ещё не загружен при монтировании — `tg` навсегда `undefined`. Все haptic/openBot вызовы молча не работают.

#### 4. PricingAnchor workTypeKey не совпадает с WorkType enum
**Файл:** `HomePage.tsx:169-174`
`PricingAnchor` передаёт ключи `'referat'`, `'kursovaya'` и т.д., но `WorkType` enum использует `'coursework'`, `'essay'`, `'report'`. Prefill типа работы при создании заказа сломан.

#### 5. Suspense boundary слишком грубый
**Файл:** `HomePage.tsx:481-521`
Один `<Suspense>` оборачивает ВСЕ 7 lazy-модалок + Confetti. При загрузке любого модала — fullscreen overlay блокирует весь UI.

### HIGH

#### 6. 75% мёртвого CSS в HomePage.module.css
447 строк CSS, из которых реально используются только: `.container`, `.header`, `.avatarContainer`, `.avatar`, `.userInfo`, `.userName`, `.sectionTitle`. Остальные ~335 строк — мёртвый код, включая light-mode overrides для несуществующих классов.

#### 7. QuickActionsRow рендерится 3 раза идентично
**Файл:** `HomePage.tsx:348-362, 381-395, 416-428`
Один и тот же компонент с идентичными пропами повторяется в трёх ветках returning-user state. Inline лямбда `onOpenModal` дублируется 3 раза.

#### 8. formatMoney дублируется в 3 файлах
Идентичная функция в `HomeHeader.tsx:26`, `ActiveOrderDashboard.tsx:107`, `LoungeVault.tsx:31`.

#### 9. WORK_TYPE_LABELS конфликт: "report" → "Доклад" vs "Реферат"
`QuickReorderCard.tsx:28`: `report: 'Доклад'`
`orderView.ts:18`: `report: 'Реферат'`
Это разные типы работ. Пользователь при реордере увидит неправильное название.

#### 10. Inline style objects пересоздаются каждый рендер
30-40 объектов `style={{}}` в каждом компоненте. `HomeHeader` — ~30 объектов, `ActiveOrderDashboard` — ~40, `LoungeVault` — ~30. Все создают новые ссылки, ломая React shallow comparison.

#### 11. LiveActivityFeed интервал не останавливается вне viewport
**Файл:** `LiveActivityFeed.tsx:46-56`
`setInterval` каждые 4 секунды обновляет стейт и запускает AnimatePresence даже когда компонент за пределами экрана.

#### 12. Confetti компонент всегда монтирован но никогда не активен
`state.showConfetti` инициализируется `false` и `actions.setConfetti(true)` нигде не вызывается. Мёртвый код внутри Suspense boundary.

### MEDIUM

- `PullIndicator` создаётся через `useCallback` — анти-паттерн React (пересоздаёт компонент при смене deps)
- Unused reducer state: `state.copied` и `state.modals.welcome` никогда не используются
- `AnimatedCounter` в `TrustStatsStrip` запускает rAF без IntersectionObserver — анимация прокручивается невидимой
- `PremiumBackground` рендерит animated blobs с `filter: blur(40px)` бесконечно
- `ExamSeasonBanner` кэширует `getExamSeason()` с `useMemo([], [])` — не обновится при смене сезона
- `heroCTARef` приведение типов через `as unknown as` — TypeScript smell
- `haptic` указан в deps `handleNewOrderWithType` но не используется в теле
- Barrel export `home/index.ts` реэкспортирует ~10 неиспользуемых компонентов
- Import CSS module после interface declaration (line 54)

### LOW

- `navigator.clipboard?.writeText().catch(() => {})` — ошибка копирования молча проглатывается, но UI показывает "скопировано"
- Нет Error Boundary на уровне отдельных секций — крэш одного компонента роняет всю страницу
- `UrgentHubSheet` использует `setTimeout(180ms)` для навигации без cleanup
- `WelcomeTour.onComplete` вызывает `navigate()` сразу — exit-анимация AnimatePresence не успевает проиграться
- Нет per-section error boundaries
- `ActionDeck` и `DeckDivider` не мемоизированы

---

## II. UX/UI АУДИТ

### CRITICAL

#### 1. Контраст eyebrow-лейблов: 2.6:1 (требуется 4.5:1)
`rgba(255,255,255,0.32)` используется в 8+ компонентах для значимого текста: "Новый заказ", "К доплате", "Этап заказа". Эффективный контраст на `#050507` — всего 2.6:1. **Не проходит WCAG AA.**

Другие нарушения:
- `rgba(255,255,255,0.48)` для ID заказов → 3.8:1 — **FAIL**
- `opacity: 0.7` на `--text-muted` → 3.7:1 — **FAIL**
- `rgba(212,175,55,0.72)` для gold eyebrows → 4.5:1 — **на грани**

#### 2. Нет loading state на HomePage
**Файл:** `HomePage.tsx:241`
```typescript
if (!user) return null
```
Пустой экран между splash screen и загрузкой данных. Skeleton-компоненты существуют в `Skeletons.tsx` но **нигде не импортируются и не используются**.

#### 3. Светлая тема сломана
`ActionDeck`, `HomeHeader`, `ActiveOrderDashboard`, `LoungeVault` используют inline тёмные градиенты. CSS-переменные light mode существуют в `.module.css`, но 90%+ стилей — inline, не переключаемые.

### HIGH

#### 4. WelcomeTour skip-кнопка: ~26x30px
**Файл:** `WelcomeTour.tsx:173`
`padding: '7px 14px'` — ниже минимума 44x44px. Первый touch target, с которым сталкивается новый пользователь.

#### 5. Safe area не применена к main container
`HomePage.tsx` не использует `env(safe-area-inset-*)`. Контент может рендериться за вырезом (notch) на iPhone.

#### 6. 15+ элементов с backdrop-filter: blur(16px) на одной странице
`HowItWorks`, `TestimonialsSection`, `GuaranteesShowcase`, `FAQSection`, `NewTaskCTA`, `QuickActionsRow`, `DailyBonusCard` — все используют `backdrop-filter: blur(16px) saturate(140%)`. Тяжёлая GPU-нагрузка на бюджетных Android.

#### 7. Анимации не учитывают prefers-reduced-motion
Только 3 из 12+ компонентов проверяют `useReducedMotion()`: `LiveActivityFeed`, `FAQSection`, `ExamSeasonBanner`. Остальные (`NewTaskCTA`, `HowItWorks`, `ActiveOrderDashboard`, `LoungeVault` и т.д.) — нет.

#### 8. Все framer-motion анимации срабатывают при монтировании, не при входе в viewport
Секции PricingAnchor (delay 0.38s), FAQSection (delay 0.38s) анимируются за экраном и заканчиваются до того, как пользователь до них долистает. Потраченная GPU-работа.

#### 9. `will-change: transform, opacity` на ВСЕХ кнопках
**Файл:** `global.css:44`
Каждая кнопка/`[role="button"]` промотируется в отдельный GPU-слой. При 20+ кнопках на странице — излишнее потребление памяти.

#### 10. "Двойная доминанта" для новых пользователей
Header имя: Playfair Display `fontSize: 30`. Hero CTA заголовок: Playfair Display `clamp(26px, 7vw, 34px)`. На 375px оба ~30-34px — конкурируют за внимание. Hero CTA должен быть безоговорочным фокусом.

### MEDIUM

- Spacing: 4 разных tier-а (8, 16, 18, 24px) для section margins. 16 vs 18 — неразличимо, но непоследовательно
- Footer `fontSize: 7` — нечитабельно даже на retina
- `lineHeight: 0.92-0.98` для Playfair Display — descenders кириллицы (у, р, д) могут обрезаться
- Stat cells в HomeHeader выглядят тапабельными (card-like стиль), но не интерактивны — false affordance
- `MetricPanel` в LoungeVault тоже false affordance
- PricingAnchor стрелки: `opacity: 0.25` — слишком незаметны
- `LoungeVault` — ~350 строк JSX, 6+ информационных групп в одном компоненте (cognitive overload)
- `ModalLoadingFallback` имеет `aria-hidden="true"` — screen readers не объявляют загрузку

### LOW

- Нет skip-to-content ссылки
- `fontFamily: "'Manrope', sans-serif"` захардкожен вместо `var(--font-sans)` в WelcomeTour, DailyBonusCard
- QuickReorderCard: `motion.div` с `onClick` но без `role="button"`, `tabIndex`, keyboard handling
- `ActionDeck` без ARIA landmarks

---

## III. КОНТЕНТ-АУДИТ

### CRITICAL

#### 1. БАГ: "report" → "Доклад" vs "Реферат"
`QuickReorderCard.tsx:28`: `report: 'Доклад'`
`orderView.ts:18`: `report: 'Реферат'`
Это два разных типа академических работ. При реордере пользователь увидит неправильное название.

#### 2. Сломана плюрализация в DailyBonusCard
**Файл:** `DailyBonusCard.tsx:235`
```typescript
currentStreak === 1 ? 'день подряд' : 'дня подряд'
```
Для 5+ покажет "5 дня подряд" вместо "5 дней подряд". Нет обработки формы для 5-20.

#### 3. Сломана плюрализация в BonusExpiryAlert
**Файл:** `BonusExpiryAlert.tsx:68`
`'Истекают через {n} дней'` — не обрабатывает формы для 2-4 ("дня").

### HIGH

#### 4. Единственное "ты" среди всех "вы"
**Файл:** `constants.ts:56`
`'Скинь фото'` — единственная фраза на "ты" во всей главной странице. Все остальные 200+ строк используют "вы": "Опишите задачу", "Согласуйте условия", "Выберите тип работы".

#### 5. "заказ" vs "работа" — непоследовательная терминология
- `NewTaskCTA` embedded: "Оформить новую **работу**" (line 255)
- `NewTaskCTA` non-embedded: "Оформить новый **заказ**" (line 379)
- `QuickReorderCard`: "Повторить похожую **работу**" (line 95) vs "Повторить похожий **заказ**" (line 293)

#### 6. "15+ форматов" — ложное утверждение
**Файл:** `NewTaskCTA.tsx:104`
`'Курсовые, дипломы, рефераты и ещё 15+ форматов.'`
Реально `WORK_TYPE_ICONS` содержит 12 типов.

#### 7. Три разных версии "Как это работает"
- `HowItWorks.tsx`: "Согласуйте **условия**" / "Оплата — после вашего согласия"
- `EmptyStateOnboarding.tsx`: "Согласуйте **цену**" / "Оплата после обсуждения"
- `WelcomeTour.tsx`: нумерованный список с третьей формулировкой

#### 8. "98% в срок" vs "99% успешно"
`TrustStatsStrip.tsx:20`: `value: 98, label: 'в срок'`
`SocialProofStrip.tsx:30`: `'99% успешно'`
Два разных утверждения или несогласованные цифры?

### MEDIUM

- Навигация: "Бонусы" (Navigation.tsx:179), везде остальное: "Клуб" (HomeHeader, LoungeVault). Один раздел — два названия.
- Метрики "2400+", "4.8", "82%" захардкожены в 3+ файлах отдельно. Риск рассогласования при обновлении.
- PromoCodeSection: кнопка "ОК" в inline-варианте vs "Применить" в full-варианте
- "Antiplagiat" латиницей (FAQSection:28) среди кириллического текста. Русский бренд — "Антиплагиат"
- "Подготовьтесь... заблаговременно" (ExamSeasonBanner:84) — чрезмерно формально
- "Ожидает", "Оценка", "Проверка" (constants.ts:69-72) — без контекста неоднозначны
- "5 мин" vs "5 минут" — мелкое несоответствие форматирования

### LOW

- "Личный кабинет" (новые) vs "Личный салон" (возвращающиеся) — может запутать
- `URGENT_OPTIONS` в constants.ts — похоже мёртвый код (UrgentHubSheet использует свой контент)
- EmptyStateOnboarding экспортируется но не используется на HomePage
- "приглаш." — нестандартное сокращение в LoungeVault

---

## IV. ТОП-15 ДЛЯ НЕМЕДЛЕННОГО ИСПРАВЛЕНИЯ

| # | Проблема | Тип | Усилия |
|---|----------|-----|--------|
| 1 | `report` → "Доклад" vs "Реферат" — баг | Контент/Баг | 5 мин |
| 2 | Плюрализация "дней подряд" для 5+ | Контент/Баг | 10 мин |
| 3 | Плюрализация "дней" в BonusExpiryAlert | Контент/Баг | 10 мин |
| 4 | "Скинь фото" → "Пришлите фото" | Контент | 2 мин |
| 5 | PricingAnchor workTypeKey не совпадает с enum | Баг | 30 мин |
| 6 | `useTelegram` tg мемоизация с `[]` deps | Баг | 15 мин |
| 7 | Контраст eyebrow `0.32` → поднять до `0.56`+ | UX | 1 час |
| 8 | Добавить skeleton loading вместо `return null` | UX | 1 час |
| 9 | `refetch` обернуть в `useCallback` | Баг | 15 мин |
| 10 | setTimeout cleanup при unmount | Баг | 15 мин |
| 11 | Удалить 75% мёртвого CSS | Код | 30 мин |
| 12 | Извлечь `formatMoney` в shared utility | Код | 20 мин |
| 13 | QuickActionsRow: убрать дублирование (1 раз вместо 3) | Код | 30 мин |
| 14 | WelcomeTour skip кнопка: увеличить до 44px | UX | 5 мин |
| 15 | Safe area insets на main container | UX | 10 мин |

---

## V. ФАЙЛЫ, ТРЕБУЮЩИЕ ВНИМАНИЯ

### Критически перегруженные:
- `ActiveOrderDashboard.tsx` — 620+ строк, 40+ inline style objects
- `LoungeVault.tsx` — 571+ строк, 6+ информационных групп
- `NewTaskCTA.tsx` — 400+ строк, 3 варианта в одном компоненте
- `HomePage.tsx` — 542 строки, управляет 7 модалками + 3 user states

### Мёртвый код:
- `HomePage.module.css` — ~335 из 447 строк не используются
- `EmptyStateOnboarding.tsx` — экспортируется но не импортируется
- `Skeletons.tsx` — skeleton-компоненты существуют но нигде не рендерятся
- `Confetti` — монтируется в Suspense но `showConfetti` никогда не становится `true`
- `URGENT_OPTIONS` в `constants.ts` — не используется на HomePage
- `SocialProofStrip` — экспортируется из barrel но не импортируется

### Дублирование:
- `formatMoney` — 3 идентичных копии
- `WORK_TYPE_LABELS` — 2 конфликтующих версии
- `QuickActionsRow` — 3 идентичных рендера в HomePage
- "Как это работает" — 3 разных версии текста
- Метрики "2400+", "4.8" — 3 отдельных хардкод-места
