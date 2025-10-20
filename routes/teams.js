import Busboy from 'busboy';
import mammoth from 'mammoth';
import { Router } from 'express';
import { extname } from 'path';
import { performance } from 'perf_hooks';
import { transaction, get, all, run } from '../utils/db.js';
import { client as openaiClient, estimateTokens } from '../utils/openAIClient.js';
import { addTokensAndCheck } from '../utils/tokenUsage.js';
import {
  validateTeamCreate,
  validateTeamIdParam,
  validateTeamMemberIdParam,
  validateRaciGenerate,
  validateSalaryInsight,
  validateClientId
} from '../middleware/validators.js';
import { logError, logAIUsage, logPerformance } from '../utils/logger.js';
import { recordAuditEvent } from '../utils/audit.js';

const r = Router();
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

const mapMemberRow = (row) => ({
  id: row.id,
  name: row.full_name,
  role: row.role,
  seniority: row.seniority,
  location: row.location,
  responsibilities: row.responsibilities
    ? row.responsibilities.split('\n').filter(Boolean)
    : [],
  workload_percent:
    row.workload_percent != null ? Number(row.workload_percent) : null,
  compensation:
    row.compensation_amount != null
      ? {
          amount: Number(row.compensation_amount),
          currency: row.compensation_currency
        }
      : null,
  metadata: row.metadata || {},
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const toObject = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
};

const sanitizeJsonString = (content) =>
  content
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

const SUPPORTED_TEXT_EXT = new Set(['.txt', '.md', '.csv', '.json']);
const SUPPORTED_DOC_EXT = new Set(['.docx']);
const SUPPORTED_IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml'
]);
const MAX_INTEL_FILES = 10;
const MAX_INTEL_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const buildTeamIntakePrompt = () => `
Ти — Chief Team Architect для Kaminskyi AI.

МІСІЯ: Проаналізуй надані документи/дані та створи детальний, точний профіль команди з максимальною увагою до деталей.

ІНСТРУКЦІЇ:
1. Уважно прочитай ВСІ надані документи
2. Визнач організаційну структуру та ролі
3. Оціни навантаження кожного члена команди на основі:
   - Кількості обов'язків
   - Складності задач
   - Згадок про переробки/перевантаження
   - Контексту роботи
4. Визнач ринкову позицію зарплат (якщо згадано)
5. Виявити ризики та боттлнеки

КРИТИЧНІ ПРАВИЛА:
- Використовуй ТІЛЬКИ інформацію з наданих документів
- НЕ вигадуй дані, які не згадані
- Якщо інформації немає, ставити null
- Будь максимально точним у цифрах
- Зарплати вказуй ТОЧНО як згадано, без припущень

ФОРМАТ ВІДПОВІДІ - СТРОГО JSON:
{
  "company": {
    "name": "точна назва з документів або null",
    "industry": "галузь компанії",
    "location": "місцезнаходження",
    "size": "startup|small|medium|large|enterprise",
    "focus": "основний фокус бізнесу",
    "insights": ["ключові інсайти про компанію"]
  },
  "team": {
    "title": "назва команди",
    "mission": "місія/мета команди",
    "size": кількість людей,
    "tags": ["engineering", "product", "remote"],
    "rituals": ["daily standup", "sprint planning"],
    "risks": ["technical debt", "knowledge silos"],
    "collaboration_score": 0-100
  },
  "members": [
    {
      "full_name": "Повне ім'я ТОЧНО як в документі",
      "role": "ТОЧНА посада",
      "seniority": "junior|mid|senior|lead|principal|staff|architect",
      "location": "місто/країна",
      "responsibilities": ["список обов'язків ТОЧНО як згадано"],
      "workload_percent": 80-200 (оцінка FTE: 80=underutilized, 100=normal, 120+=overloaded),
      "compensation": {
        "amount": ТОЧНА сума якщо згадана або null,
        "currency": "UAH|USD|EUR",
        "type": "monthly|yearly"
      },
      "status": "overloaded|balanced|underutilized",
      "signals": ["що вказує на статус"],
      "suggested_actions": ["конкретні рекомендації"],
      "skills": ["технічні навички якщо згадані"],
      "experience_years": число якщо згадано або null,
      "tags": ["backend", "leadership", "remote"]
    }
  ],
  "summary": "Детальний висновок про стан команди, структуру, ефективність та ключові проблеми (7-10 речень)",
  "highlights": [
    "Критичні знахідки",
    "Перевантажені члени команди",
    "Боттлнеки та ризики",
    "Позитивні моменти"
  ],
  "recommendations": {
    "immediate": ["негайні дії"],
    "short_term": ["короткострокові плани"],
    "long_term": ["довгострокова стратегія"],
    "hiring_needs": ["потреби в найомі"]
  },
  "ai_meta": {
    "confidence": "high|medium|low - оцінка якості даних",
    "data_completeness": 0-100,
    "notes": ["що було складно визначити", "які припущення зроблені"],
    "warnings": ["де потрібна додаткова інформація"]
  }
}

ЯКІСТЬ ДАНИХ:
- high confidence: є конкретні дані про ролі, обов'язки, зарплати
- medium confidence: є базова інформація, але деталей мало
- low confidence: дуже мало інформації, багато припущень
`.trim();

