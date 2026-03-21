# ПЛАН ПОЛНОЙ ПЕРЕСБОРКИ ГЛАВНОЙ СТРАНИЦЫ
## "Академический Салон" — Premium Redesign v2

---

## ФИЛОСОФИЯ

**Принцип "Тихая роскошь" (Quiet Luxury):** Как Bottega Veneta — без логотипов, без крика. Одна звезда (CTA), всё остальное — тихий, уверенный фон. Золото — шёпотом, не криком. Если элемент не продаёт — он уходит.

**Правило одного акцента:** На каждом экране только ОДИН яркий элемент. Всё остальное — нейтрально и подчинено.

---

## ФАЗА 0: ФУНДАМЕНТ — ДИЗАЙН-СИСТЕМА (design tokens)

### 0.1. Цветовая палитра (исправить хаос)

**Проблемы сейчас:**
- `--text-secondary: #a1a1aa` — холодный цинк, конфликтует с тёплым золотом
- `--nav-capsule-bg` — НЕ ОПРЕДЕЛЕНА (навбар прозрачный, поэтому золотой блоб)
- `--gold-glass-strong: rgba(212,175,55,0.25)` — слишком яркий для nav pill
- 5 разных blur-значений, 7 разных margin-bottom, 6 разных whileTap scales

**Новые токены:**
```css
/* Тёплые нейтралы — stone palette вместо zinc */
--text-primary: #f5f5f0;           /* тёплый off-white */
--text-secondary: #a8a29e;         /* stone-400 */
--text-muted: #78716c;             /* stone-500 */
--text-faint: rgba(168,162,158,0.5); /* для footnotes */

/* Золото — 3 уровня, не больше */
--gold-accent: #C9A227;            /* основной акцент (не D4AF37 — тот слишком жёлтый) */
--gold-soft: rgba(201,162,39,0.12); /* фон карточек с акцентом */
--gold-whisper: rgba(201,162,39,0.06); /* едва заметный hint */
--gold-border: rgba(201,162,39,0.10); /* бордеры */

/* Поверхности — всего 3 уровня */
--surface-base: rgba(12,12,10,0.95);  /* основной фон карт */
--surface-raised: rgba(18,18,15,0.90); /* поднятые элементы */
--surface-overlay: rgba(24,22,18,0.85); /* модалки */

/* Навигация */
--nav-bg: rgba(14,14,11,0.82);     /* ОПРЕДЕЛИТЬ! Тёмный, почти чёрный */
--nav-pill: rgba(201,162,39,0.10); /* еле видимый pill, не золотой блоб */
--nav-glow: 0 0 12px rgba(201,162,39,0.08); /* тонкий, не 0.4! */

/* Стекло — 2 уровня, не 5 */
--glass-blur: blur(16px) saturate(140%);  /* стандарт */
--glass-blur-heavy: blur(24px) saturate(160%); /* только для навбара и hero */

/* Тени — тёплые, не чёрные */
--shadow-card: 0 2px 8px rgba(10,8,4,0.3);
--shadow-elevated: 0 8px 24px rgba(10,8,4,0.4);

/* Радиусы — ТОЛЬКО 3 значения */
--radius-sm: 12px;   /* кнопки, badges, icon boxes */
--radius-md: 16px;   /* карточки */
--radius-lg: 24px;   /* hero card, модалки */
--radius-full: 9999px; /* pills */
```

### 0.2. Типографика (упорядочить)

**Сейчас:** Cormorant Garamond (не загружен!), Cinzel, Playfair Display, Manrope, Inter, JetBrains Mono — 6 шрифтов.

**Новая система — только 2 шрифта:**
- **Заголовки:** `'Manrope', sans-serif` — weight 700/800, всегда с negative letter-spacing
- **Текст:** `'Inter', sans-serif` — weight 400/500/600

Убрать: Cinzel, Playfair Display, Cormorant Garamond. Serif не нужен — он создаёт "дешёвый отель" эффект. Manrope с tight tracking уже выглядит премиально.

