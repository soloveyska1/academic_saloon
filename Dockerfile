# Базовый образ Python 3.11 (облегченный)
FROM python:3.11-slim

# Отключаем создание .pyc файлов и буферизацию вывода (чтобы логи шли сразу)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Рабочая папка внутри контейнера
WORKDIR /app

# Сначала копируем только зависимости (для кэширования слоев Docker)
COPY requirements.txt .

# Устанавливаем зависимости
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Копируем весь остальной код проекта
COPY . .

# (Команда запуска прописана в docker-compose, тут она как запасной вариант)
CMD ["python", "main.py"]