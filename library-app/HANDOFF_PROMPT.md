# Handoff For Claude Code / New Chat

Последнее обновление: 2026-04-04  
Текущее рабочее направление: упростить и довести до премиального, спокойного состояния мобильное и планшетное PWA-приложение `/app` для БиблиоСалона.

## 1. Что это за проект

Это не новый проект и не прототип. Это уже много раз доработанное мобильное/планшетное PWA-приложение для каталога студенческих работ, заказа работ и связи с Академическим Салоном.

Ключевая идея продукта:

- студент быстро находит пример;
- сохраняет его;
- при желании отправляет другу;
- при необходимости заказывает похожую работу;
- всё это происходит в спокойном, дорогом, геометрически точном интерфейсе.

Сейчас главный фокус не в добавлении новых фич ради количества. Последние итерации показали, что продукт можно перегрузить. Пользователь явно дал понять, что нужен курс на:

- чистоту;
- выверенную геометрию;
- меньше текстового шума;
- меньше конкурирующих блоков;
- сильный iPhone/iPad UX;
- премиальное, эстетичное ощущение.

## 2. Точные пути

### Monorepo root

`/Users/saymurrbk.ru/Desktop/Проекты/Академический салон/academic_saloon-main`

### Основной проект приложения, над которым продолжаем работу

`/Users/saymurrbk.ru/Desktop/Проекты/Академический салон/academic_saloon-main/library-app`

### Текущий cwd Codex в ряде сессий

`/Users/saymurrbk.ru/Desktop/Проекты/Академический салон/academic_saloon-main/Библиотека Салона`

### Старый основной сайт, отдельный single-file HTML

`/Users/saymurrbk.ru/Desktop/academic-salon/index.html`

Этот файл существует и используется для основной десктопной версии и админки, но это не текущий основной объект работы.

## 3. Что сейчас является главным объектом работы

Работаем прежде всего над:

- `https://bibliosaloon.ru/app/`

Роуты приложения:

- `/app/`
- `/app/categories`
- `/app/favorites`
- `/app/order`
- `/app/support`

Прод-статика лежит здесь:

- `/var/www/salon/mobile/`

## 4. Технологии

Приложение:

- React 18
- TypeScript
- Vite
- React Router
- Framer Motion
- Lucide React
- PWA

`package.json`:

- [package.json](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/package.json)

Текущие scripts:

```json
{
  "dev": "vite",
  "build": "vite build && node ./scripts/postbuild.mjs",
  "generate:icons": "node ./scripts/generate-icons.mjs",
  "preview": "vite preview",
  "typecheck": "tsc --noEmit"
}
```

## 5. Ключевые файлы проекта

### Корень приложения

- [app.tsx](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/app.tsx)
- [main.tsx](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/main.tsx)
- [styles.css](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/styles.css)

### Экраны

- [CatalogScreen.tsx](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/screens/CatalogScreen.tsx)
- [CategoriesScreen.tsx](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/screens/CategoriesScreen.tsx)
- [FavoritesScreen.tsx](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/screens/FavoritesScreen.tsx)
- [OrderScreen.tsx](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/screens/OrderScreen.tsx)
- [SupportScreen.tsx](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/screens/SupportScreen.tsx)

### Компоненты

- [BottomNav.tsx](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/components/BottomNav.tsx)
- [DocumentSheet.tsx](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/components/DocumentSheet.tsx)
- [RouteTransitionSkeleton.tsx](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/components/RouteTransitionSkeleton.tsx)
- [CompareStudio.tsx](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/components/CompareStudio.tsx)
- [InstallPrompt.tsx](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/components/InstallPrompt.tsx)

### Логика и стейт

- [catalog.ts](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/lib/catalog.ts)
- [order.ts](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/lib/order.ts)
- [support.ts](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/lib/support.ts)
- [uiState.ts](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/lib/uiState.ts)
- [russian.ts](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/lib/russian.ts)
- [errors.ts](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/lib/errors.ts)

### PWA/public

- [manifest.webmanifest](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/public/manifest.webmanifest)
- [sw.js](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/public/sw.js)
- [icon.svg](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/public/icons/icon.svg)
- [generate-icons.mjs](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/scripts/generate-icons.mjs)
- [postbuild.mjs](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/scripts/postbuild.mjs)

