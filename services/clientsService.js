import { transaction, all } from '../utils/db.js';

const CLIENT_FLOW_STEPS = [
  {
    id: 'basics',
    title: 'Базові реквізити',
    description: 'Назва компанії, ключовий переговорник та сфера діяльності формують контекст для подальшого аналізу.',
    fields: ['company', 'negotiator', 'sector', 'company_size'],
    required: ['company']
  },
  {
    id: 'negotiation-scope',
    title: 'Контекст переговорів',
    description: 'Опишіть тип угоди, очікувану вартість та часові рамки, щоб масштабувати поради AI.',
    fields: ['negotiation_type', 'deal_value', 'timeline', 'weekly_hours'],
    required: ['negotiation_type']
  },
  {
    id: 'goals',
    title: 'Цілі та критерії',
    description: 'Фіксуємо бажані результати, критерії прийняття рішень та ключові обмеження.',
    fields: ['goal', 'decision_criteria', 'constraints', 'deadlines'],
    required: ['goal']
  },
  {
    id: 'intelligence',
    title: 'Ринковий інтелект',
    description: 'Додайте дані про конкурентів, переваги та попередню взаємодію для детальніших рекомендацій.',
    fields: ['competitors', 'competitive_advantage', 'market_position', 'previous_interactions', 'notes'],
    required: []
  }
];

const MODULE_GUIDE = {
  'analysis-dashboard': {
    title: 'Аналіз переговорів',
    goal: 'Завантажуйте або вставляйте стенограми, щоб AI підсвітив маніпуляції та ризики.',
    steps: [
      'Виберіть клієнта у списку ліворуч або створіть нового.',
      'Вставте текст переговорів або завантажте файл.',
      'Запустіть аналіз і відфільтруйте знайдені маніпуляції.',
      'Додайте ключові фрагменти у робочу область для подальшої роботи.'
    ]
  },
  'team-hub': {
    title: 'Team Hub',
    goal: 'Структуруйте команду клієнта для подальшого RACI та компенсаційного аналізу.',
    steps: [
      'Імпортуйте JSON або додайте учасників вручну.',
      'Призначте ролі, завантаженість та ключові KPI.',
      'Закріпіть контактні нотатки та оперативні гіпотези.',
      'Збережіть команду, щоб синхронізувати з RACI та Salary.'
    ]
  },
  'raci-dashboard': {
    title: 'RACI Matrix',
    goal: 'Порівняйте поточний та цільовий розподіл відповідальності, щоб виявити прогалини.',
    steps: [
      'Виберіть потрібну команду.',
      'Перегляньте фактичну матрицю RACI та ідеальну модель.',
      'Проаналізуйте блок «Ключові розриви» та «Швидкі перемоги».',
      'Збережіть сесію, щоб зафіксувати зміни для аудиту.'
    ]
  },
  'salary-dashboard': {
    title: 'Salary Insights',
    goal: 'Оцінка компенсацій, завантаженості та ринкових діапазонів для кожної ролі.',
    steps: [
      'Обирайте команду, синхронізовану з Team Hub.',
      'Заповнюйте базові компенсаційні параметри.',
      'Перегляньте автоматичні рекомендації та рівень завантаженості.',
      'Експортуйте інсайти для фінансової частини переговорів.'
    ]
  }
};

const CLIENT_SELECT_WITH_STATS = `
  SELECT
    c.*,
    COUNT(a.id) AS analyses_count,
    MAX(a.created_at) AS last_analysis_at,
    AVG((a.barometer ->> 'score')::numeric) AS avg_complexity_score
  FROM clients c
  LEFT JOIN analyses a ON c.id = a.client_id
`;

const OPTIONAL_TEXT_FIELDS = [
  'negotiator',
  'sector',
  'company_size',
  'negotiation_type',
  'deal_value',
  'timeline',
  'goal',
  'decision_criteria',
  'constraints',
  'user_goals',
  'client_goals',
  'competitors',
  'competitive_advantage',
  'market_position',
  'offered_services',
  'deadlines',
  'previous_interactions',
  'notes'
];

const NUMERIC_FIELDS = ['weekly_hours'];

