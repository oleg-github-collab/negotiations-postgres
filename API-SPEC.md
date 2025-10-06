# 🔌 API Specification для TeamPulse Turbo

## 📋 Загальна інформація

**Base URL:** `/api`
**Authentication:** JWT Bearer Token
**Content-Type:** `application/json`

---

## 🔐 Authentication

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}

Response 200:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

---

## 📊 Negotiations API (Потенційні клієнти)

### 1. Get Prospects List
```http
GET /api/negotiations/prospects
Authorization: Bearer {token}

Query Parameters:
- status: string (active, promising, risky, converted, rejected)
- sort: string (recent, name, risk, date)
- search: string

Response 200:
[
  {
    "id": 1,
    "name": "АкмеКорп",
    "contact": "Іван Петренко",
    "email": "ivan@acme.com",
    "phone": "+380501234567",
    "industry": "IT",
    "status": "active",
    "analyses_count": 5,
    "created_at": "2025-09-15T10:00:00Z",
    "updated_at": "2025-10-05T14:30:00Z"
  }
]
```

### 2. Create Prospect
```http
POST /api/negotiations/prospects
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "АкмеКорп",
  "contact": "Іван Петренко",
  "email": "ivan@acme.com",
  "phone": "+380501234567",
  "industry": "IT",
  "notes": "Перспективний клієнт з великим бюджетом"
}

Response 201:
{
  "id": 1,
  "name": "АкмеКорп",
  ...
  "created_at": "2025-10-06T12:00:00Z"
}
```

### 3. Get Prospect Details
```http
GET /api/negotiations/prospects/:id
Authorization: Bearer {token}

Response 200:
{
  "id": 1,
  "name": "АкмеКорп",
  "contact": "Іван Петренко",
  "email": "ivan@acme.com",
  "phone": "+380501234567",
  "industry": "IT",
  "status": "active",
  "notes": "...",
  "analyses_count": 5,
  "created_at": "2025-09-15T10:00:00Z",
  "updated_at": "2025-10-05T14:30:00Z"
}
```

---

## 🔬 Analysis API

### 1. Create Analysis
```http
POST /api/negotiations/analyze
Authorization: Bearer {token}
Content-Type: application/json

{
  "prospect_id": 1,
  "title": "Зустріч 15.10.2025",
  "date": "2025-10-15",
  "participants": ["Іван", "Марія", "Петро"],
  "text": "Іван: Пропоную знижку 20%\nМарія: Це остаточна ціна?\n...",
  "options": {
    "detect_manipulation": true,
    "detect_bias": true,
    "detect_fallacies": true,
    "detect_pressure": true,
    "sentiment_analysis": false,
    "generate_recommendations": true
  }
}

// АБО з файлом:
{
  "prospect_id": 1,
  "title": "Зустріч 15.10.2025",
  "file_content": "base64encodedcontent...",
  "file_name": "negotiations.pdf"
}

// АБО з зображеннями (OpenAI Vision):
{
  "prospect_id": 1,
  "title": "Презентація переговорів",
  "images": [
    {
      "data_url": "data:image/png;base64,...",
      "name": "slide1.png"
    },
    {
      "data_url": "data:image/jpeg;base64,...",
      "name": "slide2.jpg"
    }
  ],
  "options": { ... }
}

Response 201:
{
  "id": 15,
  "prospect_id": 1,
  "title": "Зустріч 15.10.2025",
  "date": "2025-10-15T00:00:00Z",
  "participants": ["Іван", "Марія", "Петро"],
  "risk_level": "medium",
  "manipulations_count": 7,
  "biases_count": 3,
  "findings": {
    "manipulations": [
      {
        "type": "artificial_scarcity",
        "speaker": "Іван",
        "quote": "Ця пропозиція доступна лише сьогодні",
        "severity": "high",
        "explanation": "Створення штучного дефіциту для тиску"
      }
    ],
    "biases": [
      {
        "type": "anchoring_bias",
        "speaker": "Марія",
        "quote": "Наша звичайна ціна - $10,000",
        "explanation": "Встановлення якоря для подальших переговорів"
      }
    ],
    "recommendations": [
      "Уникайте прийняття рішень під тиском",
      "Перевірте ринкові ціни перед погодженням"
    ]
  },
  "sentiment": {
    "overall": "neutral",
    "by_participant": {
      "Іван": "positive",
      "Марія": "neutral"
    }
  },
  "created_at": "2025-10-06T12:30:00Z"
}
```