**Шкала размеров (clamp для fluid):**
```
--text-hero: clamp(28px, 7vw, 36px);  /* h1 hero */
--text-title: clamp(18px, 4.5vw, 22px); /* section titles */
--text-body: 14px;                     /* основной текст */
--text-caption: 12px;                  /* мелкий текст */
--text-micro: 10px;                    /* badges, labels */
```

### 0.3. Анимации (стандартизировать)

```
Вход: opacity 0→1, y: 16→0, ease-out
whileTap: 0.97 для всех интерактивных
Stagger: 0.06s между siblings
Spring: stiffness 300, damping 25
```

### 0.4. Отступы (ритм 8px)

```
Между секциями: 24px
Внутри карт: 20px
Между карточкой и заголовком: 16px
Gap в списках: 8px или 12px
Padding страницы: 16px horizontal
```

---

## ФАЗА 1: НАВИГАЦИЯ (Navigation.tsx) — Критический баг

**Проблема:** `--nav-capsule-bg` не определена → фон прозрачный → `saturate(180%)` превращает backdrop в золотой блоб.

**Решение:**
```tsx
// Capsule background
background: 'var(--nav-bg)', // rgba(14,14,11,0.82) — почти чёрный
backdropFilter: 'var(--glass-blur-heavy)',
border: '1px solid rgba(255,255,255,0.06)', // тонкий, не gold

// Active pill — едва заметный
background: 'var(--nav-pill)', // rgba(201,162,39,0.10)
boxShadow: 'var(--nav-glow)', // 0 0 12px rgba(201,162,39,0.08)
border: 'none', // убрать бордер с pill

// Убрать "Bottom Golden Glow" div полностью — он создаёт "казино" эффект
// Убрать "Top Gloss Highlight" — лишний шум

// Иконки
active: color var(--gold-accent), fill none, strokeWidth 2.2
inactive: color var(--text-muted), strokeWidth 1.8

// Labels
fontSize: 10px (не 9!), fontWeight 500 (не 700)
```

**Файлы:** `Navigation.tsx`, `global.css`

---

## ФАЗА 2: HERO CARD (NewTaskCTA.tsx) — Полная пересборка

### 2.1. First-order (новые пользователи)

**Структура:**
```
┌─────────────────────────────────┐
│ АКАДЕМИЧЕСКИЙ САЛОН              │  ← eyebrow, --text-muted, 10px uppercase
│                                 │
│ Учись спокойно.                 │  ← h1, --text-primary, clamp(28px,7vw,36px)
│ Мы сделаем.                    │     weight 800, tracking -0.03em
│                                 │
│ Курсовые, дипломы, рефераты     │  ← body, --text-secondary, 14px
│ и ещё 15+ видов работ.         │
│ От 990 ₽ · эксперты от 5 лет   │     цена --gold-accent
│                                 │
│ ┌───────────────────────────┐   │
│ │ ⭐ 4.8 из 5 · 2 400+      │   │  ← proof strip (horizontal scroll)
│ │ 🛡 82%+ уникальности      │   │     одна строка, compact
│ │ ⏱ 3 правки бесплатно      │   │
│ └───────────────────────────┘   │
│                                 │
│ ┌───────────────────────────┐   │
│ │   Рассчитать стоимость  → │   │  ← CTA, gold gradient bg
│ └───────────────────────────┘   │     height 52px, radius-sm(12px)
│                                 │
│ Без предоплаты · Ответ 5 мин    │  ← --text-faint, 12px
└─────────────────────────────────┘
```

**Ключевые изменения:**
1. **Proof points → горизонтальная полоска**, не 3 отдельные карты. Сейчас 3 карточки занимают пол-экрана и выглядят разрозненно. Одна компактная строка с иконками.
2. **Убрать `primaryActionGlow` и `primaryActionShine`** — два декоративных div'а создают мутное свечение. Заменить одним тонким `radial-gradient` в background самой карты.
3. **Background карты:** `var(--surface-base)` с `border: 1px solid var(--gold-border)`. Без radial-gradient overlay — чище.
4. **CTA кнопка:** Solid gold gradient, text dark. Не стеклянная — контраст.

