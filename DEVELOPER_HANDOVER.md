# Developer Handover Document
## Academic Saloon - Telegram Bot + Mini App

**Дата аудита:** 2025-12-03
**Версия:** 2.0.0
**Статус проекта:** Production (работает на VPS)

---

## 1. Обзор проекта

### 1.1 Что это?
**Academic Saloon** — это Telegram-бот для заказа студенческих работ (курсовые, дипломы, рефераты и т.д.) с премиальным веб-интерфейсом (Mini App) в стиле "Cyberpunk Casino" для отслеживания заказов, профиля и геймификации.

### 1.2 Ключевые функции:

| Функция | Описание |
|---------|----------|
| **Заказ работ** | Пошаговый wizard в боте (тип работы -> предмет -> дедлайн -> файлы) |
| **Система оплаты** | P2P перевод + интеграция ЮKassa (онлайн) |
| **Live-карточки** | Заказы отображаются в Forum Topics админской супергруппы |
| **Приватный чат** | Двусторонняя связь клиент <-> админ через топики |
| **Mini App** | Премиальный UI: профиль, заказы, рулетка бонусов |
| **Система лояльности** | Ранги по сумме трат + скидки по количеству заказов |
| **Реферальная программа** | 5% от заказов приглашенных друзей |
| **Daily Luck** | Рулетка с ежедневными бонусами |

### 1.3 Бизнес-логика (User Journey):
```
Клиент                          Админ                           Система
   |                               |                                |
   |-- /start --------------------|--------------------------------|
   |  Выбирает тип работы          |                                |
   |  Заполняет детали             |                                |
   |  Отправляет заявку -----------|---> Карточка в Forum Topic ----|
   |                               |    Назначает цену              |
   |<-------------------------------------- Уведомление с ценой <---|
   |  Выбирает способ оплаты       |                                |
   |  Оплачивает ----------------->|    Подтверждает ---------------|
   |                               |    Выполняет работу            |
   |                               |    Обновляет прогресс ---------|
   |<-------------------------------------- Файлы готовой работы <--|
   |  Подтверждает получение ------|----------------------------->  |
   |                               |                  Начисление кэшбэка
```

---

## 2. Стек технологий

### 2.1 Backend (Python 3.11)

| Компонент | Технология | Версия | Назначение |
|-----------|------------|--------|------------|
| Bot Framework | aiogram | 3.10+ | Telegram Bot API, FSM |
| Web API | FastAPI | 0.109+ | REST API для Mini App |
| ASGI Server | uvicorn | 0.27+ | Асинхронный веб-сервер |
| ORM | SQLAlchemy | 2.0+ | Async ORM, модели |
| Migrations | Alembic | 1.12+ | Версионирование схемы |
| Validation | Pydantic | 2.0+ | Конфиг, схемы API |
| Cache/FSM | Redis | 5.0+ | FSM storage, кэш |
| Payment | YooKassa SDK | 3.0+ | Онлайн-оплата |
| HTTP Client | httpx | 0.25+ | Внешние запросы |

### 2.2 Frontend (React + TypeScript)

| Компонент | Технология | Версия | Назначение |
|-----------|------------|--------|------------|
| UI Framework | React | 18.2 | Компонентный UI |
| Router | react-router-dom | 6.20 | SPA навигация |
| Telegram SDK | @telegram-apps/sdk-react | 1.0 | Интеграция с Telegram |
| Animations | framer-motion | 11.0 | Премиальные анимации |
| Icons | lucide-react | 0.400 | Иконки |
| Bundler | Vite | 5.0 | Быстрая сборка |
| Language | TypeScript | 5.3 | Типизация |

### 2.3 Инфраструктура

