# TeamPulse - Інструкція по Запуску

## 🚀 Швидкий Старт

### 1. Перевірте середовище

```bash
# Перевірте версію Node.js (потрібно >=14)
node --version

# Перевірте версію npm
npm --version
```

### 2. Встановіть залежності

```bash
cd "/Users/olehkaminskyi/Desktop/Teampulse Negotiations Postgres"
npm install
```

### 3. Перевірте змінні середовища

Переконайтесь що файл `.env` існує і містить:

```env
NODE_ENV=development
PORT=3000
OPENAI_API_KEY=your_openai_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/teampulse
```

### 4. Ініціалізуйте базу даних (якщо потрібно)

```bash
# Якщо використовуєте PostgreSQL локально
psql -U postgres -c "CREATE DATABASE teampulse;"

# Запустіть міграції (якщо є)
npm run migrate
```

### 5. Запустіть сервер

```bash
npm start
```

Або для development з auto-reload:

```bash
npm run dev
```

### 6. Відкрийте в браузері

```
http://localhost:3000/login.html
```

### 7. Авторизуйтесь

```
Username: janeDVDops
Password: jane2210
```

---

## 🔧 Вирішення Проблем

### Проблема: "Cannot find module"

**Рішення:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Проблема: "Port 3000 is already in use"

**Рішення:**
```bash
# Знайти процес
lsof -i :3000

# Вбити процес
kill -9 <PID>

# Або використати інший порт
PORT=3001 npm start
```

### Проблема: "Database connection failed"

**Рішення:**
```bash
# Перевірте чи запущений PostgreSQL
pg_isready

# Перевірте credentials в .env
cat .env | grep DATABASE_URL
```

### Проблема: "CSP violations in console"

**Статус:** ✅ ВИПРАВЛЕНО

Додано в server.js:
```javascript
scriptSrcAttr: ["'unsafe-inline'"],
fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", ...],
```

### Проблема: "OnboardingTour.startTour is not a function"

**Статус:** ✅ ВИПРАВЛЕНО

Метод перейменовано на `OnboardingTour.start()` в app-init.js

### Проблема: "TeamHub.loadClients is not a function"

**Статус:** ✅ ВИПРАВЛЕНО

Використовується правильний метод `TeamHub.loadActiveClients()`

### Проблема: "RichTextEditor container not found"

**Статус:** ✅ ВИПРАВЛЕНО

RichTextEditor тепер перевіряє наявність контейнера перед ініціалізацією

---

## 📊 Перевірка Статусу Системи

### Перевірте що сервер запущений:

```bash
curl http://localhost:3000/api/v1/info
```

Очікувана відповідь:
```json
{
  "name": "TeamPulse Turbo API",
  "version": "v1",
  "status": "operational",
  "timestamp": "2025-10-07T..."
}
```

### Перевірте Console в браузері:

Відкрийте DevTools (F12) і перевірте консоль. Повинні бути:

```
✅ UI Helpers loaded
✅ API Client initialized
✅ DataValidator initialized
✅ ErrorHandler initialized
🔐 Checking authentication...
✅ Authentication verified
🚀 Starting application initialization...
✅ Core utilities initialized
✅ UI components initialized
✅ Advanced features initialized
✅ Application initialized successfully
```

### Перевірте Network Tab:

Перейдіть на вкладку Network і перевірте:
- ✅ `/api/clients` - Status 200
- ✅ `/api/prospects` - Status 200
- ✅ Всі скрипти (.js) завантажились
- ✅ Всі стилі (.css) завантажились

---

## 🎯 Тестування Функціональності

### 1. Тест Login

1. Відкрийте http://localhost:3000/login.html
2. Введіть `janeDVDops` / `jane2210`
3. Натисніть "Увійти"
4. Переконайтесь що перенаправило на головну сторінку

### 2. Тест Prospects

1. Перейдіть на вкладку "Prospects"
2. Переконайтесь що prospects завантажились
3. Спробуйте створити новий prospect (кнопка "+")
4. Заповніть форму та збережіть

### 3. Тест Advanced Search