async function extractTextContent(filename, buffer, mimeType) {
  const extension = (extname(filename || '') || '').toLowerCase();

  if (SUPPORTED_DOC_EXT.has(extension)) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (error) {
      throw new Error(`DOCX_PARSE_ERROR:${filename}`);
    }
  }

  if (mimeType === 'image/svg+xml') {
    return buffer.toString('utf-8');
  }

  if (SUPPORTED_TEXT_EXT.has(extension) || (mimeType && mimeType.startsWith('text/'))) {
    return buffer.toString('utf-8');
  }

  return null;
}

function parseIntelligenceForm(req) {
  return new Promise((resolve, reject) => {
    let aborted = false;
    const files = [];
    const fields = {};

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: MAX_INTEL_FILES,
        fileSize: MAX_INTEL_FILE_SIZE
      }
    });

    busboy.on('file', (fieldname, file, info) => {
      if (aborted) {
        file.resume();
        return;
      }

      const { filename, mimeType } = info;
      const chunks = [];

      file.on('data', (data) => {
        if (!aborted) {
          chunks.push(data);
        }
      });

      file.on('limit', () => {
        aborted = true;
        file.resume();
        reject(new Error('FILE_TOO_LARGE'));
      });

      file.on('end', () => {
        if (aborted) return;
        files.push({
          fieldName: fieldname,
          filename: filename || 'unknown',
          mimeType: mimeType || 'application/octet-stream',
          buffer: Buffer.concat(chunks)
        });
      });
    });

    busboy.on('field', (name, value) => {
      if (aborted) return;
      fields[name] = value;
    });

    busboy.on('filesLimit', () => {
      if (aborted) return;
      aborted = true;
      reject(new Error('TOO_MANY_FILES'));
    });

    busboy.on('error', (error) => {
      if (aborted) return;
      aborted = true;
      reject(error);
    });

    busboy.on('finish', () => {
      if (aborted) return;
      resolve({ fields, files });
    });

    req.pipe(busboy);
  });
}

function normalizeMemberCandidate(entry = {}) {
  const responsibilities = Array.isArray(entry.responsibilities)
    ? entry.responsibilities.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

  const compensation = entry.compensation && typeof entry.compensation === 'object'
    ? {
        amount: entry.compensation.amount != null ? Number(entry.compensation.amount) : null,
        currency: entry.compensation.currency || null
      }
    : { amount: null, currency: null };

  return {
    full_name: entry.full_name || entry.name || '',
    role: entry.role || '',
    seniority: entry.seniority || '',
    location: entry.location || '',
    responsibilities,
    workload_percent: entry.workload_percent != null ? Number(entry.workload_percent) : null,
    compensation,
    metadata: {
      status: entry.status || null,
      signals: Array.isArray(entry.signals) ? entry.signals : [],
      actions: Array.isArray(entry.suggested_actions) ? entry.suggested_actions : (Array.isArray(entry.actions) ? entry.actions : []),
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      raci_actual: entry.raci_actual || null,
      raci_ideal: entry.raci_ideal || null,
      focus: entry.focus || null,
      ai_meta: entry.ai_meta || null
    }
  };
}

const buildRaciSystemPrompt = () => `
Ти — Chief Organisation Architect Kaminskyi AI.
Твоє завдання: проаналізувати команду, побудувати поточну та ідеальну матриці RACI, описати ключові розриви, перевантаження та дати швидкі рекомендації.
Використовуй лише імена/ролі, що передані в даних. Жодних вигаданих людей.
Поверни СТРОГО JSON (без жодних пояснень або маркдаунів):
{
  "matrix_actual":[{"task":"...","R":["..."],"A":["..."],"C":["..."],"I":["..."],"notes":"..."}],
  "matrix_ideal":[{"task":"...","R":["..."],"A":["..."],"C":["..."],"I":["..."],"notes":"..."}],
  "gap_analysis":[{"task":"...","issue":"...","impact":"high|medium|low","recommendations":["..."],"owner":"ім'я"}],
  "role_alignment":[{"name":"...","role":"...","status":"overloaded|balanced|underutilized","signals":["..."],"suggested_actions":["..."]}],
  "summary":"5-7 речень з ключовими висновками та ризиками",
  "quick_wins":["..."],
  "roadmap":[{"phase":"...","priority":"high|medium|low","actions":["..."]}]
}
`.trim();