| Компонент | Технология | Описание |
|-----------|------------|----------|
| Database | PostgreSQL 15 | Основное хранилище (Docker Alpine) |
| Cache | Redis 7 | FSM + кэширование (Docker Alpine) |
| VPS | Linux | Собственный сервер |
| Containers | Docker Compose | Оркестрация сервисов |
| Reverse Proxy | Nginx | SSL termination, /api/* проксирование |
| Frontend CDN | Vercel | Хостинг Mini App |
| SSL | Let's Encrypt | Автообновляемые сертификаты |
| Domain | DuckDNS | Бесплатный динамический DNS |

---

## 3. Архитектура

### 3.1 Схема взаимодействия компонентов

```
+-----------------------------------------------------------------------------+
|                              КЛИЕНТЫ                                         |
|  [Telegram App]                              [Mini App Browser]              |
+-------------+-------------------------------------------+-------------------+
              |                                           |
              | Telegram Bot API                          | HTTPS
              | (Long Polling)                            |
              v                                           v
+-------------------------+              +------------------------------------+
|    Telegram Servers     |              |   Vercel CDN                       |
|                         |              |   academic-saloon.vercel.app       |
+-------------+-----------+              +-------------------+----------------+
              |                                              |
              |                                              | /api/* requests
              v                                              v
+-----------------------------------------------------------------------------+
|                            VPS SERVER                                        |
|  +-----------------------------------------------------------------------+  |
|  |                           NGINX                                        |  |
|  |   - SSL termination (Let's Encrypt)                                   |  |
|  |   - Reverse proxy: /api/* -> localhost:8000                           |  |
|  |   - Domain: academic-saloon.duckdns.org                               |  |
|  +-----------------------------------------------------------------------+  |
|                                    |                                         |
|                                    v                                         |
|  +-----------------------------------------------------------------------+  |
|  |                      DOCKER COMPOSE                                    |  |
|  |                                                                        |  |
|  |  +--------------+  +--------------+  +----------------------------+   |  |
|  |  |  PostgreSQL  |  |    Redis     |  |      Bot Container         |   |  |
|  |  |   :5432      |  |    :6379     |  |                            |   |  |
|  |  |              |  |              |  |  main.py                   |   |  |
|  |  |  - users     |  |  - FSM       |  |    +-- aiogram Bot        |   |  |
|  |  |  - orders    |  |  - Cache     |  |    +-- FastAPI :8000      |   |  |
|  |  |  - messages  |  |              |  |                            |   |  |
|  |  +------+-------+  +------+-------+  +------------+---------------+   |  |
|  |         |                 |                       |                   |  |
|  |         +-----------------+-----------------------+                   |  |
|  |                        saloon_net (bridge)                            |  |
|  +-----------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------+
```

### 3.2 Telegram Integration IDs

```python
# Системные каналы и группы
LOG_CHANNEL_ID = -1003300275622       # Канал логов (все действия пользователей)
ORDERS_CHANNEL_ID = -1003331104298    # [DEPRECATED] Старый канал карточек
ADMIN_GROUP_ID = -1003352978651       # Супергруппа с Forum Topics (основная)
```

### 3.3 API Authentication Flow

```
+-------------+     +-------------+     +-------------+     +-------------+
|  Mini App   |---->|  Telegram   |---->|   FastAPI   |---->|  Database   |
|             |     |  WebApp     |     |   /api/*    |     |             |
+-------------+     +-------------+     +-------------+     +-------------+
       |                   |                   |
       | window.Telegram   | initData          | HMAC-SHA256
       | .WebApp.initData  | (signed)          | validation
       |                   |                   |
       +-------------------+-------------------+
                           |
                   X-Telegram-Init-Data header
```

---

## 4. Структура проекта (File Tree)

```
academic_saloon/
|-- main.py                    # Entry point: Bot + FastAPI concurrent
|-- requirements.txt           # Python dependencies
|-- Dockerfile                 # Python 3.11-slim image
|-- docker-compose.yml         # Services: db + redis + bot
|-- alembic.ini               # Migrations config
|-- .env.example              # Environment template
|
|-- core/                      # Core modules
|   |-- config.py             # Pydantic Settings (all env vars)
|   |-- redis_pool.py         # Redis connection pool
|   |-- media_cache.py        # Telegram file_id caching
|   +-- saloon_status.py      # Saloon open/closed status
|
|-- database/                  # Database layer
|   |-- db.py                 # SQLAlchemy engine + async session
|   |-- models/
|   |   |-- users.py          # User model (ranks, loyalty, bonuses)
|   |   +-- orders.py         # Order, OrderMessage, Conversation
|   +-- migrations/
|       |-- env.py            # Alembic environment
|       +-- versions/         # Migration files (15+ versions)
|
|-- bot/                       # Telegram Bot
|   |-- handlers/             # Command & callback handlers
|   |   |-- start.py          # /start + deep links + price setting
|   |   |-- orders.py         # FSM wizard (60k+ tokens, needs refactor)
|   |   |-- admin.py          # Admin panel, payment confirmation
|   |   |-- my_orders.py      # User's order history
|   |   |-- order_chat.py     # Private client-admin chat
|   |   |-- channel_cards.py  # Live order cards in channel
|   |   |-- menu.py           # Main menu
|   |   |-- terms.py          # Terms of service
|   |   +-- log_actions.py    # Log button handlers
|   |
|   |-- keyboards/            # Inline & Reply keyboards
|   |   |-- inline.py         # Main inline buttons
|   |   |-- orders.py         # Order wizard keyboards
|   |   |-- profile.py        # Profile keyboards
|   |   +-- terms.py          # Terms buttons
|   |
|   |-- middlewares/          # Middleware chain
|   |   |-- error_handler.py  # Global error handling
|   |   |-- db_session.py     # Session injection
|   |   |-- ban_check.py      # Ban verification
|   |   |-- antispam.py       # Spam protection
|   |   +-- stop_words.py     # Stop words filter
|   |
|   |-- services/             # Business logic services
|   |   |-- logger.py         # Channel logging (LogEvent enum)
|   |   |-- pricing.py        # Price calculation
|   |   |-- live_cards.py     # Live card updates in topics
|   |   |-- bonus.py          # Bonus system (BonusService)
|   |   |-- yookassa.py       # YooKassa integration
|   |   |-- yandex_disk.py    # Yandex.Disk file upload
|   |   |-- abandoned_detector.py  # Abandoned cart tracking
|   |   |-- silence_reminder.py    # Silence reminders
|   |   |-- daily_stats.py    # Daily statistics
|   |   |-- unified_hub.py    # Service topics initialization
|   |   +-- order_progress.py # Order progress tracking
|   |
|   |-- states/               # FSM states
|   |   |-- order.py          # Order wizard states
|   |   |-- admin.py          # Admin states
|   |   +-- chat.py           # Chat states
|   |
|   |-- texts/                # Text templates
|   |   +-- terms.py          # Terms of service text
|   |
|   |-- utils/                # Utilities
|   |   |-- message_helpers.py # Safe message editing
|   |   +-- media_group.py    # Media group handling
|   |
|   |-- media/                # Bot images (not in git)
|   |
|   +-- api/                  # FastAPI for Mini App
|       |-- __init__.py       # api_app export
|       |-- app.py            # FastAPI factory + CORS
|       |-- routes.py         # API endpoints
|       |-- schemas.py        # Pydantic response models
|       +-- auth.py           # HMAC-SHA256 Telegram auth
|
+-- mini-app/                  # React Mini App
    |-- package.json          # NPM dependencies
    |-- vite.config.ts        # Vite configuration
    |-- vercel.json           # Vercel deployment config
    |-- index.html            # Entry HTML
    +-- src/
        |-- main.tsx          # React entry point
        |-- App.tsx           # Router + main structure
        |-- types.ts          # TypeScript types
        |-- api/
        |   +-- userApi.ts    # API client (fetch + auth)
        |-- hooks/
        |   +-- useUserData.ts # Data fetching hooks + Telegram utils
        |-- pages/
        |   |-- HomePage.tsx      # Dashboard with orders carousel
        |   |-- OrdersPage.tsx    # Orders list
        |   |-- OrderDetailPage.tsx # Order details
        |   |-- ProfilePage.tsx   # Bento-grid analytics dashboard
        |   +-- RoulettePage.tsx  # Cyberpunk casino roulette
        |-- components/
        |   |-- Navigation.tsx    # Bottom navigation
        |   |-- LoadingScreen.tsx # Loading state
        |   +-- OrdersCarousel.tsx # Horizontal orders carousel
        +-- styles/
            +-- global.css        # Global styles (CSS variables)
```

---

## 5. Ключевые модели данных

### 5.1 User Model (`database/models/users.py`)

```python
class User(Base):
    __tablename__ = "users"

    # Identity
    id: int                      # Internal PK
    telegram_id: int             # Telegram user ID (unique, indexed)
    username: str | None         # @username
    fullname: str | None         # Display name
    role: str                    # "user" | "admin"

    # Financials
    balance: float               # Bonus balance (cashback, referrals)

    # Referral System
    referrer_id: int | None      # Who referred this user
    referrals_count: int         # How many users referred
    referral_earnings: float     # Earnings from referrals

    # Statistics
    orders_count: int            # Total orders placed
    total_spent: float           # Total amount spent

    # Daily Bonus
    last_daily_bonus_at: datetime | None  # Last roulette spin

    # Terms
    terms_accepted_at: datetime | None    # Implicit consent timestamp

    # Moderation
    is_banned: bool
    banned_at: datetime | None
    ban_reason: str | None
    is_watched: bool             # Surveillance mode
    admin_notes: str | None

    # Computed Properties
    @property rank_info          # Rank based on total_spent
    @property loyalty_status     # Status based on orders_count
    @property can_claim_daily_bonus
```

**Rank Levels (spend-based):**

| Min Spent | Rank | Emoji | Cashback |
|-----------|------|-------|----------|
| 50,000 RUB | Легенда Запада | crown | 10% |
| 20,000 RUB | Головорез | gun | 7% |
| 5,000 RUB | Ковбой | cowboy | 3% |
| 0 RUB | Салага | chick | 0% |

**Loyalty Levels (orders-based):**

| Min Orders | Status | Discount |
|------------|--------|----------|
| 15 | Легенда салуна | 15% |
| 7 | Шериф | 10% |
| 3 | Завсегдатай | 5% |
| 0 | Новичок | 0% |

### 5.2 Order Model (`database/models/orders.py`)

```python
class OrderStatus(str, enum.Enum):
    DRAFT = "draft"                      # Being filled
    PENDING = "pending"                  # Waiting for evaluation
    WAITING_ESTIMATION = "waiting_estimation"  # Special order pricing
    WAITING_PAYMENT = "waiting_payment"  # Price set, awaiting payment
    VERIFICATION_PENDING = "verification_pending"  # Payment verification
    CONFIRMED = "confirmed"              # Legacy status
    PAID = "paid"                        # Advance paid
    PAID_FULL = "paid_full"             # Fully paid
    IN_PROGRESS = "in_progress"         # Work in progress
    REVIEW = "review"                    # Ready for client review
    COMPLETED = "completed"              # Done
    CANCELLED = "cancelled"              # Cancelled by user
    REJECTED = "rejected"                # Rejected by admin

class WorkType(str, enum.Enum):
    MASTERS = "masters"          # Магистерская
    DIPLOMA = "diploma"          # Диплом (ВКР)
    COURSEWORK = "coursework"    # Курсовая
    INDEPENDENT = "independent"  # Самостоятельная
    ESSAY = "essay"              # Эссе
    REPORT = "report"            # Реферат
    CONTROL = "control"          # Контрольная
    PRESENTATION = "presentation"# Презентация
    PRACTICE = "practice"        # Отчёт по практике
    OTHER = "other"              # Спецзадача
    PHOTO_TASK = "photo_task"    # Фото задания

class Order(Base):
    __tablename__ = "orders"

    id: int
    user_id: int                 # FK -> users.telegram_id (NOT users.id!)

    # Order details
    work_type: str
    subject: str | None
    topic: str | None
    description: str | None
    deadline: str | None

    # Financials
    price: float                 # Base price
    discount: float              # Discount percentage
    bonus_used: float            # Bonuses applied
    paid_amount: float           # Amount paid

    # Payment
    payment_scheme: str | None   # "full" | "half"
    payment_method: str | None   # "card" | "sbp" | "transfer"
    yookassa_payment_id: str | None

    # Status & Progress
    status: str
    progress: int                # 0-100%
    progress_updated_at: datetime | None

    # Live Card
    channel_message_id: int | None  # Message ID in channel (deprecated)

    # Computed
    @property final_price        # price * (1 - discount/100) - bonus_used
    @property work_type_label    # Human-readable label with emoji
    @property status_label       # Status with emoji
```

### 5.3 Conversation Model (Chat System)

```python
class Conversation(Base):
    """Tracks all client-admin conversations"""
    __tablename__ = "conversations"

    id: int
    user_id: int                 # FK -> users.telegram_id
    order_id: int | None         # FK -> orders.id (optional)
    topic_id: int | None         # Forum Topic ID in admin group
    topic_card_message_id: int | None  # Pinned card in topic
    conversation_type: str       # "order_chat" | "support" | "free"
    last_message_text: str | None
    last_message_at: datetime
    last_sender: str | None      # "admin" | "client"
    is_active: bool
    is_archived: bool
    unread_count: int
```

---

## 6. API Reference

### 6.1 Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Health check |
| GET | `/api/config` | No | Public config (bot_username, support) |
| GET | `/api/user` | Yes | User profile + orders + rank + loyalty |
| GET | `/api/orders` | Yes | Paginated orders list |
| GET | `/api/orders/{id}` | Yes | Single order details |
| POST | `/api/promo` | Yes | Apply promo code |
| POST | `/api/roulette/spin` | Yes | Daily roulette spin |

### 6.2 Authentication

All authenticated endpoints require `X-Telegram-Init-Data` header with Telegram WebApp initData.

**Validation algorithm:**
```python
# 1. Parse initData as URL query string
# 2. Extract 'hash' parameter
# 3. Build data_check_string from remaining sorted params
# 4. Compute HMAC-SHA256:
#    secret_key = HMAC-SHA256("WebAppData", bot_token)
#    computed_hash = HMAC-SHA256(secret_key, data_check_string)
# 5. Compare computed_hash with received hash
# 6. Check auth_date is within 24 hours
```

### 6.3 Response Schemas

```typescript
// UserResponse
interface UserResponse {
  id: number;
  telegram_id: number;
  username: string | null;
  fullname: string;
  balance: number;
  bonus_balance: number;
  orders_count: number;
  total_spent: number;
  discount: number;
  referral_code: string;
  daily_luck_available: boolean;
  rank: RankInfo;
  loyalty: LoyaltyInfo;
  orders: OrderResponse[];
}

// OrderResponse
interface OrderResponse {
  id: number;
  status: OrderStatus;
  work_type: string;
  work_type_label: string;
  subject: string | null;
  topic: string | null;
  deadline: string | null;
  price: number;
  final_price: number;
  paid_amount: number;
  discount: number;
  bonus_used: number;
  progress: number;  // 0-100
  created_at: string;
  completed_at: string | null;
}
```

---

## 7. Mini App UI Architecture

### 7.1 Design System

**Color Palette (CSS Variables):**
```css
:root {
  --bg-void: #0a0a0c;           /* Darkest background */
  --bg-surface: #14141a;        /* Card backgrounds */
  --gold-200: #f5d061;          /* Light gold */
  --gold-300: #e6c547;          /* Primary gold */
  --gold-400: #d4af37;          /* Standard gold */
  --gold-600: #8b6914;          /* Dark gold */
  --text-primary: #f5f5f5;      /* Main text */
  --text-secondary: #a0a0a0;    /* Secondary text */
  --text-muted: #666666;        /* Muted text */
}
```

**Typography:**
- Display: `Playfair Display` (headings)
- Mono: `JetBrains Mono` (numbers, codes)
- Body: System fonts

### 7.2 Page Components

**HomePage** - Dashboard with:
- Welcome header with user rank badge
- Stats grid (orders, balance, discount)
- Horizontal OrdersCarousel with active orders
- Quick action buttons

**ProfilePage** - Bento grid analytics:
- Identity card (avatar, name, rank, member since)
- Referral program block (gold variant)
- 2x2 stats grid (orders, savings, discount, support)
- Progress to next level
- Archive block (completed orders)

**RoulettePage** - Cyberpunk casino:
- Premium metallic wheel with 8 segments
- Glass cover overlay effect
- Animated pointer with haptic feedback
- Bet selector (50-500 RUB)
- Result banner with animations

**OrderDetailPage** - Order info:
- Status badge with progress bar
- Order details (type, subject, deadline)
- Price breakdown (base, discount, bonus)
- Action buttons (chat, cancel)

### 7.3 Key UI Components

```typescript
// OrdersCarousel - Horizontal scrolling orders
<OrdersCarousel orders={orders} onOrderClick={handleClick} />