### 2. Get Prospect Analyses
```http
GET /api/negotiations/:prospect_id/analyses
Authorization: Bearer {token}

Query Parameters:
- participant: string (фільтр по учаснику)
- type: string (manipulation, bias, fallacy, pressure)
- date_from: string (ISO date)
- date_to: string (ISO date)
- sort: string (recent, risk-desc, risk-asc, date-desc, date-asc)

Response 200:
[
  {
    "id": 15,
    "prospect_id": 1,
    "title": "Зустріч 15.10.2025",
    "date": "2025-10-15T00:00:00Z",
    "participants": ["Іван", "Марія", "Петро"],
    "risk_level": "medium",
    "manipulations_count": 7,
    "biases_count": 3,
    "created_at": "2025-10-06T12:30:00Z"
  }
]
```

### 3. Get Analysis Details
```http
GET /api/negotiations/analysis/:id
Authorization: Bearer {token}

Response 200:
{
  // Повна структура з усіма деталями
  "id": 15,
  "prospect_id": 1,
  "title": "Зустріч 15.10.2025",
  "text": "Повний текст переговорів...",
  "findings": { ... },
  "recommendations": [ ... ],
  ...
}
```

---

## 📝 Notes API

### 1. Get Notes
```http
GET /api/negotiations/:prospect_id/notes
Authorization: Bearer {token}

Response 200:
[
  {
    "id": 1,
    "prospect_id": 1,
    "text": "Клієнт зацікавлений у довгостроковій співпраці",
    "created_at": "2025-10-01T09:00:00Z",
    "updated_at": "2025-10-01T09:00:00Z"
  }
]
```

### 2. Create Note
```http
POST /api/negotiations/:prospect_id/notes
Authorization: Bearer {token}
Content-Type: application/json

{
  "text": "Домовились про наступну зустріч"
}

Response 201:
{
  "id": 5,
  "prospect_id": 1,
  "text": "Домовились про наступну зустріч",
  "created_at": "2025-10-06T14:00:00Z",
  "updated_at": "2025-10-06T14:00:00Z"
}
```

### 3. Delete Note
```http
DELETE /api/negotiations/notes/:id
Authorization: Bearer {token}

Response 204: No Content
```

---

## 👥 Clients API (TeamHub)

### 1. Get Clients List
```http
GET /api/clients
Authorization: Bearer {token}

Query Parameters:
- type: string (enterprise, mid-market, startup)
- sort: string (recent, name, team-size)
- search: string

Response 200:
[
  {
    "id": 1,
    "name": "ТехКомпані",
    "type": "enterprise",
    "contact": "Марія Іваненко",
    "team_size": 150,
    "created_at": "2025-08-10T10:00:00Z",
    "converted_from_prospect_id": 5
  }
]
```

### 2. Create Client
```http
POST /api/clients
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "ТехКомпані",
  "type": "enterprise",
  "contact": "Марія Іваненко",
  "team_size": 150,
  "team_data": "{\"employees\": [...]}",  // JSON string or structured data
}

Response 201:
{
  "id": 1,
  "name": "ТехКомпані",
  ...
}
```

### 3. Convert Prospect to Client
```http
POST /api/clients/convert
Authorization: Bearer {token}
Content-Type: multipart/form-data OR application/json

// Якщо JSON:
{
  "prospect_id": 5,
  "type": "enterprise",
  "team_size": 150
}

// Якщо з файлами (multipart):
prospect_id: 5
type: enterprise
team_size: 150
files[]: <file1.json>
files[]: <file2.csv>
files[]: <photo.png>

Response 201:
{
  "client_id": 1,
  "migrated_analyses": 12,
  "migrated_notes": 5,
  "prospect_updated_status": "converted",
  "team_data_processed": true,
  "files_processed": [
    {
      "name": "file1.json",
      "status": "success",
      "records_extracted": 45
    },
    {
      "name": "photo.png",
      "status": "success",
      "type": "org_chart",
      "employees_detected": 50
    }
  ]
}
```

---

## 📤 File Upload Handling

### Обробка різних типів файлів:

#### 1. **TXT файли**
```javascript
// Бекенд читає як текст
const content = await fs.readFile(file.path, 'utf-8');
```

#### 2. **PDF файли**
```javascript
// Використовуйте бібліотеку pdf-parse
const pdfParse = require('pdf-parse');
const dataBuffer = await fs.readFile(file.path);
const data = await pdfParse(dataBuffer);
const text = data.text;
```

#### 3. **JSON файли**
```javascript
const content = await fs.readFile(file.path, 'utf-8');
const data = JSON.parse(content);
// Валідація та імпорт структурованих даних
```

#### 4. **CSV/Excel файли**
```javascript
const xlsx = require('xlsx');
const workbook = xlsx.readFile(file.path);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);
```

#### 5. **Зображення (OpenAI Vision API)**
```javascript
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const response = await openai.chat.completions.create({
  model: "gpt-4-vision-preview",
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Витягни текст переговорів з цього зображення. Вкажи хто і що говорить."
        },
        {
          type: "image_url",
          image_url: {
            url: imageDataUrl  // data:image/jpeg;base64,...
          }
        }
      ]
    }
  ],
  max_tokens: 4096
});

const extractedText = response.choices[0].message.content;
```

