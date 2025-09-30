import { Router } from 'express';
import { performance } from 'perf_hooks';
import { transaction, get, all, run } from '../utils/db.js';
import { client as openaiClient, estimateTokens } from '../utils/openAIClient.js';
import { addTokensAndCheck } from '../utils/tokenUsage.js';
import {
  validateClientId
} from '../middleware/validators.js';
import { logError, logAIUsage, logPerformance } from '../utils/logger.js';
import { recordAuditEvent } from '../utils/audit.js';

const r = Router();
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

// Calculate analysis metrics from parsed result
function calculateAnalysisMetrics(parsed) {
  const highlights = parsed.highlights || [];

  let manipulationCount = 0;
  let biasCount = 0;
  let fallacyCount = 0;
  let severitySum = 0;
  let totalHighlights = highlights.length;

  highlights.forEach(highlight => {
    if (highlight.category === 'manipulation') {
      manipulationCount++;
    } else if (highlight.category === 'cognitive_bias') {
      biasCount++;
    } else if (highlight.category === 'rhetorical_fallacy') {
      fallacyCount++;
    }

    // Add severity to sum (assuming severity is 1-3)
    const severity = highlight.severity || 1;
    severitySum += severity;
  });

  const severityAverage = totalHighlights > 0 ? severitySum / totalHighlights : 0;

  // Determine risk level based on counts and severity
  let riskLevel = 'low';
  if (totalHighlights > 10 || severityAverage > 2.5) {
    riskLevel = 'high';
  } else if (totalHighlights > 5 || severityAverage > 1.5) {
    riskLevel = 'medium';
  }

  return {
    manipulationCount,
    biasCount,
    fallacyCount,
    severityAverage: Math.round(severityAverage * 100) / 100,
    riskLevel
  };
}