// Navigation - Bottom tab bar
<Navigation />  // Home | Orders | Roulette | Profile

// LoadingScreen - Skeleton loader
<LoadingScreen />  // Shows during data fetch
```

---

## 8. Environment Variables

### 8.1 Required Variables

```bash
# BOT CONFIGURATION
BOT_TOKEN=                    # From @BotFather
BOT_USERNAME=                 # Without @, e.g., "Kladovaya_GIPSR_bot"
ADMIN_IDS=[123456789]         # JSON array of admin telegram IDs

# DATABASE (PostgreSQL)
POSTGRES_USER=saloon
POSTGRES_PASSWORD=            # Strong password
POSTGRES_DB=saloon_db
POSTGRES_HOST=db              # "db" for Docker, "localhost" for dev
POSTGRES_PORT=5432

# CACHE (Redis)
REDIS_HOST=redis              # "redis" for Docker
REDIS_PORT=6379
REDIS_DB_FSM=0                # FSM storage
REDIS_DB_CACHE=1              # General cache

# PAYMENT (P2P Manual)
PAYMENT_PHONE=89001234567     # SBP phone number
PAYMENT_CARD=2200000000000000 # Card number
PAYMENT_BANKS=Сбер / Т-Банк   # Available banks
PAYMENT_NAME=Имя Фамилия      # Recipient name
```

### 8.2 Optional Variables

```bash
# YOOKASSA (Online Payment)
YOOKASSA_SHOP_ID=             # Shop ID from YooKassa
YOOKASSA_SECRET_KEY=          # API secret key