const buildSalarySystemPrompt = () => `
Ти — Compensation & Productivity Strategist Kaminskyi AI.
Оціни чи збалансована зарплата та робоче навантаження співробітника. Проаналізуй опис обов'язків, FTE, ринкові ставки, можливі перевантаження і недовантаження.
Поверни СТРОГО JSON (без маркдауну):
{
  "utilization":{
    "overloaded_percentage":0-100,
    "underutilized_percentage":0-100,
    "balanced_percentage":0-100,
    "narrative":"3-4 речення пояснення",
    "time_buckets":[{"label":"...","percentage":0-100,"status":"overloaded|balanced|underutilized","notes":"..."}],
    "visual_buckets":[{"label":"...","percentage":0-100,"color":"#FF6B6B","status":"risk|ok|monitor"}]
  },
  "compensation":{
    "current_amount":число,
    "currency":"USD",
    "market_range":{"min":число,"max":число,"currency":"USD"},
    "alignment":"below_market|aligned|above_market",
    "explanation":"2-3 речення"
  },
  "recommendations":{
    "workload":["..."],
    "compensation":["..."],
    "development":["..."],
    "hiring":["..."]
  },
  "signals":{
    "strengths":["..."],
    "risks":["..."],
    "watchouts":["..."]
  }
}
`.trim();

const ensureOpenAI = (res) => {
  if (!openaiClient) {
    res.status(503).json({
      success: false,
      error: 'AI сервіс тимчасово недоступний. Перевірте конфігурацію OpenAI API ключа.',
      code: 'AI_SERVICE_UNAVAILABLE'
    });
    return false;
  }
  return true;
};

// Enhanced team creation endpoint with better validation
r.post('/', validateTeamCreate, async (req, res) => {
  const start = performance.now();
  try {
    const payload = req.body || {};
    const clientId = Number(payload.client_id);

    // Enhanced validation
    if (!clientId || clientId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Невірний ID клієнта',
        code: 'INVALID_CLIENT_ID'
      });
    }

    const title = payload.title?.trim() || `Team #${Date.now()}`;
    const description = payload.description?.trim() || null;
    const members = Array.isArray(payload.members) ? payload.members : [];
    const source = payload.source || 'manual';

    const created = await transaction(async (db) => {
      const teamResult = await db.query(
        'INSERT INTO teams (client_id, title, description, raw_payload) VALUES ($1,$2,$3,$4) RETURNING *',
        [clientId, title, description, payload]
      );
      const team = teamResult.rows[0];
      const insertedMembers = [];

      for (const member of members) {
        const responsibilitiesText = Array.isArray(member.responsibilities)
          ? member.responsibilities.map((item) => item.trim()).filter(Boolean).join('\n')
          : (member.responsibilities || null);

        const metadata = {
          raci_actual: member.raci_actual || null,
          raci_ideal: member.raci_ideal || null,
          focus: member.focus || null,
          tags: member.tags || [],
          custom: member.metadata || null
        };

        const compensation = member.compensation || {};

        const memberResult = await db.query(
          `INSERT INTO team_members (
            team_id,
            full_name,
            role,
            seniority,
            responsibilities,
            workload_percent,
            location,
            compensation_currency,
            compensation_amount,
            metadata
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          RETURNING *`,
          [
            team.id,
            member.name || member.full_name || 'Невідомий співробітник',
            member.role || null,
            member.seniority || null,
            responsibilitiesText,
            member.workload_percent ?? member.workload ?? null,
            member.location || null,
            compensation.currency || null,
            compensation.amount != null ? Number(compensation.amount) : null,
            metadata,
          ]
        );
        insertedMembers.push(memberResult.rows[0]);
      }

      return { team, members: insertedMembers };
    });

    const duration = performance.now() - start;

    await recordAuditEvent({
      requestId: req.context?.requestId,
      eventType: 'team.created',
      actor: req.user?.username,
      entityType: 'team',
      entityId: String(created.team.id),
      metadata: {
        clientId,
        title: created.team.title,
        memberCount: created.members.length
      }
    });

    res.status(201).json({
      success: true,
      team: {
        ...created.team,
        members: created.members.map(mapMemberRow)
      },
      meta: {
        responseTime: Math.round(duration),
        memberCount: created.members.length
      }
    });
  } catch (error) {
    const duration = performance.now() - start;
    logError(error, {
      endpoint: 'POST /api/teams',
      body: req.body,
      ip: req.ip,
      responseTime: Math.round(duration)
    });

    // Better error responses
    if (error.message.includes('клієнта не знайдено')) {
      return res.status(404).json({
        success: false,
        error: 'Клієнта не знайдено',
        code: 'CLIENT_NOT_FOUND'
      });
    }

    if (error.constraint) {
      return res.status(400).json({
        success: false,
        error: 'Порушення обмежень бази даних',
        code: 'CONSTRAINT_VIOLATION'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Не вдалося створити команду',
      code: 'INTERNAL_ERROR'
    });
  }
});

