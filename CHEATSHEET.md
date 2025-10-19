# ⚡ TeamPulse - Швидка Шпаргалка

## 🚀 Швидкий старт (3 команди)

```bash
# 1. Встановити OpenAI ключ (відредагувати .env)
nano .env  # або vim/vscode

# 2. Запустити сервер
npm run dev

# 3. Відкрити браузер
open http://localhost:3000
```

**Логін**: janeDVDops / jane2210

---

## 🔧 Основні команди

### Запуск
```bash
npm run dev      # Development з nodemon
npm start        # Production
npm run prod     # PM2 production
```

### Зупинка
```bash
# Зупинити процес на порту 3000
lsof -ti:3000 | xargs kill -9

# PM2
npm run stop
```

### Логи
```bash
npm run logs     # PM2 логи
tail -f logs/combined.log  # Файлові логи
```

---

## 🗄️ База даних

### Підключення
```bash
/usr/local/Cellar/postgresql@15/15.14/bin/psql -U postgres teampulse
```

### Статус PostgreSQL
```bash
brew services list | grep postgresql
brew services restart postgresql@15
```

### Очистка тестових даних
```bash
curl -X POST http://localhost:3000/api/admin/cleanup-database \
  -H "Content-Type: application/json" \
  -H "Cookie: auth=authorized" \
  -d '{"confirmCode": "CLEANUP_TEST_DATA_2024"}'
```

---

## 🔍 Перевірка здоровʼя

### Health check
```bash
curl http://localhost:3000/health | jq
```

### Ping
```bash
curl http://localhost:3000/ping
```

### API Info
```bash
curl http://localhost:3000/api/v1/info | jq
```

### Token usage
```bash
curl -H "Cookie: auth=authorized" \
  http://localhost:3000/api/usage | jq
```

---

## 🔐 Authentication

### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "janeDVDops", "password": "jane2210"}'
```

### Logout
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Cookie: auth=authorized"
```

### Verify auth
```bash
curl -H "Cookie: auth=authorized" \
  http://localhost:3000/api/v1/auth/verify | jq
```

---

## 📁 Важливі файли

```
.env                    # ⚠️ Конфігурація (додати API ключ!)
server.js               # Головний сервер
package.json            # Залежності
utils/db.js             # База даних
routes/                 # API endpoints
public/                 # Frontend
logs/                   # Логи
```

---

## ⚠️ Troubleshooting

### Порт зайнятий
```bash
lsof -ti:3000 | xargs kill -9
```

### База не підключається
```bash
brew services restart postgresql@15
```

### OpenAI помилка
```bash
# Перевірте .env - ключ має починатись з "sk-"
cat .env | grep OPENAI_API_KEY
```

### Відсутні модулі
```bash
npm install
```

---

## 🌐 URLs

- **App**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Health**: http://localhost:3000/health
- **API**: http://localhost:3000/api/v1/

---

## 📊 API Endpoints (основні)

```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/verify
GET    /api/v1/clients
POST   /api/v1/clients
GET    /api/v1/prospects
POST   /api/v1/prospects
POST   /api/v1/analyze
GET    /api/v1/teams
GET    /api/v1/negotiations
GET    /api/v1/stats
GET    /api/usage
```

---

## 🎯 Швидкі тести

### Повний тест системи
```bash
# 1. Health
curl -s http://localhost:3000/health | jq .status

# 2. Login
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "janeDVDops", "password": "jane2210"}' | jq .success

# 3. Get clients
curl -s -H "Cookie: auth=authorized" \
  http://localhost:3000/api/v1/clients | jq .success
```

---

## 🔑 Credentials

**Production**:
- User: `janeDVDops`
- Pass: `jane2210`

**Де змінити**: `server.js` рядок 236-237

---

## 📝 Змінні оточення (.env)

```bash
# Обовʼязкові
NODE_ENV=development
OPENAI_API_KEY=sk-proj-...    # ⚠️ ЗАМІНИТИ!

# База даних
PGHOST=localhost
PGPORT=5432
PGDATABASE=teampulse
PGUSER=postgres
PGPASSWORD=postgres

# Сервер
PORT=3000
HOST=0.0.0.0

# Опції
OPENAI_MODEL=gpt-4o
DAILY_TOKEN_LIMIT=512000
LOG_LEVEL=info
```

---

## 💡 Корисні поради

1. **Завжди перевіряйте health** перед роботою
2. **Логи - ваші друзі**: `tail -f logs/combined.log`
3. **jq для JSON**: `brew install jq`
4. **Vim режим в UI**: натисніть `?` в застосунку
5. **Command Palette**: `Ctrl+K` або `Cmd+K`

---

## 🎨 Keyboard Shortcuts (в застосунку)

- `Ctrl/Cmd + K` - Command Palette
- `Ctrl/Cmd + /` - Advanced Search
- `?` - Показати shortcuts / Start tour
- `Esc` - Закрити modal
- `j/k` - Навігація (Vim mode)

---

**Все готово! Швидкого старту! 🚀**
