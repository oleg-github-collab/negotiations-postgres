# UX Improvements - TeamPulse Turbo

## 🎯 Overview

Впроваджено сучасні UX практики та покращений user flow для роботи з потенційними та активними клієнтами.

---

## ✨ Ключові покращення

### 1. **Prospects Manager** - Управління потенційними клієнтами

#### Features:
- **Картки клієнтів** з візуальними індикаторами статусу та ризиків
- **Bulk operations** - масові дії над вибраними клієнтами
- **Smart filtering** - фільтрація по статусу, ризику, сектору
- **Real-time search** з debounce для швидкого пошуку
- **Keyboard shortcuts** для швидкої роботи

#### Статуси prospects:
- `active` - Активні переговори (синій)
- `promising` - Перспективний (зелений)
- `risky` - Ризиковий (помаранчевий)
- `converted` - Конвертовано (зелений з галочкою)
- `rejected` - Відхилено (сірий)

#### Рівні ризику:
- `low` - Низький ризик
- `medium` - Середній ризик
- `high` - Високий ризик
- `critical` - Критичний
- `unknown` - Невідомо (за замовчуванням)

---

### 2. **Universal Search API**

Глобальний пошук по всіх сутностях:

```javascript
GET /api/v1/search?q=текст&types=prospects,clients,teams,analyses&limit=50
```

Autocomplete suggestions:
```javascript
GET /api/v1/search/suggestions?q=тек&limit=10
```

---

### 3. **Prospects API Endpoints**

#### Отримати список prospects:
```http
GET /api/v1/prospects
Query params:
  - search: string
  - status: active|promising|risky|converted|rejected
  - risk_level: low|medium|high|critical
  - sort: recent|name|risk|date
  - limit: number (default 100)
  - offset: number (default 0)
```

#### Створити prospect:
```http
POST /api/v1/prospects
Body: {
  company: string (required),
  negotiator: string,
  email: string,
  phone: string,
  sector: string,
  company_size: string,
  negotiation_type: string,
  deal_value: string,
  goal: string,
  notes: string
}
```

#### Оновити prospect:
```http
PUT /api/v1/prospects/:id
Body: { ...fields to update }
```

#### Конвертувати в активного клієнта:
```http
POST /api/v1/prospects/:id/convert
Body: {
  type: 'teamhub',
  team_size: number,
  additional_data: object
}
```

#### Додати замітку:
```http
POST /api/v1/prospects/:id/notes
Body: {
  note: string,
  type: 'general'|'important'|'warning'
}
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Фокус на пошук |
| `Ctrl/Cmd + N` | Створити новий prospect |
| `Ctrl/Cmd + A` | Вибрати всі prospects |
| `Escape` | Скасувати вибір |

---

## 🔄 User Flow

### Робота з потенційними клієнтами:

```
1. CREATE PROSPECT
   └─> Натиснути "Новий клієнт" або Ctrl+N
   └─> Заповнити форму (компанія, контакти, мета)
   └─> Зберегти

2. ADD ANALYSES
   └─> Вибрати prospect зі списку
   └─> Натиснути "Новий аналіз"
   └─> Завантажити файл/текст/фото
   └─> Обрати опції аналізу
   └─> Запустити AI аналіз

3. MONITOR RISK
   └─> Barometer автоматично розраховує ризик
   └─> Статус оновлюється на основі аналізів
   └─> Badges показують поточний стан

4. CONVERT TO CLIENT
   └─> Натиснути іконку конвертації
   └─> Обрати тип клієнта (Enterprise/Mid-Market/Startup)
   └─> Вказати розмір команди
   └─> Підтвердити конвертацію
   └─> Prospect → Active Client (TeamHub)