# YANDEX.DISK (File Storage)
YANDEX_DISK_TOKEN=            # OAuth token
YANDEX_DISK_FOLDER=Academic_Saloon_Orders  # Root folder
```

---

## 9. Infrastructure Configs

### 9.1 Docker Compose (`docker-compose.yml`)

```yaml
version: '3.9'

services:
  db:
    image: postgres:15-alpine
    container_name: saloon_postgres
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s

  redis:
    image: redis:7-alpine
    container_name: saloon_redis
    restart: always
    volumes:
      - redis_data:/data

  bot:
    build: .
    container_name: saloon_bot
    restart: always
    command: python main.py
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    ports:
      - "8000:8000"  # FastAPI

volumes:
  pg_data:
  redis_data:

networks:
  default:
    name: saloon_net
```

### 9.2 Nginx Config (Example)

```nginx
server {
    listen 443 ssl http2;
    server_name academic-saloon.duckdns.org;

    ssl_certificate /etc/letsencrypt/live/academic-saloon.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/academic-saloon.duckdns.org/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name academic-saloon.duckdns.org;
    return 301 https://$host$request_uri;
}
```

### 9.3 Vercel Config (`mini-app/vercel.json`)

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "ALLOWALL" }
      ]
    }
  ]
}
```

---

## 10. Current Status

