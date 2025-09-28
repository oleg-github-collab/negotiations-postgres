// routes/clients.js - Production client management with PostgreSQL
import { Router } from 'express';
import { run, get, all } from '../utils/db.js';
import { validateClient, validateClientId, validateAnalysisId } from '../middleware/validators.js';
import { logError, logSecurity } from '../utils/logger.js';
import { performance } from 'perf_hooks';

const r = Router();

// Helper to safely parse JSON columns that might arrive as strings
const parseJsonColumn = (value, fallback) => {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

// GET /api/clients - get all clients with analytics
r.get('/', async (req, res) => {
  const startTime = performance.now();

  try {
    const rows = await all(
      `
      SELECT
        c.*,
        COUNT(a.id) AS analyses_count,
        MAX(a.created_at) AS last_analysis_at,
        AVG((a.barometer ->> 'score')::numeric) AS avg_complexity_score
      FROM clients c
      LEFT JOIN analyses a ON c.id = a.client_id
      GROUP BY c.id
      ORDER BY c.updated_at DESC, c.id DESC
      LIMIT 1000
      `
    );

    const duration = performance.now() - startTime;

    res.set('X-Response-Time', `${Math.round(duration)}ms`);
    res.json({
      success: true,
      clients: rows.map(row => ({
        ...row,
        analyses_count: Number(row.analyses_count || 0),
        avg_complexity_score: row.avg_complexity_score != null ? Number(row.avg_complexity_score) : null
      })),
      meta: {
        count: rows.length,
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    logError(error, { endpoint: 'GET /api/clients', ip: req.ip });
    res.status(500).json({ success: false, error: 'Database error occurred' });
  }
});

// GET /api/clients/:id - get client details with analysis history
r.get('/:id', validateClientId, async (req, res) => {
  const startTime = performance.now();

  try {
    const id = Number(req.params.id);
    const client = await get('SELECT * FROM clients WHERE id = $1', [id]);

    if (!client) {
      logSecurity('Attempt to access non-existent client', {
        clientId: id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const analyses = await all(
      `
      SELECT
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
      LIMIT 100
      `,
      [id]
    );

    const duration = performance.now() - startTime;

    res.set('X-Response-Time', `${Math.round(duration)}ms`);
    res.json({
      success: true,
      client,
      analyses: analyses.map(item => ({
        ...item,
        complexity_score: item.complexity_score != null ? Number(item.complexity_score) : null
      })),
      meta: {
        analysisCount: analyses.length,
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    logError(error, { endpoint: 'GET /api/clients/:id', clientId: req.params.id, ip: req.ip });
    res.status(500).json({ success: false, error: 'Database error occurred' });
  }
});

// GET /api/clients/:id/analysis/:analysisId - specific analysis with JSON fields
r.get('/:id/analysis/:analysisId', validateClientId, validateAnalysisId, async (req, res) => {
  const startTime = performance.now();

  try {
    const clientId = Number(req.params.id);
    const analysisId = Number(req.params.analysisId);

    const analysis = await get(
      `
      SELECT *
      FROM analyses
      WHERE id = $1 AND client_id = $2
      `,
      [analysisId, clientId]
    );

    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Analysis not found' });
    }

    const formatted = {
      ...analysis,
      highlights: parseJsonColumn(analysis.highlights, []),
      summary: parseJsonColumn(analysis.summary, {}),
      barometer: parseJsonColumn(analysis.barometer, {}),
      personas: parseJsonColumn(analysis.personas, []),
      insights: parseJsonColumn(analysis.insights, {})
    };

    const duration = performance.now() - startTime;
    res.set('X-Response-Time', `${Math.round(duration)}ms`);

    res.json({
      success: true,
      analysis: formatted,
      meta: {
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    logError(error, {
      endpoint: 'GET /api/clients/:id/analysis/:analysisId',
      clientId: req.params.id,
      analysisId: req.params.analysisId,
      ip: req.ip
    });
    res.status(500).json({ success: false, error: 'Database error occurred' });
  }
});

// POST /api/clients - create new client
r.post('/', validateClient, async (req, res) => {
  const startTime = performance.now();

  try {
    const c = req.body || {};

    const result = await run(
      `
      INSERT INTO clients (
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
      RETURNING *
      `,
      [
        c.company,
        c.negotiator || null,
        c.sector || null,
        c.company_size || null,
        c.negotiation_type || null,
        c.deal_value || null,
        c.timeline || null,
        c.goal || null,
        c.decision_criteria || c.criteria || null,
        c.constraints || null,
        c.user_goals || null,
        c.client_goals || null,
        c.competitors || null,
        c.competitive_advantage || null,
        c.market_position || null,
        Number(c.weekly_hours) || 0,
        c.offered_services || null,
        c.deadlines || null,
        c.previous_interactions || null,
        c.notes || null
      ]
    );

    const client = result.rows[0];

    const duration = performance.now() - startTime;
    res.status(201).json({
      success: true,
      id: client.id,
      client,
      created: true,
      meta: {
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    logError(error, { endpoint: 'POST /api/clients', ip: req.ip });
    res.status(500).json({ success: false, error: 'Database error occurred' });
  }
});

// PUT /api/clients/:id - update client
r.put('/:id', validateClientId, validateClient, async (req, res) => {
  const startTime = performance.now();

  try {
    const id = Number(req.params.id);
    const c = req.body || {};

    const existing = await get('SELECT id FROM clients WHERE id = $1', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const result = await run(
      `
      UPDATE clients SET
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
      RETURNING *
      `,
      [
        c.company,
        c.negotiator || null,
        c.sector || null,
        c.company_size || null,
        c.negotiation_type || null,
        c.deal_value || null,
        c.timeline || null,
        c.goal || null,
        c.decision_criteria || c.criteria || null,
        c.constraints || null,
        c.user_goals || null,
        c.client_goals || null,
        c.competitors || null,
        c.competitive_advantage || null,
        c.market_position || null,
        Number(c.weekly_hours) || 0,
        c.offered_services || null,
        c.deadlines || null,
        c.previous_interactions || null,
        c.notes || null,
        id
      ]
    );

    const updatedClient = result.rows[0];
    const duration = performance.now() - startTime;

    res.json({
      success: true,
      updated: true,
      client: updatedClient,
      meta: {
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    logError(error, { endpoint: 'PUT /api/clients/:id', clientId: req.params.id, ip: req.ip });
    res.status(500).json({ success: false, error: 'Database error occurred' });
  }
});

// DELETE /api/clients/:id - delete client
r.delete('/:id', validateClientId, async (req, res) => {
  const startTime = performance.now();

  try {
    const id = Number(req.params.id);

    const client = await get('SELECT company FROM clients WHERE id = $1', [id]);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const analysesCountRow = await get('SELECT COUNT(*) AS count FROM analyses WHERE client_id = $1', [id]);
    const analysesCount = Number(analysesCountRow?.count || 0);

    await run('DELETE FROM clients WHERE id = $1', [id]);

    logSecurity('Client deletion', {
      clientId: id,
      clientName: client.company,
      deletedAnalyses: analysesCount,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const duration = performance.now() - startTime;
    res.json({
      success: true,
      meta: {
        deletedRows: 1,
        deletedAnalyses: analysesCount,
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    logError(error, { endpoint: 'DELETE /api/clients/:id', clientId: req.params.id, ip: req.ip });
    res.status(500).json({ success: false, error: 'Database error occurred' });
  }
});

// DELETE /api/clients/:id/analysis/:analysisId - delete analysis
r.delete('/:id/analysis/:analysisId', validateClientId, validateAnalysisId, async (req, res) => {
  const startTime = performance.now();

  try {
    const clientId = Number(req.params.id);
    const analysisId = Number(req.params.analysisId);

    const existing = await get('SELECT title FROM analyses WHERE id = $1 AND client_id = $2', [analysisId, clientId]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Analysis not found' });
    }

    logSecurity('Analysis deletion', {
      analysisId,
      clientId,
      title: existing.title,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const result = await run('DELETE FROM analyses WHERE id = $1 AND client_id = $2', [analysisId, clientId]);

    const duration = performance.now() - startTime;
    res.json({
      success: true,
      meta: {
        deletedRows: result.rowCount,
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    logError(error, {
      endpoint: 'DELETE /api/clients/:id/analysis/:analysisId',
      clientId: req.params.id,
      analysisId: req.params.analysisId,
      ip: req.ip
    });
    res.status(500).json({ success: false, error: 'Database error occurred' });
  }
});

export default r;
