// routes/prospects.js - Prospect (Potential Client) Management
import { Router } from 'express';
import { performance } from 'perf_hooks';
import { run, get, all } from '../utils/db.js';
import { logError, logSecurity } from '../utils/logger.js';

const r = Router();

// GET /api/prospects - Get all prospects with filtering, search, and sorting
r.get('/', async (req, res) => {
  const start = performance.now();
  try {
    const {
      search,
      status,
      risk_level,
      sort = 'recent',
      limit = 100,
      offset = 0
    } = req.query;

    let whereConditions = ["client_type = 'prospect'"];
    let params = [];
    let paramIndex = 1;

    // Search by company name, negotiator, or sector
    if (search) {
      whereConditions.push(`(
        company ILIKE $${paramIndex} OR
        negotiator ILIKE $${paramIndex} OR
        sector ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Filter by status
    if (status) {
      whereConditions.push(`notes->>'status' = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // Filter by risk level
    if (risk_level) {
      whereConditions.push(`notes->>'risk_level' = $${paramIndex}`);
      params.push(risk_level);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Determine sorting
    let orderBy = 'created_at DESC';
    switch (sort) {
      case 'name':
        orderBy = 'company ASC';
        break;
      case 'risk':
        orderBy = "notes->>'risk_level' DESC, created_at DESC";
        break;
      case 'date':
        orderBy = 'created_at ASC';
        break;
      default:
        orderBy = 'created_at DESC';
    }

    // Get prospects with analysis count
    const prospects = await all(`
      SELECT
        c.*,
        COUNT(DISTINCT a.id) as analysis_count,
        MAX(a.created_at) as last_analysis_date,
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'id', a.id,
              'title', a.title,
              'created_at', a.created_at,
              'risk_level', a.barometer->>'risk_level'
            )
          ) FILTER (WHERE a.id IS NOT NULL),
          '[]'::jsonb
        ) as recent_analyses
      FROM clients c
      LEFT JOIN analyses a ON c.id = a.client_id
      ${whereClause}
      GROUP BY c.id
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, parseInt(limit), parseInt(offset)]);

    // Get total count for pagination
    const countResult = await get(`
      SELECT COUNT(*) as total
      FROM clients c
      ${whereClause}
    `, params);

    // Calculate statistics
    const stats = {
      total: parseInt(countResult.total),
      active: prospects.filter(p => p.notes?.status === 'active').length,
      promising: prospects.filter(p => p.notes?.status === 'promising').length,
      risky: prospects.filter(p => p.notes?.risk_level === 'high' || p.notes?.risk_level === 'critical').length
    };

    const duration = performance.now() - start;

    res.json({
      success: true,
      prospects,
      stats,
      meta: {
        total: stats.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        responseTime: Math.round(duration)
      }
    });

  } catch (error) {
    logError(error, { endpoint: 'GET /api/prospects', ip: req.ip });
    res.status(500).json({
      success: false,
      error: 'Помилка завантаження потенційних клієнтів'
    });
  }
});

// POST /api/prospects - Create new prospect
r.post('/', async (req, res) => {
  const start = performance.now();
  try {
    const {
      company,
      negotiator,
      email,
      phone,
      sector,
      company_size,
      negotiation_type,
      deal_value,
      timeline,
      goal,
      decision_criteria,
      constraints,
      competitors,
      notes
    } = req.body;

    if (!company || !company.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Назва компанії обов\'язкова'
      });
    }

    // Create prospect with status metadata
    const notesData = {
      status: 'active',
      risk_level: 'unknown',
      email,
      phone,
      custom_notes: notes || '',
      created_by: req.user?.username || 'operator'
    };

    const prospect = await run(`
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
        competitors,
        client_type,
        is_active,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'prospect', true, $12)
      RETURNING *
    `, [
      company.trim(),
      negotiator?.trim() || null,
      sector?.trim() || null,
      company_size || null,
      negotiation_type || 'sales',
      deal_value?.trim() || null,
      timeline?.trim() || null,
      goal?.trim() || null,
      decision_criteria?.trim() || null,
      constraints?.trim() || null,
      competitors?.trim() || null,
      JSON.stringify(notesData)
    ]);

    const duration = performance.now() - start;

    logSecurity('Prospect created', {
      prospectId: prospect.id,
      company: prospect.company,
      ip: req.ip,
      user: req.user?.username
    });

    res.status(201).json({
      success: true,
      prospect,
      meta: {
        responseTime: Math.round(duration)
      }
    });

  } catch (error) {
    logError(error, { endpoint: 'POST /api/prospects', ip: req.ip });
    res.status(500).json({
      success: false,
      error: 'Помилка створення потенційного клієнта'
    });
  }
});

// GET /api/prospects/:id - Get prospect details with all analyses
r.get('/:id', async (req, res) => {
  const start = performance.now();
  try {
    const id = parseInt(req.params.id);

    const prospect = await get(`
      SELECT * FROM clients
      WHERE id = $1 AND client_type = 'prospect'
    `, [id]);

    if (!prospect) {
      return res.status(404).json({
        success: false,
        error: 'Потенційного клієнта не знайдено'
      });
    }

    // Get all analyses for this prospect
    const analyses = await all(`
      SELECT
        id,
        title,
        source,
        created_at,
        barometer,
        summary,
        highlights,
        personas
      FROM analyses
      WHERE client_id = $1
      ORDER BY created_at DESC
    `, [id]);

    const duration = performance.now() - start;

    res.json({
      success: true,
      prospect,
      analyses,
      meta: {
        analysisCount: analyses.length,
        responseTime: Math.round(duration)
      }
    });

  } catch (error) {
    logError(error, { endpoint: 'GET /api/prospects/:id', ip: req.ip });
    res.status(500).json({
      success: false,
      error: 'Помилка завантаження деталей'
    });
  }
});

// PUT /api/prospects/:id - Update prospect
r.put('/:id', async (req, res) => {
  const start = performance.now();
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;

    // Check if prospect exists
    const existing = await get(`
      SELECT id FROM clients
      WHERE id = $1 AND client_type = 'prospect'
    `, [id]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Потенційного клієнта не знайдено'
      });
    }

    // Build update query dynamically
    const allowedFields = [
      'company', 'negotiator', 'sector', 'company_size',
      'negotiation_type', 'deal_value', 'timeline', 'goal',
      'decision_criteria', 'constraints', 'competitors', 'notes'
    ];

    const setFields = [];
    const params = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        setFields.push(`${key} = $${paramIndex}`);
        params.push(key === 'notes' ? JSON.stringify(updates[key]) : updates[key]);
        paramIndex++;
      }
    });

    if (setFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Немає даних для оновлення'
      });
    }

    setFields.push(`updated_at = NOW()`);
    params.push(id);

    const prospect = await run(`
      UPDATE clients
      SET ${setFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    const duration = performance.now() - start;

    res.json({
      success: true,
      prospect,
      meta: {
        responseTime: Math.round(duration)
      }
    });

  } catch (error) {
    logError(error, { endpoint: 'PUT /api/prospects/:id', ip: req.ip });
    res.status(500).json({
      success: false,
      error: 'Помилка оновлення потенційного клієнта'
    });
  }
});

// POST /api/prospects/:id/convert - Convert prospect to active client
r.post('/:id/convert', async (req, res) => {
  const start = performance.now();
  try {
    const id = parseInt(req.params.id);
    const { type = 'teamhub', team_size, additional_data } = req.body;

    // Verify prospect exists
    const prospect = await get(`
      SELECT * FROM clients
      WHERE id = $1 AND client_type = 'prospect'
    `, [id]);

    if (!prospect) {
      return res.status(404).json({
        success: false,
        error: 'Потенційного клієнта не знайдено'
      });
    }

    // Update to active client
    const client = await run(`
      UPDATE clients
      SET
        client_type = 'active',
        notes = jsonb_set(
          COALESCE(notes::jsonb, '{}'::jsonb),
          '{converted_from_prospect}',
          'true'::jsonb
        ),
        notes = jsonb_set(
          COALESCE(notes::jsonb, '{}'::jsonb),
          '{converted_at}',
          to_jsonb(NOW()::text)
        ),
        notes = jsonb_set(
          COALESCE(notes::jsonb, '{}'::jsonb),
          '{active_type}',
          to_jsonb($2::text)
        ),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, type]);

    // If TeamHub type, optionally create team
    if (type === 'teamhub' && team_size) {
      await run(`
        INSERT INTO teams (client_id, title, description, metadata)
        VALUES ($1, $2, $3, $4)
      `, [
        id,
        `Команда ${prospect.company}`,
        'Конвертовано з потенційного клієнта',
        JSON.stringify({ team_size, additional_data })
      ]);
    }

    const duration = performance.now() - start;

    logSecurity('Prospect converted to active client', {
      prospectId: id,
      company: prospect.company,
      type,
      ip: req.ip,
      user: req.user?.username
    });

    res.json({
      success: true,
      client,
      message: 'Клієнта успішно конвертовано',
      meta: {
        responseTime: Math.round(duration)
      }
    });

  } catch (error) {
    logError(error, { endpoint: 'POST /api/prospects/:id/convert', ip: req.ip });
    res.status(500).json({
      success: false,
      error: 'Помилка конвертації клієнта'
    });
  }
});

// DELETE /api/prospects/:id - Delete prospect
r.delete('/:id', async (req, res) => {
  const start = performance.now();
  try {
    const id = parseInt(req.params.id);

    const prospect = await get(`
      SELECT id, company FROM clients
      WHERE id = $1 AND client_type = 'prospect'
    `, [id]);

    if (!prospect) {
      return res.status(404).json({
        success: false,
        error: 'Потенційного клієнта не знайдено'
      });
    }

    await run('DELETE FROM clients WHERE id = $1', [id]);

    const duration = performance.now() - start;

    logSecurity('Prospect deleted', {
      prospectId: id,
      company: prospect.company,
      ip: req.ip,
      user: req.user?.username
    });

    res.json({
      success: true,
      message: 'Потенційного клієнта видалено',
      meta: {
        responseTime: Math.round(duration)
      }
    });

  } catch (error) {
    logError(error, { endpoint: 'DELETE /api/prospects/:id', ip: req.ip });
    res.status(500).json({
      success: false,
      error: 'Помилка видалення'
    });
  }
});

// POST /api/prospects/:id/notes - Add note to prospect
r.post('/:id/notes', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { note, type = 'general' } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Текст замітки обов\'язковий'
      });
    }

    const prospect = await run(`
      UPDATE clients
      SET
        notes = jsonb_set(
          COALESCE(notes::jsonb, '{}'::jsonb),
          '{notes}',
          COALESCE(notes::jsonb->'notes', '[]'::jsonb) ||
          jsonb_build_array(jsonb_build_object(
            'text', $2,
            'type', $3,
            'created_at', NOW()::text,
            'created_by', $4
          ))
        ),
        updated_at = NOW()
      WHERE id = $1 AND client_type = 'prospect'
      RETURNING *
    `, [id, note.trim(), type, req.user?.username || 'operator']);

    if (!prospect) {
      return res.status(404).json({
        success: false,
        error: 'Потенційного клієнта не знайдено'
      });
    }

    res.json({
      success: true,
      prospect
    });

  } catch (error) {
    logError(error, { endpoint: 'POST /api/prospects/:id/notes', ip: req.ip });
    res.status(500).json({
      success: false,
      error: 'Помилка додавання замітки'
    });
  }
});

// GET /api/prospects/:id/timeline - Get prospect timeline
r.get('/:id/timeline', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const prospect = await get(`SELECT notes FROM clients WHERE id = $1 AND client_type = 'prospect'`, [id]);
    if (!prospect) return res.status(404).json({ success: false, error: 'Prospect not found' });

    const notes = typeof prospect.notes === 'string' ? JSON.parse(prospect.notes || '{}') : (prospect.notes || {});
    res.json({ success: true, events: notes.timeline || [] });
  } catch (error) {
    logError(error, { endpoint: 'GET /api/prospects/:id/timeline', ip: req.ip });
    res.status(500).json({ success: false, error: 'Failed to load timeline' });
  }
});

// POST /api/prospects/:id/timeline - Add timeline event
r.post('/:id/timeline', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { event_type, data, timestamp } = req.body;

    const prospect = await run(`
      UPDATE clients SET
        notes = jsonb_set(COALESCE(notes::jsonb, '{}'::jsonb), '{timeline}',
          COALESCE(notes::jsonb->'timeline', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
            'id', (SELECT COALESCE(MAX((elem->>'id')::int), 0) + 1 FROM jsonb_array_elements(COALESCE(notes::jsonb->'timeline', '[]'::jsonb)) elem),
            'event_type', $2, 'data', $3::jsonb, 'created_at', $4, 'user', $5))),
        updated_at = NOW()
      WHERE id = $1 AND client_type = 'prospect' RETURNING *
    `, [id, event_type, JSON.stringify(data), timestamp || new Date().toISOString(), req.user?.username || 'operator']);

    res.json({ success: true, prospect });
  } catch (error) {
    logError(error, { endpoint: 'POST /api/prospects/:id/timeline', ip: req.ip });
    res.status(500).json({ success: false, error: 'Failed to add timeline event' });
  }
});

// GET /api/prospects/:id/custom-fields - Get custom field values
r.get('/:id/custom-fields', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const prospect = await get(`SELECT notes FROM clients WHERE id = $1 AND client_type = 'prospect'`, [id]);
    if (!prospect) return res.status(404).json({ success: false, error: 'Prospect not found' });

    const notes = typeof prospect.notes === 'string' ? JSON.parse(prospect.notes || '{}') : (prospect.notes || {});
    res.json({ success: true, values: notes.custom_fields || {} });
  } catch (error) {
    logError(error, { endpoint: 'GET /api/prospects/:id/custom-fields', ip: req.ip });
    res.status(500).json({ success: false, error: 'Failed to load custom fields' });
  }
});

// PUT /api/prospects/:id/custom-fields - Update custom field values
r.put('/:id/custom-fields', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { values } = req.body;

    const prospect = await run(`
      UPDATE clients SET
        notes = jsonb_set(COALESCE(notes::jsonb, '{}'::jsonb), '{custom_fields}', $2::jsonb),
        updated_at = NOW()
      WHERE id = $1 AND client_type = 'prospect' RETURNING *
    `, [id, JSON.stringify(values)]);

    res.json({ success: true, prospect });
  } catch (error) {
    logError(error, { endpoint: 'PUT /api/prospects/:id/custom-fields', ip: req.ip });
    res.status(500).json({ success: false, error: 'Failed to update custom fields' });
  }
});

export default r;