---

## 🤖 OpenAI Integration

### Analysis with GPT-4

```javascript
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const response = await openai.chat.completions.create({
  model: "gpt-4-turbo-preview",
  messages: [
    {
      role: "system",
      content: `Ти експерт з аналізу переговорів. Виявляй:
      1. Маніпуляції (manipulation tactics)
      2. Когнітивні упередження (cognitive biases)
      3. Логічні помилки (logical fallacies)
      4. Тиск та загрози (pressure tactics)

      Надавай детальний аналіз у форматі JSON.`
    },
    {
      role: "user",
      content: `Проаналізуй ці переговори:\n\n${negotiationText}`
    }
  ],
  response_format: { type: "json_object" },
  temperature: 0.3
});

const analysis = JSON.parse(response.choices[0].message.content);
```

### Структура відповіді OpenAI:

```json
{
  "risk_level": "medium",
  "manipulations": [
    {
      "type": "artificial_scarcity",
      "speaker": "Іван",
      "quote": "Ця пропозиція доступна лише сьогодні",
      "severity": "high",
      "explanation": "Створення штучного дефіциту"
    }
  ],
  "biases": [
    {
      "type": "anchoring_bias",
      "speaker": "Марія",
      "quote": "Наша звичайна ціна - $10,000",
      "explanation": "Встановлення якоря"
    }
  ],
  "fallacies": [],
  "pressure_tactics": [],
  "recommendations": [
    "Уникайте прийняття рішень під тиском",
    "Перевірте ринкові ціни"
  ],
  "sentiment": {
    "overall": "neutral",
    "by_participant": {
      "Іван": "positive",
      "Марія": "neutral"
    }
  }
}
```

---

## 📊 Database Schema

### prospects
```sql
CREATE TABLE prospects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  industry VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### analyses
```sql
CREATE TABLE analyses (
  id SERIAL PRIMARY KEY,
  prospect_id INTEGER REFERENCES prospects(id),
  title VARCHAR(255) NOT NULL,
  date DATE,
  participants JSON,
  text TEXT,
  risk_level VARCHAR(50),
  manipulations_count INTEGER DEFAULT 0,
  biases_count INTEGER DEFAULT 0,
  findings JSON,
  sentiment JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### notes
```sql
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  prospect_id INTEGER REFERENCES prospects(id),
  client_id INTEGER REFERENCES clients(id),
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### clients
```sql
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  contact VARCHAR(255),
  team_size INTEGER,
  team_data JSON,
  converted_from_prospect_id INTEGER REFERENCES prospects(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## ⚠️ Error Responses

```javascript
// 400 Bad Request
{
  "error": "Validation failed",
  "details": {
    "name": "Name is required",
    "email": "Invalid email format"
  }
}

// 401 Unauthorized
{
  "error": "Invalid token"
}

// 404 Not Found
{
  "error": "Prospect not found"
}

// 500 Internal Server Error
{
  "error": "Internal server error",
  "message": "Something went wrong"
}
```

---

## 🔄 Міграція даних при конвертації

```javascript
// Приклад конвертації prospect → client
async function convertProspectToClient(prospectId, clientData) {
  const transaction = await db.transaction();

  try {
    // 1. Get prospect data
    const prospect = await Prospect.findById(prospectId);

    // 2. Create client with migrated data
    const client = await Client.create({
      name: prospect.name,
      contact: prospect.contact,
      email: prospect.email,
      type: clientData.type,
      team_size: clientData.team_size,
      converted_from_prospect_id: prospectId
    }, { transaction });

    // 3. Migrate analyses
    await Analysis.update(
      { client_id: client.id },
      { where: { prospect_id: prospectId } },
      { transaction }
    );

    // 4. Migrate notes
    await Note.update(
      { client_id: client.id },
      { where: { prospect_id: prospectId } },
      { transaction }
    );

    // 5. Update prospect status
    await prospect.update(
      { status: 'converted' },
      { transaction }
    );

    // 6. Process uploaded files if any
    if (clientData.files) {
      await processTeamDataFiles(client.id, clientData.files);
    }

    await transaction.commit();
    return client;

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

---

## 🎯 Rate Limiting

Рекомендовані ліміти:

```javascript
// Analysis API - ресурсоємні операції
POST /api/negotiations/analyze: 10 requests/hour/user

// CRUD операції
GET  /api/*: 100 requests/minute/user
POST /api/*: 30 requests/minute/user
PUT  /api/*: 30 requests/minute/user
DELETE /api/*: 20 requests/minute/user
```

---

## 📈 Response Times

Очікувані часи відповіді:

- Simple GET requests: < 100ms
- Analysis creation (with OpenAI): 3-10s
- File processing: 1-5s per file
- Image processing (Vision API): 2-8s per image

---

**Статус:** ✅ Специфікація готова до імплементації!