### 2.2. Repeat-order (возвращающиеся)

Без изменений — уже compact. Только применить новые токены.

---

## ФАЗА 3: СЕКЦИИ НОВЫХ ПОЛЬЗОВАТЕЛЕЙ — Streamline

### 3.1. LiveActivityFeed — Переделать

**Сейчас:** Выглядит как отдельный блок с другим стилем.
**Новое:** Минимальный однострочный тикер внизу hero-карты (внутри, не снаружи). Убрать как отдельную секцию.

### 3.2. TrustStatsStrip — Объединить с Hero

**Сейчас:** 3 числа в отдельной секции (`2400+`, `4.8`, `98%`).
**Новое:** Переместить в proof strip внутри hero. Одна секция вместо трёх.

### 3.3. HowItWorks — Упростить

**Сейчас:** 3 шага с номерами-кружками. Норм, но стилистически отличается.
**Новое:** Те же 3 шага, но в одном стиле — карточка `var(--surface-base)`, radius `--radius-md`, иконки в `--gold-whisper` кружках.

### 3.4. TestimonialsSection — Переделать

**Сейчас:** Auto-scroll карусель с пагинацией точками. Точки разного размера (4/12px vs WelcomeTour 6/20px).
**Новое:**
- Статичные 2-3 отзыва (карусель на мобиле — плохой UX, пользователь не видит все отзывы)
- Каждый отзыв — имя + курс + универ + текст + оценка
- Единый стиль карточек
- Убрать автоскролл (раздражает)

### 3.5. GuaranteesShowcase — Оставить, унифицировать

Применить единые токены. Убрать кнопку "Все гарантии" — модалка избыточна, все гарантии видны на странице.

### 3.6. PricingAnchor — Упростить

**Сейчас:** Сравнительная таблица.
**Новое:** Простая карточка "от 990₽/страница" с пояснением что входит. Без complex grid.

### 3.7. FAQSection — Оставить, унифицировать стиль

Accordion с 5-6 вопросами. Применить единые токены. Убрать hardcoded цвета.

### 3.8. Убрать StickyBottomCTA

**Почему:** CTA кнопка уже есть в hero. Sticky CTA внизу + навбар = 2 floating элемента внизу, конфликт пространства. Вместо sticky CTA — скролл наверх к hero или повторный CTA в конце страницы (статичный).

---

## ФАЗА 4: СЕКЦИИ ВОЗВРАЩАЮЩИХСЯ ПОЛЬЗОВАТЕЛЕЙ

### 4.1. DailyBonusCard — Упростить

**Сейчас:** Сложная анимация, streak counter, claim button. Выглядит как мини-игра.
**Новое:** Compact inline bar: `🎁 День 3/7 · Забрать бонус →`. Один ряд, не отдельная карточка.

### 4.2. ActiveOrderDashboard — Переделать

**Сейчас:** Uber-стиль с progress stages. Цвета `#8b5cf6` (фиолетовый), `#06b6d4` (голубой) — холодные, ломают палитру.
**Новое:**
- Убрать цветные стадии. Статус = текст + прогресс-бар (gold gradient)
- Одна карточка с последним активным заказом
- Стиль: `var(--surface-base)`, `var(--gold-border)`

### 4.3. QuickActionsRow — Упростить

**Сейчас:** Pill-кнопки с тяжёлым `var(--card-shadow)`.
**Новое:** Простые text-кнопки без фона, с иконками. Или одна строка иконок без подписей.

### 4.4. LevelProgressCard — Оставить, унифицировать

Применить единые токены. Это единственный "gamification" элемент — не убирать.

### 4.5. ReputationCard — Упростить

**Сейчас:** Сложная карта с stats badges, кнопками copy/QR/telegram.
**Новое:** Compact: `Пригласи друга — получи 500₽ · [Скопировать ссылку]`. Одна строка + одна кнопка.

### 4.6. PromoCodeSection — Оставить, если есть активный промо

Визуально привести к единому стилю.

---

## ФАЗА 5: МОДАЛКИ — Единый стиль

