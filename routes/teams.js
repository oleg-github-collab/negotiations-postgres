import { Router } from 'express';
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

r.post('/', validateTeamCreate, async (req, res) => {
  const start = performance.now();
  try {
    const payload = req.body || {};
    const clientId = Number(payload.client_id);
    const title = payload.title?.trim() || `Team #${Date.now()}`;
    const description = payload.description?.trim() || null;
    const members = Array.isArray(payload.members) ? payload.members : [];

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
    logError(error, { endpoint: 'POST /api/teams', body: req.body, ip: req.ip });
    res.status(500).json({ success: false, error: 'Не вдалося створити команду' });
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
          responseTime: Math.round(duration)
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

export default r;