function trimOrNull(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function sanitizeClientPayload(payload = {}) {
  const normalized = { company: trimOrNull(payload.company) };

  OPTIONAL_TEXT_FIELDS.forEach((field) => {
    normalized[field] = trimOrNull(payload[field]);
  });

  NUMERIC_FIELDS.forEach((field) => {
    const raw = payload[field];
    if (raw === null || raw === undefined || raw === '') {
      normalized[field] = 0;
    } else {
      const numeric = Number(raw);
      normalized[field] = Number.isFinite(numeric) ? numeric : 0;
    }
  });

  return normalized;
}

function formatClientRow(row) {
  if (!row) return null;
  const analysesCount = Number(row.analyses_count || 0);
  const avgScore = row.avg_complexity_score != null ? Number(row.avg_complexity_score) : null;

  const progress = CLIENT_FLOW_STEPS.map((step) => ({
    id: step.id,
    title: step.title,
    completed: (step.required && step.required.length ? step.required : step.fields).every((field) => {
      const value = row[field];
      if (typeof value === 'number') return value > 0;
      return value !== null && value !== undefined && String(value).trim().length > 0;
    })
  }));

  return {
    ...row,
    analyses_count: analysesCount,
    avg_complexity_score: avgScore,
    progress
  };
}

export async function fetchClientsWithStats(limit = 1000) {
  const rows = await all(
    `${CLIENT_SELECT_WITH_STATS}
     GROUP BY c.id
     ORDER BY c.updated_at DESC, c.id DESC
     LIMIT $1`,
    [limit]
  );
  return rows.map(formatClientRow);
}

export async function fetchClientWithHistory(id) {
  const clientRows = await all(
    `${CLIENT_SELECT_WITH_STATS}
     WHERE c.id = $1
     GROUP BY c.id`,
    [id]
  );

  const client = formatClientRow(clientRows[0]);
  if (!client) return null;

  const analyses = await all(
    `SELECT
        id,
        title,
        source,
        original_filename,
        barometer ->> 'score' AS complexity_score,
        barometer ->> 'label' AS complexity_label,
        created_at
     FROM analyses
     WHERE client_id = $1
     ORDER BY created_at DESC
     LIMIT 100`,
    [id]
  );

  return {
    client,
    analyses: analyses.map((entry) => ({
      ...entry,
      complexity_score: entry.complexity_score != null ? Number(entry.complexity_score) : null
    }))
  };
}

export async function createClientRecord(payload) {
  const normalized = sanitizeClientPayload(payload);
  if (!normalized.company) {
    throw new Error('Назва компанії обов’язкова');
  }

  return transaction(async (db) => {
    const insertResult = await db.query(
      `INSERT INTO clients (
        company,
        negotiator,
        sector,
        company_size,
        negotiation_type,
        deal_value,
        timeline,
        goal,
        decision_criteria,
        constraints,
        user_goals,
        client_goals,
        competitors,
        competitive_advantage,
        market_position,
        weekly_hours,
        offered_services,
        deadlines,
        previous_interactions,
        notes
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20
      )
      RETURNING *`,
      [
        normalized.company,
        normalized.negotiator,
        normalized.sector,
        normalized.company_size,
        normalized.negotiation_type,
        normalized.deal_value,
        normalized.timeline,
        normalized.goal,
        normalized.decision_criteria,
        normalized.constraints,
        normalized.user_goals,
        normalized.client_goals,
        normalized.competitors,
        normalized.competitive_advantage,
        normalized.market_position,
        normalized.weekly_hours,
        normalized.offered_services,
        normalized.deadlines,
        normalized.previous_interactions,
        normalized.notes
      ]
    );

    const newId = insertResult.rows[0].id;
    const statsResult = await db.query(
      `${CLIENT_SELECT_WITH_STATS}
       WHERE c.id = $1
       GROUP BY c.id`,
      [newId]
    );

    const aggregatedRow = statsResult.rows[0] || {
      ...insertResult.rows[0],
      analyses_count: 0,
      avg_complexity_score: null
    };

    return formatClientRow(aggregatedRow);
  });
}

export async function updateClientRecord(id, payload) {
  const normalized = sanitizeClientPayload(payload);
  if (!normalized.company) {
    throw new Error('Назва компанії обов’язкова');
  }

  return transaction(async (db) => {
    const existing = await db.get('SELECT id FROM clients WHERE id = $1 FOR UPDATE', [id]);
    if (!existing) {
      return null;
    }

    const updateResult = await db.query(
      `UPDATE clients SET
        company = $1,
        negotiator = $2,
        sector = $3,
        company_size = $4,
        negotiation_type = $5,
        deal_value = $6,
        timeline = $7,
        goal = $8,
        decision_criteria = $9,
        constraints = $10,
        user_goals = $11,
        client_goals = $12,
        competitors = $13,
        competitive_advantage = $14,
        market_position = $15,
        weekly_hours = $16,
        offered_services = $17,
        deadlines = $18,
        previous_interactions = $19,
        notes = $20,
        updated_at = NOW()
      WHERE id = $21
      RETURNING *`,
      [
        normalized.company,
        normalized.negotiator,
        normalized.sector,
        normalized.company_size,
        normalized.negotiation_type,
        normalized.deal_value,
        normalized.timeline,
        normalized.goal,
        normalized.decision_criteria,
        normalized.constraints,
        normalized.user_goals,
        normalized.client_goals,
        normalized.competitors,
        normalized.competitive_advantage,
        normalized.market_position,
        normalized.weekly_hours,
        normalized.offered_services,
        normalized.deadlines,
        normalized.previous_interactions,
        normalized.notes,
        id
      ]
    );

    const statsResult = await db.query(
      `${CLIENT_SELECT_WITH_STATS}
       WHERE c.id = $1
       GROUP BY c.id`,
      [id]
    );

    const aggregatedRow = statsResult.rows[0] || {
      ...updateResult.rows[0],
      analyses_count: 0,
      avg_complexity_score: null
    };

    return formatClientRow(aggregatedRow);
  });
}

export async function deleteClientRecord(id) {
  return transaction(async (db) => {
    const client = await db.get('SELECT company FROM clients WHERE id = $1 FOR UPDATE', [id]);
    if (!client) {
      return { deleted: false };
    }

    const analysesCountRow = await db.get('SELECT COUNT(*) AS count FROM analyses WHERE client_id = $1', [id]);
    const analysesCount = Number(analysesCountRow?.count || 0);

    const result = await db.query('DELETE FROM clients WHERE id = $1', [id]);

    return {
      deleted: result.rowCount > 0,
      clientName: client.company,
      analysesCount
    };
  });
}

export function getClientWorkflowGuide() {
  return {
    steps: CLIENT_FLOW_STEPS,
    modules: MODULE_GUIDE
  };
}