// Create new negotiation session (independent of teams)
r.post('/', async (req, res) => {
  const start = performance.now();
  try {
    const payload = req.body || {};
    const clientId = Number(payload.client_id);

    if (!clientId || clientId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Невірний ID клієнта',
        code: 'INVALID_CLIENT_ID'
      });
    }

    // Verify client exists
    const client = await get('SELECT id, company FROM clients WHERE id = $1', [clientId]);
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Клієнта не знайдено',
        code: 'CLIENT_NOT_FOUND'
      });
    }

    const title = payload.title?.trim() || `Переговори з ${client.company}`;
    const description = payload.description?.trim() || null;
    const negotiation_type = payload.negotiation_type || 'sales';
    const status = 'active';

    const created = await run(
      `INSERT INTO negotiations (
        client_id,
        title,
        description,
        negotiation_type,
        status,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        clientId,
        title,
        description,
        negotiation_type,
        status,
        payload.metadata || {}
      ]
    );

    const duration = performance.now() - start;

    await recordAuditEvent({
      requestId: req.context?.requestId,
      eventType: 'negotiation.created',
      actor: req.user?.username,
      entityType: 'negotiation',
      entityId: String(created.rows[0].id),
      metadata: {
        clientId,
        title,
        type: negotiation_type
      }
    });

    res.status(201).json({
      success: true,
      negotiation: created.rows[0],
      meta: {
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    const duration = performance.now() - start;
    logError(error, {
      endpoint: 'POST /api/negotiations',
      body: req.body,
      ip: req.ip,
      responseTime: Math.round(duration)
    });

    res.status(500).json({
      success: false,
      error: 'Не вдалося створити сеанс переговорів',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Get negotiations by client with enhanced filtering and search
r.get('/client/:id', validateClientId, async (req, res) => {
  const start = performance.now();
  try {
    const clientId = Number(req.params.id);
    const { search, status, limit = 50, offset = 0 } = req.query;

    let whereClause = 'n.client_id = $1';
    let params = [clientId];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (n.title ILIKE $${paramIndex} OR n.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status && ['active', 'completed', 'cancelled', 'paused'].includes(status)) {
      whereClause += ` AND n.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const negotiations = await all(
      `
      SELECT
        n.*,
        COUNT(na.id) AS analysis_count,
        MAX(na.created_at) AS last_analysis_at,
        COUNT(DISTINCT CASE WHEN na.person_focus IS NOT NULL THEN na.person_focus END) AS person_filters_count
      FROM negotiations n
      LEFT JOIN negotiation_analyses na ON na.negotiation_id = n.id
      WHERE ${whereClause}
      GROUP BY n.id
      ORDER BY n.updated_at DESC, n.id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      [...params, Number(limit), Number(offset)]
    );

    const totalCount = await get(
      `SELECT COUNT(DISTINCT n.id) as total FROM negotiations n WHERE ${whereClause}`,
      params.slice(0, paramIndex - 2)
    );

    const duration = performance.now() - start;

    res.json({
      success: true,
      negotiations,
      meta: {
        count: negotiations.length,
        total: totalCount?.total || 0,
        limit: Number(limit),
        offset: Number(offset),
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    logError(error, {
      endpoint: 'GET /api/negotiations/client/:id',
      clientId: req.params.id,
      query: req.query,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      error: 'Не вдалося отримати список переговорів'
    });
  }
});

// Get specific negotiation with analyses and filtering
r.get('/:negotiationId', async (req, res) => {
  const start = performance.now();
  try {
    const negotiationId = Number(req.params.negotiationId);
    const { person_filter, analysis_type } = req.query;

    const negotiation = await get('SELECT * FROM negotiations WHERE id = $1', [negotiationId]);

    if (!negotiation) {
      return res.status(404).json({
        success: false,
        error: 'Переговори не знайдено'
      });
    }

    let analysesQuery = 'SELECT * FROM negotiation_analyses WHERE negotiation_id = $1';
    let params = [negotiationId];
    let paramIndex = 2;

    if (person_filter) {
      analysesQuery += ` AND person_focus = $${paramIndex}`;
      params.push(person_filter);
      paramIndex++;
    }

    if (analysis_type) {
      analysesQuery += ` AND source = $${paramIndex}`;
      params.push(analysis_type);
      paramIndex++;
    }

    analysesQuery += ' ORDER BY created_at DESC';

    const analyses = await all(analysesQuery, params);

    // Get available person filters for this negotiation
    const personFilters = await all(
      'SELECT DISTINCT person_focus FROM negotiation_analyses WHERE negotiation_id = $1 AND person_focus IS NOT NULL ORDER BY person_focus',
      [negotiationId]
    );

    const duration = performance.now() - start;

    res.json({
      success: true,
      negotiation,
      analyses,
      available_person_filters: personFilters.map(p => p.person_focus),
      meta: {
        responseTime: Math.round(duration),
        filtered_by_person: person_filter || null,
        filtered_by_type: analysis_type || null
      }
    });
  } catch (error) {
    logError(error, {
      endpoint: 'GET /api/negotiations/:negotiationId',
      negotiationId: req.params.negotiationId,
      query: req.query,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      error: 'Не вдалося отримати інформацію про переговори'
    });
  }
});

// Add analysis to negotiation (independent of team analysis)
r.post('/:negotiationId/analyze', async (req, res) => {
  if (!openaiClient) {
    return res.status(503).json({
      success: false,
      error: 'AI сервіс тимчасово недоступний',
      code: 'AI_SERVICE_UNAVAILABLE'
    });
  }

  const start = performance.now();
  try {
    const negotiationId = Number(req.params.negotiationId);
    const negotiation = await get('SELECT * FROM negotiations WHERE id = $1', [negotiationId]);

    if (!negotiation) {
      return res.status(404).json({
        success: false,
        error: 'Переговори не знайдено'
      });
    }

    const { text, filename, source, person_focus, analysis_scope } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Текст для аналізу обов\'язковий',
        code: 'MISSING_TEXT'
      });
    }

    // Enhanced system prompt with person-specific focus
    let analysisInstruction = '';
    if (person_focus) {
      analysisInstruction = `ФОКУС АНАЛІЗУ: Проаналізуй тільки репліки та поведінку особи "${person_focus}". Ігноруй інших учасників переговорів та зосередься виключно на цій особі.

`;
    }

    const systemPrompt = `
Ти — Chief Negotiation Intelligence Officer для Kaminskyi AI.
Твоя місія: зробити глибокий аналіз переговорів, виявити маніпуляції, когнітивні упередження та приховані мотиви.

${analysisInstruction}Проаналізуй цей текст переговорів максимально детально та поверни СТРОГО JSON:

{
  "summary": {
    "key_points": ["..."],
    "main_themes": ["..."],
    "negotiation_stage": "opening|exploring|bargaining|closing",
    "overall_tone": "cooperative|competitive|neutral|hostile",
    "outcome_probability": "high|medium|low"
  },
  "barometer": {
    "client_interest": 0-100,
    "deal_likelihood": 0-100,
    "trust_level": 0-100,
    "urgency": 0-100,
    "budget_readiness": 0-100
  },
  "manipulation_detection": [
    {
      "technique": "назва техніки",
      "severity": "low|medium|high|critical",
      "evidence": "конкретний приклад з тексту",
      "counter_strategy": "як відповісти",
      "risk_level": 0-100
    }
  ],
  "personas": [
    {
      "name": "ім'я або роль",
      "role": "decision_maker|influencer|gatekeeper|user",
      "power_level": 0-100,
      "interest_level": 0-100,
      "personality_traits": ["..."],
      "concerns": ["..."],
      "motivation": "..."
    }
  ],
  "insights": {
    "hidden_objections": ["..."],
    "unspoken_needs": ["..."],
    "pressure_points": ["..."],
    "opportunities": ["..."],
    "red_flags": ["..."]
  },
  "recommendations": {
    "immediate_actions": ["..."],
    "long_term_strategy": ["..."],
    "questions_to_ask": ["..."],
    "concessions_to_avoid": ["..."],
    "closing_opportunities": ["..."]
  },
  "highlights": [
    {
      "text": "точна цитата",
      "category": "manipulation|objection|opportunity|concern|commitment",
      "importance": "high|medium|low",
      "explanation": "чому це важливо"
    }
  ]
}
    `.trim();

    const tokensIn = estimateTokens(systemPrompt) + estimateTokens(text) + 200;
    await addTokensAndCheck(tokensIn);

    const response = await openaiClient.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      max_tokens: 4000
    });

    const content = response.choices?.[0]?.message?.content || '{}';
    const tokensOut = estimateTokens(content);
    await addTokensAndCheck(tokensOut);

    logAIUsage(tokensIn + tokensOut, MODEL, 'negotiation_analysis');

    let parsed;
    try {
      parsed = JSON.parse(content.replace(/```json/gi, '').replace(/```/g, '').trim());
    } catch (parseError) {
      throw new Error('Не вдалося розпарсити відповідь AI');
    }

    // Calculate analysis metrics
    const analysisMetrics = calculateAnalysisMetrics(parsed);
    const analysisTitle = person_focus
      ? `Аналіз репік "${person_focus}" - ${new Date().toLocaleString('uk-UA')}`
      : filename || `Аналіз ${new Date().toLocaleString('uk-UA')}`;

    // Get client_id from negotiation
    const negotiationData = await get('SELECT client_id FROM negotiations WHERE id = $1', [negotiationId]);
    const clientId = negotiationData?.client_id;

    const analysis = await run(
      `INSERT INTO negotiation_analyses (
        negotiation_id,
        client_id,
        title,
        source,
        original_filename,
        original_text,
        tokens_estimated,
        highlights,
        summary,
        barometer,
        personas,
        insights,
        person_focus,
        analysis_duration,
        manipulation_count,
        bias_count,
        fallacy_count,
        severity_average,
        risk_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
      [
        negotiationId,
        clientId,
        analysisTitle,
        source || 'manual',
        filename,
        text,
        tokensIn + tokensOut,
        parsed.highlights || [],
        parsed.summary || {},
        parsed.barometer || {},
        parsed.personas || [],
        parsed.insights || {},
        person_focus || null,
        Math.round((performance.now() - start) / 1000), // duration in seconds
        analysisMetrics.manipulationCount,
        analysisMetrics.biasCount,
        analysisMetrics.fallacyCount,
        analysisMetrics.severityAverage,
        analysisMetrics.riskLevel
      ]
    );

    const duration = performance.now() - start;
    logPerformance('Negotiation Analysis', duration, {
      negotiationId,
      tokensIn,
      tokensOut
    });

    await recordAuditEvent({
      requestId: req.context?.requestId,
      eventType: 'negotiation.analyzed',
      actor: req.user?.username,
      entityType: 'negotiation',
      entityId: String(negotiationId),
      metadata: {
        analysisId: analysis.rows[0].id,
        tokensIn,
        tokensOut,
        source
      }
    });

    res.json({
      success: true,
      analysis: analysis.rows[0],
      parsed_result: parsed,
      meta: {
        tokensUsed: tokensIn + tokensOut,
        responseTime: Math.round(duration)
      }
    });

  } catch (error) {
    const duration = performance.now() - start;
    logError(error, {
      endpoint: 'POST /api/negotiations/:negotiationId/analyze',
      negotiationId: req.params.negotiationId,
      ip: req.ip,
      responseTime: Math.round(duration)
    });

    if (error.message.includes('token limit')) {
      return res.status(429).json({
        success: false,
        error: 'Перевищено ліміт токенів на сьогодні',
        code: 'TOKEN_LIMIT_EXCEEDED'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Не вдалося проаналізувати переговори',
      code: 'ANALYSIS_FAILED'
    });
  }
});

