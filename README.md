# 🌊 Мониторинг реки Обь

Система мониторинга уровня воды в реке Обь с интеграцией данных Росгидромета.

## 🏗 Архитектура

- **Backend**: FastAPI (Python) - API сервер с парсингом данных
- **Frontend**: React - веб-интерфейс пользователя
- **Данные**: AllRivers.info + Росгидромет

## 🚀 Быстрый старт

### Вариант 1: Docker Compose (рекомендуется)

```bash
# 1. Клонировать код
git clone <your-repo>
cd ob-river-monitor

# 2. Запустить систему
docker-compose up -d

# 3. Открыть приложения
open http://localhost:3000  # React Frontend
open http://localhost:8000/docs  # FastAPI Docs
```

### Вариант 2: Локальная разработка

**Backend (FastAPI):**
```bash
cd backend
pip install -r requirements.txt
python main.py
# Доступен на http://localhost:8000
```

**Frontend (React):**
```bash
cd frontend
npm install
npm start
# Доступен на http://localhost:3000
```

## 📊 Станции мониторинга

- **Новосибирск** - 54.8527°N, 82.9899°E
- **Барнаул** - 53.3606°N, 83.7636°E  
- **Нижневартовск** - 60.9200°N, 76.6200°E
- **Мужи** - 63.5565°N, 66.3619°E

## 🔗 API Endpoints

- `GET /api/health` - состояние сервера
- `GET /api/stations` - все станции
- `GET /api/stations/{id}` - конкретная станция
- `GET /api/stations/{id}/history` - исторические данные
- `GET /api/summary` - сводная информация
- `POST /api/refresh` - принудительное обновление

## 📁 Структура файлов

```
ob-river-monitor/
├── backend/
│   ├── main.py              # FastAPI приложение
│   ├── requirements.txt     # Python зависимости
│   ├── Dockerfile          # Docker образ
│   └── .env               # Переменные окружения
├── frontend/
│   ├── src/
│   │   ├── App.js         # React компонент
│   │   └── index.js       # Точка входа
│   ├── public/
│   │   └── index.html     # HTML шаблон
│   ├── package.json       # Node.js зависимости
│   ├── Dockerfile         # Docker образ
│   ├── nginx.conf         # Nginx конфигурация
│   └── .env              # Переменные окружения
├── docker-compose.yml     # Оркестрация сервисов
└── README.md             # Документация
```

## 🔧 Разработка

### Команды Docker

```bash
# Запуск
docker-compose up -d

# Остановка
docker-compose down

# Просмотр логов
docker-compose logs -f backend
docker-compose logs -f frontend

# Пересборка
docker-compose build
docker-compose up -d
```

### Отладка

```bash
# Проверка API
curl http://localhost:8000/api/health

# Проверка фронтенда
curl http://localhost:3000/health

# Проверка данных станции
curl http://localhost:8000/api/stations/novosibirsk
```

## 📈 Мониторинг

- **Health checks** встроены в Docker контейнеры
- **Логирование** через stdout для Docker
- **API документация** доступна на `/docs`

## 🛠 Устранение неполадок

**Backend не запускается:**
```bash
# Проверить логи
docker-compose logs backend

# Проверить зависимости
cd backend && pip install -r requirements.txt
```

**Frontend не загружается:**
```bash
# Проверить логи
docker-compose logs frontend

# Пересобрать образ
docker-compose build frontend
```

**API недоступен:**
- Проверьте что backend запущен на порту 8000
- Проверьте настройки CORS в main.py
- Убедитесь что нет блокировки файрвола

## 📄 Лицензия

MIT License

---

**Разработано для мониторинга гидрологической обстановки реки Обь с интеграцией официальных данных Росгидромета.**