## 6. Очень важный продуктовый контекст

Пользователь прямо сказал, что в последних итерациях началась деградация из-за переусложнения. Это критично.

Сейчас нельзя снова уйти в:

- маркетинговый перегруз;
- россыпь карточек на первом экране;
- tutorial/onboarding;
- heavy intro-blocks;
- ещё один уровень “полезных” блоков поверх уже существующих;
- большое количество CTA одновременно;
- длинные пояснительные тексты;
- растянутые планшетные layout’ы с пустыми зонами.

Нынешний курс:

- subtraction over addition;
- premium through restraint;
- один экран = один внятный маршрут;
- сильная геометрия;
- меньше текста;
- меньше слоёв;
- больше визуального спокойствия.

## 7. Что пользователь любит и чего хочет

Пользователь хочет, чтобы приложение выглядело:

- дорого;
- премиально;
- эстетично;
- удобно;
- как зрелый продукт, а не как собранный конструктор из блоков.

Особые требования:

- iPhone UX должен быть очень чистым;
- iPad должен быть адаптирован отдельно, а не просто растянут;
- нигде не должно быть больших пустых мест, разрывов, странных растяжений;
- геометрия должна быть “идеальной”;
- контакты и связь важны, но тоже не должны перегружать;
- текст в интерфейсе должен быть простым, человеческим, русским;
- без техно-жаргона.

## 8. Что уже убрано и не надо возвращать без очень веской причины

Не возвращать:

- tutorial / onboarding;
- `Под рукой`;
- `Для группы`;
- `Твоё пространство`;
- `Учебный набор`;
- тяжёлые multi-card hero-наборы;
- конкурентные верхние блоки в каталоге;
- лишние compare/pin/share сценарии в основном flow, если они снова перегружают экран;
- отдельный сценарный блок в `Заказать`.

Если файл или компонент всё ещё существует, это не значит, что его надо возвращать в UX.

## 9. Текущее состояние экранов

### Каталог

Текущее направление:

- каталог уже несколько раз чистили;
- верх стал спокойнее;
- пользователь всё ещё чувствителен к перегрузу;
- основной принцип: не превращать каталог в дашборд.

Что важно:

- верх должен быть коротким;
- поиск должен быть главным;
- блоков до первого списка должно быть мало;
- `Лучшее совпадение` не должно шуметь;
- карточки списка должны быстро сканироваться;
- `DocumentSheet` должен быть сдержанным.

### Разделы

Недавнее направление:

- экран уже упрощён;
- должен быть один понятный featured-вход и затем список;
- без лестницы из нескольких почти одинаковых блоков.

Что важно:

- на iPad не должно быть широкой пустой сцены;
- не должно быть чрезмерно длинного intro;
- геометрия списка должна быть спокойной.

### Избранное

Текущее направление:

- не превращать в “личный супер-дашборд”;
- оставить как чистый рабочий список/набор;
- без лишних метрик и без лишнего верхнего шума.

### Заказать

Сейчас это самый важный экран после последних замечаний.

Проблема:

- экран был перегружен каскадом блоков;
- было слишком много независимых верхних карточек;
- сценарии занимали много места и были уже убраны.

Текущее направление:

- один спокойный hero;
- форма как основной маршрут;
- минимум competing surfaces;
- очень сильная геометрия на iPhone и iPad;
- вторичные контакты/support должны быть сдержанными.

### Связь

Контакты важны, но экран тоже не должен быть “витриной ссылок”.

Приоритет каналов для России:

1. личный VK;
2. MAX;
3. Telegram;
4. Telegram-бот;
5. email / правовые документы / основной сайт.

Сайт на мобильном вторичен, потому что мобильный опыт должен происходить именно внутри `/app`.

## 10. Последние значимые изменения, которые уже внесены

### Удалён tutorial

Он был убран полностью из актуального UX. Не возвращать без очень сильной причины.

### Каталог упрощён

Из него убраны перегружающие верхние слои и маркетинговые поверхности.

### Разделы упрощены

Экран сведён к более чистому featured-блоку + списку.