### 10.1 Working Features

- [x] Telegram Bot (long polling mode)
- [x] User registration with referral system
- [x] Order wizard (all work types)
- [x] 13 order statuses with full lifecycle
- [x] Live cards in Forum Topics
- [x] Private client-admin chat via topics
- [x] FastAPI + Mini App REST API
- [x] Telegram initData authentication (HMAC-SHA256)
- [x] Mini App on Vercel
  - [x] Home page with orders carousel
  - [x] Profile page (bento grid)
  - [x] Orders list with filtering
  - [x] Order detail page
  - [x] Cyberpunk roulette with haptic feedback
- [x] SSL via Let's Encrypt
- [x] Nginx reverse proxy
- [x] Docker deployment
- [x] Rank & loyalty system
- [x] Daily bonus (roulette)
- [x] GOD MODE for admin roulette testing

### 10.2 Known Issues / Technical Debt

| Issue | Description | Priority |
|-------|-------------|----------|
| **Hardcoded API URL** | `userApi.ts` has hardcoded URL instead of env | Low |
| **Large orders.py** | 60k+ tokens, needs refactoring into modules | Medium |
| **Deprecated channel** | `ORDERS_CHANNEL_ID` unused, code remains | Low |
| **Dual progress source** | Progress can be auto or manual, potential conflicts | Low |
| **Implicit consent** | Users auto-accept terms on /start (no barrier) | Design choice |
| **No unit tests** | No automated testing coverage | High |
| **No CI/CD** | Manual deployment only | Medium |