```

---

## 📊 Bulk Operations

### Можливості:

1. **Масове оновлення статусу**
   - Вибрати кілька prospects (checkbox)
   - Натиснути "Змінити статус"
   - Обрати новий статус

2. **Масова конвертація**
   - Вибрати prospects для конвертації
   - Натиснути "Конвертувати"
   - Всі обрані стають активними клієнтами

3. **Масове видалення**
   - Вибрати непотрібні prospects
   - Натиснути "Видалити"
   - Підтвердити дію

---

## 🎨 UI Components

### Prospect Card
- Avatar з першою літерою компанії
- Checkbox для bulk selection
- Назва компанії та контактна особа
- Sector та інші метадані
- Status badge (active/promising/risky)
- Risk level badge з кольоровим індикатором
- Статистика аналізів
- Кнопки швидких дій (конвертувати, меню)

### Bulk Toolbar
- З'являється при виборі >0 prospects
- Показує кількість вибраних
- Кнопки масових операцій
- Анімація появи/зникнення

### Empty States
- Коли немає prospects - кнопка "Створити першого"
- Коли пошук не дав результатів - іконка лупи
- Коли немає аналізів - пропозиція створити перший

---

## 🔍 Smart Filters

### Доступні фільтри:

1. **Текстовий пошук** (по компанії, переговорнику, сектору)
2. **Статус** (dropdown з всіма статусами)
3. **Рівень ризику** (dropdown)
4. **Сортування**:
   - Recent (за датою створення ↓)
   - Name (за назвою ↑)
   - Risk (за ризиком ↓)
   - Date (за датою ↑)

Фільтри можна комбінувати для точного пошуку.

---

## 💡 Best Practices

### Для користувачів:

1. **Створюйте prospects** одразу після першого контакту
2. **Додавайте аналізи** регулярно під час переговорів
3. **Оновлюйте статус** на основі прогресу
4. **Додавайте замітки** з важливими деталями
5. **Конвертуйте** тільки після позитивних аналізів
6. **Використовуйте bulk operations** для економії часу

### Для розробників:

1. API використовує `/api/v1/` prefix
2. Всі дати в ISO 8601 format
3. JSONB поле `notes` для flexible metadata
4. `client_type` розділяє prospects та active clients
5. Pagination через `limit` та `offset`
6. Search працює через ILIKE для case-insensitive пошуку

---

## 📈 Metrics & Analytics

ProspectsManager автоматично збирає статистику:
- Загальна кількість prospects
- Кількість активних переговорів
- Кількість перспективних клієнтів
- Кількість ризикових ситуацій

Відображається в sidebar stats:
```html
<div class="sidebar-stats">
  <div class="stat-mini">
    <span class="stat-value">25</span>
    <span class="stat-label">Всього</span>
  </div>
  <div class="stat-mini">
    <span class="stat-value">12</span>
    <span class="stat-label">Активні</span>
  </div>
  <div class="stat-mini">
    <span class="stat-value">8</span>
    <span class="stat-label">Перспективні</span>
  </div>
</div>
```

---

## 🚀 Future Enhancements

Плануються:
- [ ] Kanban view для prospects pipeline
- [ ] Drag & drop для зміни статусів
- [ ] Timeline view для історії взаємодій
- [ ] Email integration для автоматичних нагадувань
- [ ] Advanced analytics dashboard
- [ ] Export to CSV/Excel
- [ ] Custom fields для prospects
- [ ] Tags system для кращої категоризації

---

## 🐛 Troubleshooting

### Prospects не завантажуються
1. Перевірити console на помилки API
2. Переконатись що `/api/v1/prospects` доступний
3. Перевірити авторизацію (cookies)

### Bulk operations не працюють
1. Переконатись що є вибрані prospects
2. Перевірити що ProspectsManager ініціалізований
3. Дивитись на response від API в Network tab

### Keyboard shortcuts не спрацьовують
1. Перевірити що немає активних modals
2. Переконатись що фокус не в input полях
3. Спробувати перезавантажити сторінку

---

**Автор:** Claude Code
**Дата:** October 2025
**Версія:** 3.0