// New endpoint for team statistics
r.get('/:teamId/stats', validateTeamIdParam, async (req, res) => {
  const start = performance.now();
  try {
    const teamId = Number(req.params.teamId);

    const stats = await transaction(async (db) => {
      // Get team basic info
      const team = await db.query('SELECT * FROM teams WHERE id = $1', [teamId]);
      if (!team.rows.length) {
        throw new Error('Команду не знайдено');
      }

      // Get member stats
      const memberStats = await db.query(`
        SELECT
          COUNT(*) as total_members,
          AVG(workload_percent) as avg_workload,
          COUNT(CASE WHEN compensation_amount > 0 THEN 1 END) as members_with_salary,
          SUM(compensation_amount) as total_compensation
        FROM team_members
        WHERE team_id = $1
      `, [teamId]);

      // Get role distribution
      const roleStats = await db.query(`
        SELECT role, COUNT(*) as count
        FROM team_members
        WHERE team_id = $1 AND role IS NOT NULL
        GROUP BY role
        ORDER BY count DESC
      `, [teamId]);

      return {
        team: team.rows[0],
        members: memberStats.rows[0],
        roles: roleStats.rows
      };
    });

    const duration = performance.now() - start;

    res.json({
      success: true,
      stats,
      meta: {
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    const duration = performance.now() - start;
    logError(error, {
      endpoint: `GET /api/teams/${req.params.teamId}/stats`,
      ip: req.ip,
      responseTime: Math.round(duration)
    });

    if (error.message.includes('не знайдено')) {
      return res.status(404).json({
        success: false,
        error: 'Команду не знайдено',
        code: 'TEAM_NOT_FOUND'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Не вдалося отримати статистику команди',
      code: 'INTERNAL_ERROR'
    });
  }
});

r.get('/client/:id', validateClientId, async (req, res) => {
  const start = performance.now();
  try {
    const clientId = Number(req.params.id);
    const teams = await all(
      `
      SELECT
        t.*,
        COUNT(tm.id) AS member_count,
        MAX(tm.updated_at) AS members_updated_at
      FROM teams t
      LEFT JOIN team_members tm ON tm.team_id = t.id
      WHERE t.client_id = $1
      GROUP BY t.id
      ORDER BY t.updated_at DESC, t.id DESC
      LIMIT 100
      `,
      [clientId]
    );

    const duration = performance.now() - start;

    res.json({
      success: true,
      teams,
      meta: {
        count: teams.length,
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    logError(error, { endpoint: 'GET /api/teams/client/:id', ip: req.ip });
    res.status(500).json({ success: false, error: 'Не вдалося отримати список команд' });
  }
});

r.get('/:teamId', validateTeamIdParam, async (req, res) => {
  const start = performance.now();
  try {
    const teamId = Number(req.params.teamId);
    const team = await get('SELECT * FROM teams WHERE id = $1', [teamId]);

    if (!team) {
      return res.status(404).json({ success: false, error: 'Команду не знайдено' });
    }

    const teamPayload = toObject(team.raw_payload);

    const members = await all('SELECT * FROM team_members WHERE team_id = $1 ORDER BY id', [teamId]);
    const latestRaci = await get(
      'SELECT * FROM raci_snapshots WHERE team_id = $1 ORDER BY generated_at DESC LIMIT 1',
      [teamId]
    );

    const salaryRows = await all(
      `
      SELECT si.*, tm.full_name
      FROM salary_insights si
      JOIN team_members tm ON si.member_id = tm.id
      WHERE tm.team_id = $1
      ORDER BY si.generated_at DESC
      LIMIT 200
      `,
      [teamId]
    );

    const salaryByMember = new Map();
    for (const insight of salaryRows) {
      if (!salaryByMember.has(insight.member_id)) {
        salaryByMember.set(insight.member_id, insight);
      }
    }

    const duration = performance.now() - start;

    res.json({
      success: true,
      team: {
        ...team,
        raw_payload: teamPayload,
        members: members.map(mapMemberRow)
      },
      latest_raci: latestRaci || null,
      salary_insights: Array.from(salaryByMember.values()),
      meta: {
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    logError(error, { endpoint: 'GET /api/teams/:teamId', teamId: req.params.teamId, ip: req.ip });
    res.status(500).json({ success: false, error: 'Не вдалося отримати інформацію про команду' });
  }
});

r.post('/:teamId/raci/analyze', validateTeamIdParam, validateRaciGenerate, async (req, res) => {
  if (!ensureOpenAI(res)) return;

  const start = performance.now();
  try {
    const teamId = Number(req.params.teamId);
    const team = await get('SELECT * FROM teams WHERE id = $1', [teamId]);
    if (!team) {
      return res.status(404).json({ success: false, error: 'Команду не знайдено' });
    }

    const teamPayload = toObject(team.raw_payload);

    const members = await all('SELECT * FROM team_members WHERE team_id = $1 ORDER BY id', [teamId]);

    const payload = {
      team: {
        id: team.id,
        title: team.title,
        description: team.description,
        metadata: teamPayload || null
      },
      members: members.map((member) => ({
        id: member.id,
        name: member.full_name,
        role: member.role,
        seniority: member.seniority,
        responsibilities: member.responsibilities
          ? member.responsibilities.split('\n').filter(Boolean)
          : [],
        workload_percent:
          member.workload_percent != null ? Number(member.workload_percent) : null,
        metadata: member.metadata || {}
      })),
      focus: req.body?.focus || null,
      issues: req.body?.issues || [],
      expectations:
        teamPayload?.raci_expectations || req.body?.expectations || [],
      timestamp: new Date().toISOString()
    };

    const system = buildRaciSystemPrompt();
    const tokensIn =
      estimateTokens(system) + estimateTokens(JSON.stringify(payload)) + 200;
    await addTokensAndCheck(tokensIn);

    const response = await openaiClient.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(payload) }
      ],
      max_tokens: 3200
    });

    const content = response.choices?.[0]?.message?.content || '{}';
    const tokensOut = estimateTokens(content);
    await addTokensAndCheck(tokensOut);

    logAIUsage(tokensIn + tokensOut, MODEL, 'raci_analysis');

    let parsed;
    try {
      parsed = JSON.parse(sanitizeJsonString(content));
    } catch (parseError) {
      throw new Error('Не вдалося розпарсити відповідь AI для RACI матриці');
    }

    const snapshotInsert = await run(
      `
      INSERT INTO raci_snapshots (
        team_id,
        member_summary,
        matrix_actual,
        matrix_ideal,
        gaps
      ) VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        teamId,
        parsed.role_alignment || [],
        parsed.matrix_actual || [],
        parsed.matrix_ideal || [],
        {
          gap_analysis: parsed.gap_analysis || [],
          summary: parsed.summary || '',
          quick_wins: parsed.quick_wins || [],
          roadmap: parsed.roadmap || []
        }
      ]
    );

    const duration = performance.now() - start;
    logPerformance('RACI Analysis', duration, {
      teamId,
      memberCount: members.length,
      tokensIn,
      tokensOut
    });

    await recordAuditEvent({
      requestId: req.context?.requestId,
      eventType: 'raci.generated',
      actor: req.user?.username,
      entityType: 'team',
      entityId: String(teamId),
      metadata: {
        snapshotId: snapshotInsert.rows[0]?.id,
        tokensIn,
        tokensOut,
        memberCount: members.length
      }
    });

    res.json({
      success: true,
      raci: {
        ...snapshotInsert.rows[0],
        output: parsed
      },
      meta: {
        tokensUsed: tokensIn + tokensOut,
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    logError(error, {
      endpoint: 'POST /api/teams/:teamId/raci/analyze',
      teamId: req.params.teamId,
      ip: req.ip,
      body: req.body
    });
    res.status(500).json({ success: false, error: 'Не вдалося побудувати RACI матрицю' });
  }
});

r.post(
  '/:teamId/members/:memberId/salary',
  validateTeamIdParam,
  validateTeamMemberIdParam,
  validateSalaryInsight,
  async (req, res) => {
  if (!ensureOpenAI(res)) return;

  const start = performance.now();
  try {
    const teamId = Number(req.params.teamId);
      const memberId = Number(req.params.memberId);

      const team = await get('SELECT * FROM teams WHERE id = $1', [teamId]);
      if (!team) {
        return res.status(404).json({ success: false, error: 'Команду не знайдено' });
      }

      const teamPayload = toObject(team.raw_payload);

      const member = await get(
        'SELECT * FROM team_members WHERE id = $1 AND team_id = $2',
        [memberId, teamId]
      );

      if (!member) {
        return res.status(404).json({ success: false, error: 'Учасника не знайдено' });
      }

      const body = req.body || {};
      const payload = {
        member: {
          id: member.id,
          name: member.full_name,
          role: member.role,
          seniority: member.seniority,
          responsibilities: member.responsibilities
            ? member.responsibilities.split('\n').filter(Boolean)
            : [],
          workload_percent:
            member.workload_percent != null ? Number(member.workload_percent) : null,
          metadata: member.metadata || {}
        },
        salary: body.salary,
        workload: body.workload || null,
        job_description:
          body.job_description ||
          (member.responsibilities
            ? member.responsibilities.split('\n').join('. ')
            : ''),
        timeframe: body.timeframe || null,
        context: {
          team: {
            title: team.title,
            description: team.description,
            focus: teamPayload?.analysis_focus || null
          },
          expectations: teamPayload?.raci_expectations || null
        },
        timestamp: new Date().toISOString()
      };

      const system = buildSalarySystemPrompt();
      const tokensIn =
        estimateTokens(system) + estimateTokens(JSON.stringify(payload)) + 150;
      await addTokensAndCheck(tokensIn);

      const response = await openaiClient.chat.completions.create({
        model: MODEL,
        temperature: 0.1,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: JSON.stringify(payload) }
        ],
        max_tokens: 2000
      });

      const content = response.choices?.[0]?.message?.content || '{}';
      const tokensOut = estimateTokens(content);
      await addTokensAndCheck(tokensOut);
      logAIUsage(tokensIn + tokensOut, MODEL, 'salary_analysis');

      let parsed;
      try {
        parsed = JSON.parse(sanitizeJsonString(content));
      } catch (parseError) {
        throw new Error('Не вдалося розпарсити відповідь AI для salary-аналізу');
      }

      const insert = await run(
        `
        INSERT INTO salary_insights (
          member_id,
          input_payload,
          utilization,
          compensation_json,
          recommendations
        ) VALUES ($1,$2,$3,$4,$5)
        RETURNING *
        `,
        [
          memberId,
          payload,
          parsed.utilization || {},
          parsed.compensation || {},
          parsed.recommendations || {}
        ]
      );

      const duration = performance.now() - start;
      logPerformance('Salary Analysis', duration, {
        teamId,
        memberId,
        tokensIn,
        tokensOut
      });

      await recordAuditEvent({
        requestId: req.context?.requestId,
        eventType: 'salary.analysis',
        actor: req.user?.username,
        entityType: 'team_member',
        entityId: String(memberId),
        metadata: {
          teamId,
          tokensIn,
          tokensOut,
          currency: payload.salary?.currency,
          amount: payload.salary?.amount,
          hoursPerWeek: payload.workload?.hours_per_week || null
        }
      });

      res.json({
        success: true,
        salary: {
          ...insert.rows[0],
          analysis: parsed
        },
        meta: {
          tokensUsed: tokensIn + tokensOut,
          responseTime: Math.round(duration),
          processedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logError(error, {
        endpoint: 'POST /api/teams/:teamId/members/:memberId/salary',
        teamId: req.params.teamId,
        memberId: req.params.memberId,
        ip: req.ip,
        body: req.body
      });
      res.status(500).json({ success: false, error: 'Не вдалося побудувати salary-аналітику' });
    }
  }
);

r.post('/intelligence/ingest', async (req, res) => {
  if (!ensureOpenAI(res)) return;

  const start = performance.now();

  try {
    const { fields, files } = await parseIntelligenceForm(req);

    let clientId = fields.client_id ? Number(fields.client_id) : null;
    let teamId = fields.team_id ? Number(fields.team_id) : null;

    if (!clientId && !teamId) {
      return res.status(400).json({
        success: false,
        error: 'Необхідно вказати client_id або team_id'
      });
    }

    let profile = {};
    if (fields.profile) {
      try {
        profile = JSON.parse(fields.profile);
      } catch (error) {
        return res.status(400).json({ success: false, error: 'Невірний формат профілю' });
      }
    }

    const textAssets = [];
    const imageAssets = [];

    for (const file of files) {
      const textContent = await extractTextContent(file.filename, file.buffer, file.mimeType);
      if (textContent && textContent.trim()) {
        textAssets.push({
          name: file.filename,
          content: textContent.trim()
        });
        continue;
      }

      if (SUPPORTED_IMAGE_MIME.has(file.mimeType)) {
        imageAssets.push({
          name: file.filename,
          mimeType: file.mimeType,
          base64: file.buffer.toString('base64')
        });
        continue;
      }

      return res.status(400).json({
        success: false,
        error: `Непідтримуваний тип файлу: ${file.filename}`
      });
    }

    const requestPayload = {
      profile,
      text_assets: textAssets,
      attachments: imageAssets.map((asset) => ({
        name: asset.name,
        mimeType: asset.mimeType
      }))
    };

    const systemPrompt = buildTeamIntakePrompt();
    const tokensInEstimate = estimateTokens(systemPrompt) + estimateTokens(JSON.stringify(requestPayload)) + 200;
    await addTokensAndCheck(tokensInEstimate);

    const userContent = [
      { type: 'text', text: JSON.stringify(requestPayload) }
    ];

    imageAssets.forEach((asset) => {
      userContent.push({
        type: 'input_image',
        image_url: {
          url: `data:${asset.mimeType};base64,${asset.base64}`
        }
      });
    });

    const completion = await openaiClient.responses.create({
      model: MODEL,
      input: [
        { role: 'system', content: [{ type: 'text', text: systemPrompt }] },
        { role: 'user', content: userContent }
      ]
    });

    const rawOutput = Array.isArray(completion.output_text)
      ? completion.output_text.join('\n')
      : completion.output?.map?.((segment) =>
          segment.content?.map?.((chunk) => chunk.text || '').join('')
        ).join('') || '';

    const tokensOut = completion.usage?.output_tokens ?? estimateTokens(rawOutput);
    await addTokensAndCheck(tokensOut);

    logAIUsage(tokensInEstimate + tokensOut, MODEL, 'team_intelligence');

    let parsed;
    try {
      parsed = JSON.parse(sanitizeJsonString(rawOutput));
    } catch (error) {
      throw new Error('INTAKE_PARSE_ERROR');
    }

    const structured = {
      company: parsed.company || {},
      team: parsed.team || {},
      members: Array.isArray(parsed.members) ? parsed.members : [],
      summary: parsed.summary || '',
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      ai_meta: parsed.ai_meta || {}
    };

    const normalizedMembers = structured.members
      .map(normalizeMemberCandidate)
      .filter((member) => member.full_name || member.role);

    const processedAt = new Date().toISOString();

    let savedTeam = null;
    let insertedMembers = [];

    await transaction(async (db) => {
      let rawPayloadBase = {};

      if (teamId) {
        const existingTeam = await db.query('SELECT id, client_id, title, description, raw_payload FROM teams WHERE id = $1', [teamId]);
        if (!existingTeam.rows.length) {
          throw new Error('TEAM_NOT_FOUND');
        }

        const existing = existingTeam.rows[0];
        if (!clientId) {
          clientId = existing.client_id;
        }

        rawPayloadBase = toObject(existing.raw_payload);
        rawPayloadBase.intelligence_intake = {
          profile: structured,
          summary: structured.summary,
          highlights: structured.highlights,
          processed_at: processedAt
        };

        const updatedTitle = structured.team.title || profile.team_name || existing.title || `Команда ${existing.id}`;
        const updatedDescription = structured.team.mission || profile.team_mission || existing.description || null;

        const updated = await db.query(
          'UPDATE teams SET title = $1, description = $2, raw_payload = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
          [updatedTitle, updatedDescription, rawPayloadBase, teamId]
        );

        savedTeam = updated.rows[0];
      } else {
        if (!clientId) {
          throw new Error('CLIENT_REQUIRED');
        }

        rawPayloadBase = {
          intelligence_intake: {
            profile: structured,
            summary: structured.summary,
            highlights: structured.highlights,
            processed_at: processedAt
          }
        };

        const title = structured.team.title || profile.team_name || `Команда #${Date.now()}`;
        const description = structured.team.mission || profile.team_mission || null;

        const inserted = await db.query(
          'INSERT INTO teams (client_id, title, description, raw_payload) VALUES ($1,$2,$3,$4) RETURNING *',
          [clientId, title, description, rawPayloadBase]
        );

        savedTeam = inserted.rows[0];
        teamId = savedTeam.id;
      }

      insertedMembers = [];
      if (normalizedMembers.length) {
        if (teamId) {
          await db.query('DELETE FROM team_members WHERE team_id = $1', [teamId]);
        }

        for (const member of normalizedMembers) {
          const insertedMember = await db.query(
            `INSERT INTO team_members (
              team_id,
              full_name,
              role,
              seniority,
              responsibilities,
              workload_percent,
              location,
              metadata,
              compensation_amount,
              compensation_currency
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            RETURNING *`,
            [
              teamId,
              member.full_name,
              member.role,
              member.seniority,
              member.responsibilities.join('\n'),
              member.workload_percent,
              member.location,
              member.metadata,
              member.compensation.amount,
              member.compensation.currency
            ]
          );
          insertedMembers.push(insertedMember.rows[0]);
        }
      } else if (teamId) {
        const existingMembers = await db.query(
          'SELECT * FROM team_members WHERE team_id = $1 ORDER BY id',
          [teamId]
        );
        insertedMembers = existingMembers.rows;
      }
    });

    const mappedMembers = insertedMembers.map(mapMemberRow);
    savedTeam.members = mappedMembers;

    const duration = performance.now() - start;
    logPerformance('Team Intelligence Intake', duration, {
      teamId,
      clientId,
      assetCount: files.length,
      tokensIn: tokensInEstimate,
      tokensOut
    });

    await recordAuditEvent({
      requestId: req.context?.requestId,
      eventType: 'team.intelligence_sync',
      actor: req.user?.username,
      entityType: 'team',
      entityId: String(teamId),
      metadata: {
        clientId,
        tokensIn: tokensInEstimate,
        tokensOut,
        assetCount: files.length
      }
    });

    res.json({
      success: true,
      team: savedTeam,
      members: mappedMembers,
      profile: structured,
      insights: {
        summary: structured.summary,
        highlights: structured.highlights,
        ai_meta: structured.ai_meta
      },
      meta: {
        tokensUsed: tokensInEstimate + tokensOut,
        responseTime: Math.round(duration),
        processedAt
      }
    });
  } catch (error) {
    logError(error, {
      endpoint: 'POST /api/teams/intelligence/ingest',
      ip: req.ip
    });

    if (error.message === 'FILE_TOO_LARGE') {
      return res.status(400).json({ success: false, error: 'Файл перевищує 25MB' });
    }
    if (error.message === 'TOO_MANY_FILES') {
      return res.status(400).json({ success: false, error: 'Максимум 10 файлів за один раз' });
    }
    if (error.message === 'TEAM_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Команду не знайдено' });
    }
    if (error.message === 'CLIENT_REQUIRED') {
      return res.status(400).json({ success: false, error: 'Необхідно вказати client_id' });
    }
    if (error.message === 'INTAKE_PARSE_ERROR') {
      return res.status(502).json({ success: false, error: 'AI повернув невалідну відповідь' });
    }

    res.status(500).json({ success: false, error: 'Не вдалося обробити дані команди' });
  }
});

// ============================================
// SALARY ANALYTICS ENDPOINT
// ============================================

r.get('/:teamId/salary-analytics', async (req, res) => {
  try {
    const { teamId } = req.params;

    logger.info(`Fetching salary analytics for team ${teamId}`);

    // Get team with members
    const teamQuery = await pool.query(
      `SELECT
        t.id, t.name, t.description, t.client_id,
        c.company as client_name
      FROM teams t
      LEFT JOIN clients c ON t.client_id = c.id
      WHERE t.id = $1 AND t.user_id = $2`,
      [teamId, req.user.id]
    );

    if (teamQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const team = teamQuery.rows[0];

    // Get members with salary data
    const membersQuery = await pool.query(
      `SELECT
        id, name, role, email,
        compensation_amount as salary,
        seniority_level as experience,
        skills
      FROM team_members
      WHERE team_id = $1
      ORDER BY compensation_amount DESC NULLS LAST`,
      [teamId]
    );

    const members = membersQuery.rows;

    // Calculate statistics
    const salaries = members.map(m => m.salary || 0).filter(s => s > 0);
    const total_budget = salaries.reduce((sum, s) => sum + s, 0);
    const average_salary = salaries.length > 0 ? total_budget / salaries.length : 0;
    const min_salary = salaries.length > 0 ? Math.min(...salaries) : 0;
    const max_salary = salaries.length > 0 ? Math.max(...salaries) : 0;

    // Calculate role statistics
    const roleStats = {};
    members.forEach(m => {
      if (!m.role) return;
      if (!roleStats[m.role]) {
        roleStats[m.role] = { salaries: [], count: 0 };
      }
      if (m.salary > 0) {
        roleStats[m.role].salaries.push(m.salary);
      }
      roleStats[m.role].count++;
    });

    const role_statistics = Object.entries(roleStats).map(([role, data]) => ({
      role: role,
      count: data.count,
      average_salary: data.salaries.length > 0
        ? data.salaries.reduce((a, b) => a + b, 0) / data.salaries.length
        : 0,
      min_salary: data.salaries.length > 0 ? Math.min(...data.salaries) : 0,
      max_salary: data.salaries.length > 0 ? Math.max(...data.salaries) : 0
    }));

    // Mock market values (in real app, fetch from external API)
    const membersWithMarket = members.map(m => ({
      ...m,
      market_value: m.salary ? m.salary * (0.95 + Math.random() * 0.15) : 0 // ±10% variation
    }));

    // Budget allocation by role
    const budget_allocation = {};
    Object.entries(roleStats).forEach(([role, data]) => {
      const roleTotal = data.salaries.reduce((a, b) => a + b, 0);
      budget_allocation[role] = roleTotal;
    });

    // Mock salary history for charts (last 12 months)
    const salary_history = [];
    const currentDate = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      const month = date.toLocaleDateString('uk-UA', { month: 'short', year: 'numeric' });

      const baseAmount = total_budget * (1 - i * 0.02); // 2% growth per month backwards
      const actual = i <= 0 ? total_budget : baseAmount;
      const forecast = i < 0 ? null : total_budget * (1 + (12 - i) * 0.025); // 2.5% forecast growth

      salary_history.push({
        month: month,
        actual: Math.round(actual),
        forecast: forecast ? Math.round(forecast) : null
      });
    }

    // Mock market data by role
    const market_data = {
      roles: role_statistics.map(rs => ({
        name: rs.role,
        our_salary: rs.average_salary,
        market_median: rs.average_salary * (0.9 + Math.random() * 0.2),
        difference: Math.round((Math.random() - 0.5) * 30), // -15% to +15%
        percentile_min: 25,
        percentile_max: 75,
        our_percentile: 40 + Math.random() * 20 // 40-60 percentile
      }))
    };

    const analyticsData = {
      team_id: teamId,
      team_name: team.name,
      client_name: team.client_name,
      total_budget: total_budget,
      average_salary: average_salary,
      total_members: members.length,
      budget_used_percent: 75 + Math.random() * 20, // Mock: 75-95%
      budget_trend: Math.round((Math.random() - 0.3) * 10), // Slight negative to positive trend
      salary_trend: Math.round((Math.random() - 0.2) * 8),
      headcount_trend: Math.round((Math.random() - 0.1) * 15),
      members: membersWithMarket,
      role_statistics: role_statistics,
      budget_allocation: budget_allocation,
      salary_history: salary_history,
      market_data: market_data,
      budget: {
        total: total_budget,
        used: total_budget,
        remaining: 0,
        currency: 'UAH'
      }
    };

    logger.info('Salary analytics fetched successfully');

    res.json({
      success: true,
      data: analyticsData
    });

  } catch (error) {
    logger.error('Failed to fetch salary analytics', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch salary analytics',
      details: error.message
    });
  }
});

export default r;