### 10.3 GOD MODE Feature

Admin user (telegram_id: 872379852) has unlimited roulette spins for testing:
```python
# bot/api/routes.py
if user.telegram_id == 872379852:
    can_spin = True
    logger.info(f"GOD MODE: Allowing infinite spin for admin")
```

---

## 11. Development Guide

### 11.1 Local Development (Without Docker)

```bash
# 1. Clone repository
git clone <repo-url> && cd academic_saloon

# 2. Create virtual environment
python -m venv venv && source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env with your values

# 5. Start PostgreSQL + Redis (Docker)
docker-compose up -d db redis

# 6. Apply migrations
alembic upgrade head

# 7. Run bot + API
python main.py
```

### 11.2 VPS Deployment

```bash
# 1. Pull latest code
cd /path/to/academic_saloon
git pull origin main

# 2. Rebuild and restart
docker-compose build
docker-compose up -d

# 3. Check logs
docker-compose logs -f bot

# 4. Apply new migrations (if any)
docker-compose exec bot alembic upgrade head
```

### 11.3 Mini App Development

```bash
cd mini-app

# Install dependencies
npm install

# Development server (localhost:5173)
npm run dev

# Production build
npm run build

# Deploy to Vercel
vercel --prod
```

### 11.4 Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one version
alembic downgrade -1