1. Натисніть `Ctrl+F` або кнопку пошуку
2. Виберіть критерії фільтрації
3. Натисніть "Шукати"
4. Переконайтесь що результати відфільтровані

### 4. Тест Bulk Operations

1. Натисніть `Shift+B` для активації bulk режиму
2. Виберіть кілька prospects
3. Використайте toolbar для масової операції
4. Переконайтесь що операція виконалась

### 5. Тест Keyboard Shortcuts

1. Натисніть `?` для показу довідки
2. Спробуйте `g h`, `g c` для навігації
3. Спробуйте `c p` для створення prospect
4. Переконайтесь що всі скорочення працюють

---

## 🐛 Debug Mode

Якщо щось не працює, увімкніть debug mode:

```javascript
// В консолі браузера
localStorage.setItem('debug', 'true');
location.reload();
```

Це додасть детальне логування всіх операцій.

---

## 📝 Корисні Команди

### Очистити кеш додатку:

```javascript
// В консолі браузера
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Перезапустити onboarding tour:

```javascript
// В консолі браузера
localStorage.removeItem('hasSeenWelcomeTour');
localStorage.removeItem('teampulse_tour_dismissed');
location.reload();
```

### Перевірити які модулі завантажились:

```javascript
// В консолі браузера
console.log(AppInit.modules);
```

### Перевірити стан APIClient:

```javascript
// В консолі браузера
console.log('Cache:', APIClient.cache);
console.log('Pending:', APIClient.pendingRequests);
console.log('Stats:', APIClient.stats);
```

---

## 🎨 Налаштування Інтерфейсу

### Увімкнути Vim режим:

```javascript
// В консолі або через Settings (кнопка шестерні)
KeyboardShortcuts.toggleVimMode();
```

### Змінити тему (якщо реалізовано):

```javascript
// В консолі
document.body.classList.add('dark-theme');
// або
document.body.classList.add('light-theme');
```

---

## 📦 Структура Проекту

```
Teampulse Negotiations Postgres/
├── server.js                 # Головний сервер
├── package.json              # Залежності
├── .env                      # Змінні середовища
├── routes/                   # API routes
│   ├── prospects.js
│   ├── clients.js
│   ├── teams.js
│   └── ...
├── public/                   # Frontend файли
│   ├── index.html           # Головна сторінка
│   ├── login.html           # Сторінка логіну
│   ├── app-init.js          # Ініціалізація додатку
│   ├── ui-helpers.js        # UI функції
│   ├── api-client.js        # API клієнт
│   ├── advanced-search.js   # Розширений пошук
│   ├── bulk-operations.js   # Масові операції
│   ├── keyboard-shortcuts.js # Клавіатурні скорочення
│   └── ...
└── utils/                    # Backend utilities
    ├── db.js
    └── logger.js
```

---

## 🔐 Безпека

### Production Mode

Для production встановіть:

```env
NODE_ENV=production
DATABASE_URL=your_production_db_url
```

### HTTPS

Для production використовуйте reverse proxy (nginx/Apache) з SSL:

```nginx
server {
    listen 443 ssl;
    server_name teampulse.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📞 Підтримка

При виникненні проблем:

1. Перевірте Console у браузері (F12)
2. Перевірте Network tab для failed requests
3. Перевірте логи сервера в терміналі
4. Перевірте файли в `logs/` директорії

---

## ✅ Чеклист Запуску

- [ ] Node.js >= 14 встановлено
- [ ] PostgreSQL запущений
- [ ] `npm install` виконано
- [ ] `.env` файл налаштовано
- [ ] База даних створена
- [ ] `npm start` запущено без помилок
- [ ] http://localhost:3000/login.html відкривається
- [ ] Логін працює
- [ ] Prospects завантажуються
- [ ] Advanced Search працює
- [ ] Bulk Operations працюють
- [ ] Keyboard Shortcuts працюють
- [ ] Немає помилок в Console

**Якщо всі пункти виконані - система працює коректно! 🎉**

---

**Останнє оновлення**: 7 Жовтня 2025
**Версія**: 2.0.0