**Проблемы:**
- `ModalWrapper.tsx` (14KB!) и `CenteredModalWrapper.tsx` — два разных wrapper'а
- Каждая модалка стилизована по-своему

**Новый единый стиль модалок:**
```css
background: var(--surface-overlay);
border-radius: var(--radius-lg) var(--radius-lg) 0 0; /* bottom sheet */
border-top: 1px solid var(--gold-border);
backdrop-filter: var(--glass-blur-heavy);
```

Все модалки — bottom sheet (не centered). Bottom sheet = мобильный паттерн = в thumb zone.

---

## ФАЗА 6: ФОНОВЫЕ ЭФФЕКТЫ

### PremiumBackground + FloatingGoldParticles

**Сейчас:** Золотые частицы поверх gradient background. Создают визуальный шум и нагрузку на GPU.
**Новое:**
- Убрать `FloatingGoldParticles` полностью — они создают "казино" эффект
- `PremiumBackground` — оставить, но снизить intensity до `low`
- Или заменить на простой `radial-gradient(ellipse at 50% 0%, rgba(201,162,39,0.03) 0%, transparent 50%)`

---

## ФАЗА 7: WELCOME TOUR — Пересобрать

**Сейчас:** Full-screen overlay с 4 слайдами. Шрифт Playfair Display.
**Новое:**
- 3 слайда (не 4) — меньше = лучше
- Шрифт Manrope (как вся система)
- Пагинация: единый стиль с остальным приложением
- Финальный slide → CTA "Начать" → переход к форме заказа

---

## ФАЗА 8: ОБЩИЕ ФАЙЛЫ

### global.css
- Удалить дубликаты CSS переменных (радиусы и spacing объявлены дважды)
- Заменить все zinc-тона на stone
- Убрать неиспользуемые шрифты из @import
- Определить `--nav-capsule-bg` (= `--nav-bg`)

### HomePage.module.css
- Заменить все `var(--bg-glass)` на конкретные surface-токены
- Унифицировать радиусы
- Удалить unused классы

### shared.tsx
- Обновить `glassStyle` и `glassGoldStyle` под новые токены

### constants.ts
- Заменить hardcoded цвета статусов на CSS переменные

---

## ПОРЯДОК РЕАЛИЗАЦИИ

1. **global.css** — новые токены, удалить дубликаты, определить --nav-bg (30 мин)
2. **Navigation.tsx** — исправить золотой блоб (15 мин)
3. **NewTaskCTA.tsx** — полная пересборка hero (45 мин)
4. **LiveActivityFeed + TrustStatsStrip** — интегрировать в hero или убрать (20 мин)
5. **HowItWorks, Guarantees, FAQ, Pricing** — унифицировать стиль (30 мин)
6. **TestimonialsSection** — пересобрать без карусели (20 мин)
7. **HomeHeader** — убрать Cormorant Garamond, унифицировать (10 мин)
8. **DailyBonusCard, ActiveOrderDashboard** — упростить (30 мин)
9. **QuickActionsRow, ReputationCard** — компактифицировать (20 мин)
10. **LevelProgressCard, PromoCodeSection** — токены (15 мин)
11. **Модалки** — единый bottom-sheet стиль (30 мин)
12. **WelcomeTour** — пересборка (20 мин)
13. **StickyBottomCTA** — убрать или переделать (10 мин)
14. **Background effects** — убрать частицы (5 мин)
15. **shared.tsx, constants.ts** — финальная чистка (10 мин)
16. **HomePage.tsx** — финальная сборка потока секций (15 мин)

---

## РЕЗУЛЬТАТ

**Было:** 20+ компонентов, каждый со своим стилем, 5 blur-значений, 7 margin-значений, 6 tap-scales, отсутствующие CSS-переменные, золотой навбар, визуальный хаос.

**Станет:** Единая дизайн-система из 3 поверхностей, 3 радиусов, 2 шрифтов, 2 blur-уровней. Каждый элемент подчинён общей системе. "Тихая роскошь" — золото только шёпотом.