# View history
alembic history
```

---

## 12. Quick Reference

### 12.1 Important Paths

| Path | Description |
|------|-------------|
| `/home/user/academic_saloon` | Project root |
| `main.py` | Entry point |
| `core/config.py` | All settings |
| `database/models/` | ORM models |
| `bot/handlers/` | Bot handlers |
| `bot/api/` | FastAPI app |
| `mini-app/src/` | React source |

### 12.2 URLs

| Resource | URL |
|----------|-----|
| Production Bot | @Kladovaya_GIPSR_bot |
| Mini App | Opens via Telegram WebApp |
| API Docs | https://academic-saloon.duckdns.org/api/docs |
| API ReDoc | https://academic-saloon.duckdns.org/api/redoc |
| Support | @Thisissaymoon |
| Terms | https://telegra.ph/Bolshoj-Kodeks-Akademicheskogo-Saluna-11-30 |

### 12.3 Useful Commands

```bash
# View bot logs
docker-compose logs -f bot

# Restart bot only
docker-compose restart bot

# Database shell
docker-compose exec db psql -U saloon -d saloon_db

# Redis CLI
docker-compose exec redis redis-cli

# Check disk space
df -h

# Check container resources
docker stats
```

---

## 13. Contact & Resources

| Resource | Details |
|----------|---------|
| Repository | GitHub (private) |
| Production Bot | @Kladovaya_GIPSR_bot |
| Admin Support | @Thisissaymoon |
| Domain | academic-saloon.duckdns.org |
| Frontend Hosting | Vercel |
| SSL | Let's Encrypt (auto-renew) |

---

*Document generated: 2025-12-03*
*Version: 2.0.0*
*Last updated by: Technical Audit Agent*