// Update negotiation status
r.patch('/:negotiationId/status', async (req, res) => {
  const start = performance.now();
  try {
    const negotiationId = Number(req.params.negotiationId);
    const { status, outcome } = req.body;

    if (!['active', 'completed', 'cancelled', 'paused'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Невірний статус',
        code: 'INVALID_STATUS'
      });
    }

    const updated = await run(
      'UPDATE negotiations SET status = $1, outcome = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [status, outcome || null, negotiationId]
    );

    if (!updated.rowCount) {
      return res.status(404).json({
        success: false,
        error: 'Переговори не знайдено',
        code: 'NEGOTIATION_NOT_FOUND'
      });
    }

    const duration = performance.now() - start;

    await recordAuditEvent({
      requestId: req.context?.requestId,
      eventType: 'negotiation.status_updated',
      actor: req.user?.username,
      entityType: 'negotiation',
      entityId: String(negotiationId),
      metadata: {
        oldStatus: 'unknown',
        newStatus: status,
        outcome
      }
    });

    res.json({
      success: true,
      negotiation: updated.rows[0],
      meta: {
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    logError(error, {
      endpoint: 'PATCH /api/negotiations/:negotiationId/status',
      negotiationId: req.params.negotiationId,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Не вдалося оновити статус переговорів',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Get archive of all analyses for a client with enhanced search and filtering
r.get('/client/:id/archive', validateClientId, async (req, res) => {
  const start = performance.now();
  try {
    const clientId = Number(req.params.id);
    const {
      search,
      person_filter,
      analysis_type,
      date_from,
      date_to,
      limit = 100,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    let whereClause = 'n.client_id = $1';
    let params = [clientId];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (na.title ILIKE $${paramIndex} OR na.original_text ILIKE $${paramIndex} OR n.title ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (person_filter) {
      whereClause += ` AND na.person_focus = $${paramIndex}`;
      params.push(person_filter);
      paramIndex++;
    }

    if (analysis_type) {
      whereClause += ` AND na.source = $${paramIndex}`;
      params.push(analysis_type);
      paramIndex++;
    }

    if (date_from) {
      whereClause += ` AND na.created_at >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      whereClause += ` AND na.created_at <= $${paramIndex}`;
      params.push(date_to + ' 23:59:59');
      paramIndex++;
    }

    const allowedSortColumns = ['created_at', 'title', 'tokens_estimated'];
    const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const analyses = await all(
      `
      SELECT
        na.*,
        n.title as negotiation_title,
        n.status as negotiation_status,
        n.negotiation_type,
        c.company as client_company
      FROM negotiation_analyses na
      JOIN negotiations n ON na.negotiation_id = n.id
      JOIN clients c ON n.client_id = c.id
      WHERE ${whereClause}
      ORDER BY na.${sortColumn} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      [...params, Number(limit), Number(offset)]
    );

    // Get available person filters for this client
    const personFilters = await all(
      `
      SELECT DISTINCT na.person_focus
      FROM negotiation_analyses na
      JOIN negotiations n ON na.negotiation_id = n.id
      WHERE n.client_id = $1 AND na.person_focus IS NOT NULL
      ORDER BY na.person_focus
      `,
      [clientId]
    );

    // Get analysis types
    const analysisTypes = await all(
      `
      SELECT DISTINCT na.source
      FROM negotiation_analyses na
      JOIN negotiations n ON na.negotiation_id = n.id
      WHERE n.client_id = $1 AND na.source IS NOT NULL
      ORDER BY na.source
      `,
      [clientId]
    );

    const totalCount = await get(
      `
      SELECT COUNT(na.id) as total
      FROM negotiation_analyses na
      JOIN negotiations n ON na.negotiation_id = n.id
      WHERE ${whereClause}
      `,
      params.slice(0, paramIndex - 2)
    );

    const duration = performance.now() - start;

    res.json({
      success: true,
      analyses,
      filters: {
        available_persons: personFilters.map(p => p.person_focus),
        available_types: analysisTypes.map(t => t.source),
        current: {
          search: search || null,
          person_filter: person_filter || null,
          analysis_type: analysis_type || null,
          date_from: date_from || null,
          date_to: date_to || null
        }
      },
      meta: {
        count: analyses.length,
        total: totalCount?.total || 0,
        limit: Number(limit),
        offset: Number(offset),
        sort_by: sortColumn,
        sort_order: sortDirection,
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    logError(error, {
      endpoint: 'GET /api/negotiations/client/:id/archive',
      clientId: req.params.id,
      query: req.query,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      error: 'Не вдалося отримати архів аналізів'
    });
  }
});

// Get analysis statistics for a client
r.get('/client/:id/stats', validateClientId, async (req, res) => {
  const start = performance.now();
  try {
    const clientId = Number(req.params.id);

    const stats = await get(
      `
      SELECT
        COUNT(DISTINCT n.id) as total_negotiations,
        COUNT(na.id) as total_analyses,
        COUNT(DISTINCT na.person_focus) as unique_persons_analyzed,
        AVG(na.tokens_estimated) as avg_tokens_per_analysis,
        MIN(na.created_at) as first_analysis_date,
        MAX(na.created_at) as last_analysis_date
      FROM negotiations n
      LEFT JOIN negotiation_analyses na ON na.negotiation_id = n.id
      WHERE n.client_id = $1
      `,
      [clientId]
    );

    const personStats = await all(
      `
      SELECT
        na.person_focus,
        COUNT(*) as analysis_count,
        AVG(na.tokens_estimated) as avg_tokens
      FROM negotiation_analyses na
      JOIN negotiations n ON na.negotiation_id = n.id
      WHERE n.client_id = $1 AND na.person_focus IS NOT NULL
      GROUP BY na.person_focus
      ORDER BY analysis_count DESC
      `,
      [clientId]
    );

    const typeStats = await all(
      `
      SELECT
        na.source,
        COUNT(*) as analysis_count
      FROM negotiation_analyses na
      JOIN negotiations n ON na.negotiation_id = n.id
      WHERE n.client_id = $1 AND na.source IS NOT NULL
      GROUP BY na.source
      ORDER BY analysis_count DESC
      `,
      [clientId]
    );

    const duration = performance.now() - start;

    res.json({
      success: true,
      stats: {
        overview: stats,
        by_person: personStats,
        by_type: typeStats
      },
      meta: {
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    logError(error, {
      endpoint: 'GET /api/negotiations/client/:id/stats',
      clientId: req.params.id,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      error: 'Не вдалося отримати статистику аналізів'
    });
  }
});

// Delete analysis from archive
r.delete('/analysis/:analysisId', async (req, res) => {
  const start = performance.now();
  try {
    const analysisId = Number(req.params.analysisId);

    const deleted = await run(
      'DELETE FROM negotiation_analyses WHERE id = $1 RETURNING *',
      [analysisId]
    );

    if (!deleted.rowCount) {
      return res.status(404).json({
        success: false,
        error: 'Аналіз не знайдено',
        code: 'ANALYSIS_NOT_FOUND'
      });
    }

    const duration = performance.now() - start;

    await recordAuditEvent({
      requestId: req.context?.requestId,
      eventType: 'negotiation_analysis.deleted',
      actor: req.user?.username,
      entityType: 'negotiation_analysis',
      entityId: String(analysisId),
      metadata: {
        deletedAnalysis: deleted.rows[0]
      }
    });

    res.json({
      success: true,
      message: 'Аналіз видалено з архіву',
      meta: {
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    logError(error, {
      endpoint: 'DELETE /api/negotiations/analysis/:analysisId',
      analysisId: req.params.analysisId,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      error: 'Не вдалося видалити аналіз'
    });
  }
});

// Get person history for autocomplete
r.get('/persons-history', async (req, res) => {
  try {
    const start = performance.now();

    // Get all unique persons from analyses with usage statistics
    const personsData = await all(`
      SELECT
        person_focus,
        COUNT(*) as usage_count,
        MAX(created_at) as last_used,
        ARRAY_AGG(DISTINCT CASE
          WHEN highlights->0->>'category' IS NOT NULL
          THEN highlights->0->>'category'
          ELSE NULL
        END) as categories
      FROM negotiation_analyses
      WHERE person_focus IS NOT NULL
        AND person_focus != ''
      GROUP BY person_focus
      ORDER BY usage_count DESC, last_used DESC
      LIMIT 100
    `);

    // Parse and format person data
    const persons = personsData.map(row => {
      const names = row.person_focus.split(',').map(n => n.trim()).filter(n => n);
      return names.map(name => ({
        name,
        usageCount: parseInt(row.usage_count),
        lastUsed: row.last_used,
        categories: row.categories?.filter(c => c) || []
      }));
    }).flat();

    // Deduplicate and aggregate by name
    const personMap = new Map();
    persons.forEach(person => {
      if (personMap.has(person.name)) {
        const existing = personMap.get(person.name);
        existing.usageCount += person.usageCount;
        if (new Date(person.lastUsed) > new Date(existing.lastUsed)) {
          existing.lastUsed = person.lastUsed;
        }
        existing.categories = [...new Set([...existing.categories, ...person.categories])];
      } else {
        personMap.set(person.name, person);
      }
    });

    const uniquePersons = Array.from(personMap.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 50);

    const duration = performance.now() - start;

    res.json({
      success: true,
      persons: uniquePersons,
      meta: {
        responseTime: Math.round(duration),
        totalCount: uniquePersons.length
      }
    });
  } catch (error) {
    logError(error, {
      endpoint: 'GET /api/negotiations/persons-history',
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      error: 'Не вдалося завантажити історію осіб'
    });
  }
});

// Track person usage
r.post('/track-person-usage', async (req, res) => {
  try {
    const { personName } = req.body;

    if (!personName) {
      return res.status(400).json({
        success: false,
        error: 'Назва особи обов\'язкова'
      });
    }

    // This could be expanded to track in a separate table
    // For now, we'll just acknowledge the tracking
    res.json({
      success: true,
      message: 'Використання особи відстежено'
    });
  } catch (error) {
    logError(error, {
      endpoint: 'POST /api/negotiations/track-person-usage',
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      error: 'Не вдалося відстежити використання особи'
    });
  }
});

// Get filter history
r.get('/filter-history', async (req, res) => {
  try {
    const start = performance.now();

    // Get common filter combinations
    const filterHistory = await all(`
      SELECT
        person_focus,
        COUNT(*) as usage_count,
        MAX(created_at) as last_used,
        AVG(CASE
          WHEN risk_level = 'high' THEN 3
          WHEN risk_level = 'medium' THEN 2
          ELSE 1
        END) as avg_risk_score
      FROM negotiation_analyses
      WHERE person_focus IS NOT NULL
        AND person_focus != ''
      GROUP BY person_focus
      HAVING COUNT(*) > 1
      ORDER BY usage_count DESC, last_used DESC
      LIMIT 20
    `);

    const history = filterHistory.map(row => ({
      persons: row.person_focus.split(',').map(p => p.trim()).filter(p => p),
      usageCount: parseInt(row.usage_count),
      lastUsed: row.last_used,
      avgRiskScore: parseFloat(row.avg_risk_score || 0)
    }));

    const duration = performance.now() - start;

    res.json({
      success: true,
      history,
      meta: {
        responseTime: Math.round(duration),
        totalCount: history.length
      }
    });
  } catch (error) {
    logError(error, {
      endpoint: 'GET /api/negotiations/filter-history',
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      error: 'Не вдалося завантажити історію фільтрів'
    });
  }
});

// Enhanced analysis retrieval with person filtering
r.get('/client/:clientId/analyses-filtered', validateClientId, async (req, res) => {
  try {
    const start = performance.now();
    const clientId = Number(req.params.clientId);
    const { persons, riskLevel, dateFrom, dateTo, limit = 50, offset = 0 } = req.query;

    let whereConditions = ['na.client_id = $1'];
    let params = [clientId];
    let paramIndex = 2;

    // Person filtering
    if (persons) {
      const personList = persons.split(',').map(p => p.trim()).filter(p => p);
      if (personList.length > 0) {
        const personConditions = personList.map(() => {
          const condition = `na.person_focus ILIKE $${paramIndex}`;
          params.push(`%${personList[paramIndex - 2]}%`);
          paramIndex++;
          return condition;
        });
        whereConditions.push(`(${personConditions.join(' OR ')})`);
      }
    }

    // Risk level filtering
    if (riskLevel && ['low', 'medium', 'high'].includes(riskLevel)) {
      whereConditions.push(`na.risk_level = $${paramIndex}`);
      params.push(riskLevel);
      paramIndex++;
    }

    // Date range filtering
    if (dateFrom) {
      whereConditions.push(`na.created_at >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`na.created_at <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const analyses = await all(`
      SELECT
        na.*,
        n.title as negotiation_title,
        n.negotiation_type,
        n.status as negotiation_status
      FROM negotiation_analyses na
      LEFT JOIN negotiations n ON na.negotiation_id = n.id
      WHERE ${whereClause}
      ORDER BY na.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, parseInt(limit), parseInt(offset)]);

    // Get total count for pagination
    const countResult = await get(`
      SELECT COUNT(*) as total
      FROM negotiation_analyses na
      LEFT JOIN negotiations n ON na.negotiation_id = n.id
      WHERE ${whereClause}
    `, params);

    const duration = performance.now() - start;

    res.json({
      success: true,
      analyses,
      pagination: {
        total: parseInt(countResult.total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < parseInt(countResult.total)
      },
      meta: {
        responseTime: Math.round(duration),
        appliedFilters: {
          persons: persons ? persons.split(',').map(p => p.trim()) : [],
          riskLevel,
          dateFrom,
          dateTo
        }
      }
    });
  } catch (error) {
    logError(error, {
      endpoint: 'GET /api/negotiations/client/:clientId/analyses-filtered',
      clientId: req.params.clientId,
      query: req.query,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      error: 'Не вдалося отримати відфільтровані аналізи'
    });
  }
});

export default r;