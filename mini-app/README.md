# Academic Saloon Mini App 🤠

Premium личный кабинет для Telegram бота в ковбойском стиле.

## Деплой на Vercel

### Шаг 1: Установка зависимостей (локально)

```bash
cd mini-app
npm install
```

### Шаг 2: Тестирование (опционально)

```bash
npm run dev
```

Откроется на http://localhost:5173

### Шаг 3: Деплой на Vercel

**Вариант A: Через Vercel CLI**

```bash
npm install -g vercel
vercel
```

**Вариант B: Через GitHub**

1. Запушь репозиторий на GitHub
2. В Vercel: "Import Git Repository"
3. Выбери репозиторий
4. Root Directory: `mini-app`
5. Build Command: `npm run build`
6. Output Directory: `dist`

### Шаг 4: Настройка в BotFather

1. Открой @BotFather
2. /mybots → Выбери бота → Bot Settings → Menu Button
3. Укажи URL от Vercel (например: `https://academic-saloon.vercel.app`)

## Переменные окружения

Создай `.env` файл:

```
VITE_API_URL=https://your-bot-api.com/api
VITE_BOT_USERNAME=academic_saloon_bot
```

## Структура

```
mini-app/
├── src/
│   ├── api/          # API клиент
│   ├── components/   # UI компоненты
│   ├── hooks/        # React хуки
│   ├── pages/        # Страницы
│   ├── styles/       # Глобальные стили
│   ├── App.tsx       # Главный компонент
│   ├── main.tsx      # Точка входа
│   └── types.ts      # TypeScript типы
├── index.html
├── package.json
├── vite.config.ts
└── vercel.json
```

## Технологии

- React 18
- TypeScript
- Vite
- React Router
- Telegram Web App SDK