### Заказать разгружен

Последний свежий cleanup связан с тем, что пользователь прямо сказал:

> “В заказать сценарии лишние, они занимают много места”

После этого:

- сценарии удалены из UI;
- логика draft-state очищена;
- форма стала спокойнее.

## 11. Конкретно про последнее изменение в `Заказать`

Фактические ориентиры по коду:

- [OrderScreen.tsx:506](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/screens/OrderScreen.tsx#L506)  
  `Контекст: заявка собирается по примеру из каталога.`

- [OrderScreen.tsx:508](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/screens/OrderScreen.tsx#L508)  
  `Контекст: срочная заявка.`

- [OrderScreen.tsx:719](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/screens/OrderScreen.tsx#L719)  
  `Какой результат нужен`

- [OrderScreen.tsx:1020](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/screens/OrderScreen.tsx#L1020)  
  `Личный VK и MAX всегда под рукой`

То есть:

- блок `Сценарий` из UI убран;
- итоговый контекст заявки уходит уже не как отдельная noisy surface, а как спокойный внутренний комментарий;
- support-текст снизу уже упрощён.

## 12. Важный момент по `uiState.ts`

Старое поле `scenario` уже удалено из draft-схемы.

Смотри:

- [uiState.ts:6](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/lib/uiState.ts#L6)

`OrderDraft` сейчас содержит:

- `workType`
- `deadline`
- `originality`
- `pages`
- `topic`
- `contact`
- `contactChannel`
- `goal`
- `notes`
- `extras`
- `sampleToken`
- `updatedAt`

Если кто-то попытается вернуть `scenario`, он снова раздует UX и может сломать draft flow.

## 13. Важный момент по стилям

[styles.css](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/styles.css) очень большой и в нём много накопленных слоёв.

Это значит:

- поздние override-блоки внизу файла часто важнее ранних правил;
- перед любым layout-рефактором ищи late media rules;
- особенно это важно для iPad/tablet;
- не доверяй первому найденному селектору, почти наверняка есть более поздний override.

Особенно внимательно смотри поздние tablet/order/catalog rules.

## 14. Русский язык и склонения

В приложении уже есть отдельная логика для склонений:

- [russian.ts](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/lib/russian.ts)

Если добавляются новые счётчики или формы слов, обязательно использовать правильные русские формы. Пользователь уже отдельно просил исправить это по всему приложению.

## 15. Контакты, которые уже важны для продукта

Нужные данные, которые уже должны учитываться в `Связь` и в support-сценариях:

- Академический салон в MAX: [max.ru/join/dP7MynBoq0tumYpQIc5e5UYtt_F9ZGElLsRetoIHZPs](https://max.ru/join/dP7MynBoq0tumYpQIc5e5UYtt_F9ZGElLsRetoIHZPs)
- Кладовая ГИПСР в MAX: [max.ru/join/lvaRhM9GTze3JfqgW9GsTisLfz-o_IOdVK-ev-_AsH0](https://max.ru/join/lvaRhM9GTze3JfqgW9GsTisLfz-o_IOdVK-ev-_AsH0)
- Почта: `academsaloon@mail.ru`
- Telegram менеджера: [t.me/academicsaloon](https://t.me/academicsaloon)
- Telegram-бот для заказа работ: `@Kladovaya_GIPSR_bot`
- Сайт: [bibliosaloon.ru](https://bibliosaloon.ru)
- Личный VK: [vk.com/imsaay](https://vk.com/imsaay)

## 16. Дизайн-доктрина для следующего агента

Нужно держать в голове:

- premium through restraint;
- dark + gold aesthetic, но без театральности;
- крупные смысловые блоки только там, где они реально нужны;
- одна главная мысль на экран/секцию;
- слабый, тихий supporting copy;
- никакого ощущения “ещё один уровень UI поверх UI”.

Главное правило:

Если сомневаешься, убирать или добавлять блок, почти всегда надо убирать.

## 17. Что делать дальше

### Ближайший приоритет

Начать с `Заказать`.

Порядок:

1. внимательно перечитать [OrderScreen.tsx](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/screens/OrderScreen.tsx);
2. затем пройти поздние order/tablet overrides в [styles.css](/Users/saymurrbk.ru/Desktop/Проекты/Академический%20салон/academic_saloon-main/library-app/src/styles.css);
3. убрать остаточный визуальный шум;
4. укоротить hero, если он всё ещё слишком высокий;
5. проверить, нет ли повторяющихся смыслов между hero, form note, success state, sticky submit dock и support footer;
6. проверить iPhone и iPad отдельно.

### После `Заказать`

Дальше идти в таком порядке:

1. `CatalogScreen.tsx`
2. `DocumentSheet.tsx`
3. `CategoriesScreen.tsx`
4. `FavoritesScreen.tsx`
5. `SupportScreen.tsx`

Но в том же стиле:

- чище;
- короче;
- спокойнее;
- геометрически точнее.

## 18. Чего НЕ делать на следующем проходе

Не надо:

- снова пытаться “удивить” количеством feature-блоков;
- добавлять tutorial;
- добавлять личные dashboard-слои;
- делать несколько hero подряд;
- снова превращать каталог или заказ в “витрину возможностей”.

Пользователь сейчас хочет зрелость через чистоту.

## 19. Локальная работа

Рабочая директория:

```bash
cd "/Users/saymurrbk.ru/Desktop/Проекты/Академический салон/academic_saloon-main/library-app"
```

Основные команды:

```bash
npm run typecheck
npm run build
```

## 20. Деплой

Актуальный рабочий deploy pattern:

```bash
/opt/homebrew/bin/sshpass -p 'oFp?P3QTjAtF+s' rsync -az --delete -e 'ssh -o StrictHostKeyChecking=no' "/Users/saymurrbk.ru/Desktop/Проекты/Академический салон/academic_saloon-main/library-app/dist/" root@94.241.143.29:/var/www/salon/mobile/
```

Прод:

- `https://bibliosaloon.ru/app/`

## 21. Как проверять

После деплоя:

- всегда открывать новый query-version:
  - `https://bibliosaloon.ru/app/?v=NNN`
  - `https://bibliosaloon.ru/app/order/?v=NNN`
  - `https://bibliosaloon.ru/app/categories/?v=NNN`
  - `https://bibliosaloon.ru/app/favorites/?v=NNN`
  - `https://bibliosaloon.ru/app/support/?v=NNN`

Если приложение установлено как PWA:

- полностью закрыть;
- открыть заново.

## 22. Полезная визуальная проверка через WebKit

Для iPhone:

```bash
npx playwright screenshot --browser=webkit --device='iPhone 15' --wait-for-timeout=6500 --full-page --block-service-workers "https://bibliosaloon.ru/app/order/?v=174" "/tmp/order-iphone.png"
```

Для iPad:

```bash
npx playwright screenshot --browser=webkit --device='iPad Pro 11' --wait-for-timeout=6500 --full-page --block-service-workers "https://bibliosaloon.ru/app/order/?v=174" "/tmp/order-ipad.png"
```

Важно:

- без ожидания можно поймать только splash;
- WebKit важен, потому что продукт сильно зависит от поведения Safari/iOS/iPadOS.

## 23. Готовый prompt для нового агента

Ниже готовый prompt, который можно вставить в новый чат Claude Code / Codex.

```text
Ты продолжаешь существующий проект, а не начинаешь новый.

Проект:
- /Users/saymurrbk.ru/Desktop/Проекты/Академический салон/academic_saloon-main/library-app

Это mobile/tablet PWA-приложение БиблиоСалона, которое живёт на:
- https://bibliosaloon.ru/app/

Главный текущий приоритет:
- не добавлять новые тяжёлые фичи;
- убирать перегруз;
- доводить геометрию до идеала;
- делать интерфейс спокойнее, дороже, чище и удобнее;
- отдельно внимательно относиться к iPad layout.

Очень важно:
- пользователь недоволен тем, что в последних итерациях продукт стал перегруженным;
- tutorial уже удалён и его возвращать не надо;
- не надо возвращать слои вроде “Под рукой”, “Для группы”, “Твоё пространство”, “Учебный набор” и подобные dashboard-поверхности;
- не надо делать конкурирующие hero-блоки;
- не надо плодить карточки ради “богатого интерфейса”.

Стиль:
- premium
- restrained
- dark + gold
- сильная геометрия
- минимум шума
- короткий русский copy

Ключевые файлы:
- /Users/saymurrbk.ru/Desktop/Проекты/Академический салон/academic_saloon-main/library-app/src/app.tsx
- /Users/saymurrbk.ru/Desktop/Проекты/Академический салон/academic_saloon-main/library-app/src/main.tsx
- /Users/saymurrbk.ru/Desktop/Проекты/Академический салон/academic_saloon-main/library-app/src/styles.css
- /Users/saymurrbk.ru/Desktop/Проекты/Академический салон/academic_saloon-main/library-app/src/screens/CatalogScreen.tsx
- /Users/saymurrbk.ru/Desktop/Проекты/Академический салон/academic_saloon-main/library-app/src/screens/CategoriesScreen.tsx
- /Users/saymurrbk.ru/Desktop/Проекты/Академический салон/academic_saloon-main/library-app/src/screens/FavoritesScreen.tsx
- /Users/saymurrbk.ru/Desktop/Проекты/Академический салон/academic_saloon-main/library-app/src/screens/OrderScreen.tsx
- /Users/saymurrbk.ru/Desktop/Проекты/Академический салон/academic_saloon-main/library-app/src/screens/SupportScreen.tsx
- /Users/saymurrbk.ru/Desktop/Проекты/Академический салон/academic_saloon-main/library-app/src/components/DocumentSheet.tsx
- /Users/saymurrbk.ru/Desktop/Проекты/Академический салон/academic_saloon-main/library-app/src/lib/uiState.ts

Текущее состояние:
- каталог уже очищен от перегруза;
- разделы уже упрощены;
- tutorial удалён;
- в `Заказать` недавно был удалён блок сценариев, потому что он занимал слишком много места;
- `OrderDraft` в uiState.ts больше не содержит scenario.

Свежие ориентиры по коду:
- OrderScreen.tsx:
  - около строки 506: “Контекст: заявка собирается по примеру из каталога.”
  - около строки 508: “Контекст: срочная заявка.”
  - около строки 719: “Какой результат нужен”
  - около строки 1020: “Личный VK и MAX всегда под рукой”
- uiState.ts:
  - в OrderDraft больше нет scenario

Текущий главный экран для доработки:
- Заказать

Что нужно сделать:
1. Сначала внимательно прочитай текущие OrderScreen.tsx и поздние order/tablet overrides в styles.css.
2. Найди остаточный визуальный шум, повторяющиеся смыслы и геометрические перекосы.
3. Сделай экран короче, спокойнее и собраннее.
4. Затем, если всё хорошо, аналогично продолжи по Catalog, DocumentSheet, Categories, Favorites, Support.

Нельзя:
- снова добавлять tutorial;
- снова усложнять верхние поверхности;
- делать ещё один виток feature overload.

Сборка:
- cd "/Users/saymurrbk.ru/Desktop/Проекты/Академический салон/academic_saloon-main/library-app"
- npm run typecheck
- npm run build

Деплой:
- /opt/homebrew/bin/sshpass -p 'oFp?P3QTjAtF+s' rsync -az --delete -e 'ssh -o StrictHostKeyChecking=no' "/Users/saymurrbk.ru/Desktop/Проекты/Академический салон/academic_saloon-main/library-app/dist/" root@94.241.143.29:/var/www/salon/mobile/

Проверка:
- https://bibliosaloon.ru/app/?v=NNN
- https://bibliosaloon.ru/app/order/?v=NNN
- если PWA установлен, полностью закрыть и открыть заново

Главный критерий качества:
- стало ли чище?
- стало ли спокойнее?
- стало ли яснее?
- стало ли геометрически точнее?
- стало ли лучше на iPhone и iPad?
```

## 24. Итоговая суть handoff

Если коротко:

- проект уже зрелый;
- продукт перегружали, и это вызвало недовольство;
- сейчас ключевая задача не “нафичерить ещё”, а провести взрослую редактуру интерфейса;
- главный ближайший объект внимания — `Заказать`;
- держать курс на чистоту, премиальность и идеальную геометрию.
