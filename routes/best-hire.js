// routes/best-hire.js - Best Hire Module: Recruitment, Resume Management & Hiring Analytics
import { Router } from 'express';
import { performance } from 'perf_hooks';
import { transaction, get, all, run } from '../utils/db.js';
import { client as openaiClient, estimateTokens } from '../utils/openAIClient.js';
import { addTokensAndCheck } from '../utils/tokenUsage.js';
import { validateClientId } from '../middleware/validators.js';
import { logError, logAIUsage, logPerformance } from '../utils/logger.js';
import { recordAuditEvent } from '../utils/audit.js';

const r = Router();
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

const normalizeArrayField = (value, fallback = []) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const normalizeObjectField = (value, fallback = {}) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const ensureOpenAI = (res) => {
  if (!openaiClient) {
    res.status(503).json({
      success: false,
      error: 'AI сервіс тимчасово недоступний',
      code: 'AI_SERVICE_UNAVAILABLE'
    });
    return false;
  }
  return true;
};

// ==================== POSITIONS MANAGEMENT ====================

// Get all positions for a client
r.get('/positions/client/:id', validateClientId, async (req, res) => {
  const start = performance.now();
  try {
    const clientId = Number(req.params.id);
    const { status, priority } = req.query;

    let whereClause = 'p.client_id = $1';
    let params = [clientId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (priority) {
      whereClause += ` AND p.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    const positions = await all(
      `
      SELECT
        p.*,
        COUNT(r.id) as total_resumes,
        COUNT(CASE WHEN r.stage = 'hired' THEN 1 END) as hired_count
      FROM positions p
      LEFT JOIN resumes r ON r.position_id = p.id
      WHERE ${whereClause}
      GROUP BY p.id
      ORDER BY p.created_at DESC
      `,
      params
    );

    const duration = performance.now() - start;

    res.json({
      success: true,
      positions,
      meta: {
        count: positions.length,
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    logError(error, { endpoint: 'GET /api/best-hire/positions/client/:id', ip: req.ip });
    res.status(500).json({ success: false, error: 'Не вдалося отримати позиції' });
  }
});

// Create new position
r.post('/positions', async (req, res) => {
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

    const requiredSkills = normalizeArrayField(payload.required_skills);
    const preferredSkills = normalizeArrayField(payload.preferred_skills);
    const responsibilities = normalizeArrayField(payload.responsibilities);
    const requirements = normalizeArrayField(payload.requirements);
    const benefits = normalizeArrayField(payload.benefits);
    const metadata = normalizeObjectField(payload.metadata);

    const position = await run(
      `INSERT INTO positions (
        client_id, title, department, seniority_level, employment_type,
        location, is_remote, salary_min, salary_max, salary_currency,
        status, priority, required_skills, preferred_skills,
        responsibilities, requirements, benefits, description,
        headcount, deadline, hiring_manager, recruiter_assigned, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING *`,
      [
        clientId,
        payload.title || 'Нова позиція',
        payload.department,
        payload.seniority_level,
        payload.employment_type || 'full-time',
        payload.location,
        payload.is_remote || false,
        payload.salary_min,
        payload.salary_max,
        payload.salary_currency || 'UAH',
        payload.status || 'open',
        payload.priority || 'medium',
        JSON.stringify(requiredSkills),
        JSON.stringify(preferredSkills),
        JSON.stringify(responsibilities),
        JSON.stringify(requirements),
        JSON.stringify(benefits),
        payload.description,
        payload.headcount || 1,
        payload.deadline,
        payload.hiring_manager,
        payload.recruiter_assigned,
        JSON.stringify(metadata)
      ]
    );

    const duration = performance.now() - start;

    await recordAuditEvent({
      requestId: req.context?.requestId,
      eventType: 'position.created',
      actor: req.user?.username,
      entityType: 'position',
      entityId: String(position.rows[0].id),
      metadata: { clientId, title: position.rows[0].title }
    });

    res.status(201).json({
      success: true,
      position: position.rows[0],
      meta: { responseTime: Math.round(duration) }
    });
  } catch (error) {
    logError(error, { endpoint: 'POST /api/best-hire/positions', ip: req.ip });
    res.status(500).json({ success: false, error: 'Не вдалося створити позицію' });
  }
});

// Update position
r.put('/positions/:id', async (req, res) => {
  const start = performance.now();
  try {
    const positionId = Number(req.params.id);
    const payload = req.body || {};

    const updated = await run(
      `UPDATE positions SET
        title = COALESCE($1, title),
        department = COALESCE($2, department),
        seniority_level = COALESCE($3, seniority_level),
        employment_type = COALESCE($4, employment_type),
        location = COALESCE($5, location),
        is_remote = COALESCE($6, is_remote),
        salary_min = COALESCE($7, salary_min),
        salary_max = COALESCE($8, salary_max),
        status = COALESCE($9, status),
        priority = COALESCE($10, priority),
        required_skills = COALESCE($11, required_skills),
        responsibilities = COALESCE($12, responsibilities),
        description = COALESCE($13, description),
        deadline = COALESCE($14, deadline),
        hiring_manager = COALESCE($15, hiring_manager),
        updated_at = NOW()
      WHERE id = $16 RETURNING *`,
      [
        payload.title,
        payload.department,
        payload.seniority_level,
        payload.employment_type,
        payload.location,
        payload.is_remote,
        payload.salary_min,
        payload.salary_max,
        payload.status,
        payload.priority,
        payload.required_skills,
        payload.responsibilities,
        payload.description,
        payload.deadline,
        payload.hiring_manager,
        positionId
      ]
    );

    if (!updated.rowCount) {
      return res.status(404).json({ success: false, error: 'Позицію не знайдено' });
    }

    const duration = performance.now() - start;

    res.json({
      success: true,
      position: updated.rows[0],
      meta: { responseTime: Math.round(duration) }
    });
  } catch (error) {
    logError(error, { endpoint: 'PUT /api/best-hire/positions/:id', ip: req.ip });
    res.status(500).json({ success: false, error: 'Не вдалося оновити позицію' });
  }
});

// ==================== RESUMES MANAGEMENT ====================

// Get resumes for a position
r.get('/resumes/position/:positionId', async (req, res) => {
  const start = performance.now();
  try {
    const positionId = Number(req.params.positionId);
    const { stage } = req.query;

    let whereClause = 'position_id = $1';
    let params = [positionId];

    if (stage) {
      whereClause += ' AND stage = $2';
      params.push(stage);
    }

    const resumes = await all(
      `SELECT * FROM resumes WHERE ${whereClause} ORDER BY ai_match_score DESC NULLS LAST, created_at DESC`,
      params
    );

    const duration = performance.now() - start;

    res.json({
      success: true,
      resumes,
      meta: {
        count: resumes.length,
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    logError(error, { endpoint: 'GET /api/best-hire/resumes/position/:positionId', ip: req.ip });
    res.status(500).json({ success: false, error: 'Не вдалося отримати резюме' });
  }
});

// Create resume/candidate
r.post('/resumes', async (req, res) => {
  const start = performance.now();
  try {
    const payload = req.body || {};
    const positionId = Number(payload.position_id);
    const clientId = Number(payload.client_id);

    if (!positionId || !clientId) {
      return res.status(400).json({
        success: false,
        error: 'Position ID і Client ID обов\'язкові'
      });
    }

    const skills = normalizeArrayField(payload.skills);
    const education = normalizeArrayField(payload.education);
    const workHistory = normalizeArrayField(payload.work_history);
    const certifications = normalizeArrayField(payload.certifications);
    const languages = normalizeArrayField(payload.languages);
    const metadata = normalizeObjectField(payload.metadata);

    const resume = await run(
      `INSERT INTO resumes (
        position_id, client_id, candidate_name, email, phone, linkedin_url,
        current_position, current_company, location, willing_to_relocate,
        expected_salary_min, expected_salary_max, salary_currency,
        notice_period_days, years_of_experience, skills, education,
        work_history, certifications, languages, resume_text, resume_file_url,
        source_channel, stage, rating, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26) RETURNING *`,
      [
        positionId,
        clientId,
        payload.candidate_name || 'Кандидат',
        payload.email,
        payload.phone,
        payload.linkedin_url,
        payload.current_position,
        payload.current_company,
        payload.location,
        payload.willing_to_relocate || false,
        payload.expected_salary_min,
        payload.expected_salary_max,
        payload.salary_currency || 'UAH',
        payload.notice_period_days,
        payload.years_of_experience,
        JSON.stringify(skills),
        JSON.stringify(education),
        JSON.stringify(workHistory),
        JSON.stringify(certifications),
        JSON.stringify(languages),
        payload.resume_text,
        payload.resume_file_url,
        payload.source_channel,
        payload.stage || 'new',
        payload.rating || 0,
        JSON.stringify(metadata)
      ]
    );

    const duration = performance.now() - start;

    await recordAuditEvent({
      requestId: req.context?.requestId,
      eventType: 'resume.created',
      actor: req.user?.username,
      entityType: 'resume',
      entityId: String(resume.rows[0].id),
      metadata: { positionId, candidateName: resume.rows[0].candidate_name }
    });

    res.status(201).json({
      success: true,
      resume: resume.rows[0],
      meta: { responseTime: Math.round(duration) }
    });
  } catch (error) {
    logError(error, { endpoint: 'POST /api/best-hire/resumes', ip: req.ip });
    res.status(500).json({ success: false, error: 'Не вдалося створити резюме' });
  }
});

// AI Resume Analysis & Matching
r.post('/resumes/:id/analyze', async (req, res) => {
  if (!ensureOpenAI(res)) return;

  const start = performance.now();
  try {
    const resumeId = Number(req.params.id);

    const resume = await get('SELECT * FROM resumes WHERE id = $1', [resumeId]);
    if (!resume) {
      return res.status(404).json({ success: false, error: 'Резюме не знайдено' });
    }

    const position = await get('SELECT * FROM positions WHERE id = $1', [resume.position_id]);
    if (!position) {
      return res.status(404).json({ success: false, error: 'Позицію не знайдено' });
    }

    const systemPrompt = `
Ти — Chief Talent Intelligence Officer для Kaminskyi AI.
Твоя задача: проаналізувати резюме кандидата і визначити відповідність до вакансії.

Поверни СТРОГО JSON:
{
  "match_score": 0-100,
  "summary": "Короткий висновок про кандидата (2-3 речення)",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "skill_match": {
    "matched_skills": ["..."],
    "missing_skills": ["..."],
    "extra_skills": ["..."],
    "skill_coverage_percent": 0-100
  },
  "experience_analysis": {
    "relevance": "high|medium|low",
    "years_relevant": число,
    "industries": ["..."],
    "company_quality": "tier1|tier2|tier3|startup|unknown"
  },
  "salary_analysis": {
    "expectation_vs_offer": "below|aligned|above",
    "expected_range": "min-max",
    "market_position": "below_market|market|above_market",
    "negotiation_flexibility": "high|medium|low"
  },
  "cultural_fit": {
    "score": 0-100,
    "indicators": ["..."],
    "concerns": ["..."]
  },
  "red_flags": ["..."],
  "green_flags": ["..."],
  "interview_questions": ["..."],
  "recommendation": "strong_yes|yes|maybe|no|strong_no",
  "next_steps": ["..."]
}`.trim();

    const payload = {
      resume: {
        candidate_name: resume.candidate_name,
        skills: resume.skills,
        years_of_experience: resume.years_of_experience,
        education: resume.education,
        work_history: resume.work_history,
        current_position: resume.current_position,
        current_company: resume.current_company,
        expected_salary: `${resume.expected_salary_min}-${resume.expected_salary_max} ${resume.salary_currency}`,
        resume_text: resume.resume_text || ''
      },
      position: {
        title: position.title,
        required_skills: position.required_skills,
        preferred_skills: position.preferred_skills,
        seniority_level: position.seniority_level,
        responsibilities: position.responsibilities,
        requirements: position.requirements,
        salary_range: `${position.salary_min}-${position.salary_max} ${position.salary_currency}`
      }
    };

    const tokensIn = estimateTokens(systemPrompt) + estimateTokens(JSON.stringify(payload)) + 200;
    await addTokensAndCheck(tokensIn);

    const response = await openaiClient.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(payload) }
      ],
      max_tokens: 2500
    });

    const content = response.choices?.[0]?.message?.content || '{}';
    const tokensOut = estimateTokens(content);
    await addTokensAndCheck(tokensOut);

    logAIUsage(tokensIn + tokensOut, MODEL, 'resume_analysis');

    let parsed;
    try {
      parsed = JSON.parse(content.replace(/```json/gi, '').replace(/```/g, '').trim());
    } catch (parseError) {
      throw new Error('Не вдалося розпарсити відповідь AI');
    }

    // Update resume with AI analysis
    await run(
      `UPDATE resumes SET
        ai_match_score = $1,
        ai_analysis = $2,
        updated_at = NOW()
      WHERE id = $3`,
      [parsed.match_score || 0, parsed, resumeId]
    );

    const duration = performance.now() - start;
    logPerformance('Resume Analysis', duration, { resumeId, tokensIn, tokensOut });

    res.json({
      success: true,
      analysis: parsed,
      meta: {
        tokensUsed: tokensIn + tokensOut,
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    logError(error, { endpoint: 'POST /api/best-hire/resumes/:id/analyze', ip: req.ip });
    res.status(500).json({ success: false, error: 'Не вдалося проаналізувати резюме' });
  }
});

// Update resume stage/status
r.patch('/resumes/:id/stage', async (req, res) => {
  const start = performance.now();
  try {
    const resumeId = Number(req.params.id);
    const { stage, rating, notes, rejection_reason } = req.body;

    const updated = await run(
      `UPDATE resumes SET
        stage = COALESCE($1, stage),
        rating = COALESCE($2, rating),
        rejection_reason = COALESCE($3, rejection_reason),
        updated_at = NOW()
      WHERE id = $4 RETURNING *`,
      [stage, rating, rejection_reason, resumeId]
    );

    if (!updated.rowCount) {
      return res.status(404).json({ success: false, error: 'Резюме не знайдено' });
    }

    // Add interviewer note if provided
    if (notes) {
      const currentNotes = Array.isArray(updated.rows[0].interviewer_notes)
        ? updated.rows[0].interviewer_notes
        : [];
      const newNotes = [...currentNotes, { note: notes, timestamp: new Date().toISOString(), author: req.user?.username || 'system' }];
      await run(
        `UPDATE resumes SET interviewer_notes = $1 WHERE id = $2`,
        [JSON.stringify(newNotes), resumeId]
      );
      updated.rows[0].interviewer_notes = newNotes;
    }

    const duration = performance.now() - start;

    res.json({
      success: true,
      resume: updated.rows[0],
      meta: { responseTime: Math.round(duration) }
    });
  } catch (error) {
    logError(error, { endpoint: 'PATCH /api/best-hire/resumes/:id/stage', ip: req.ip });
    res.status(500).json({ success: false, error: 'Не вдалося оновити стадію резюме' });
  }
});

// ==================== ANALYTICS & INSIGHTS ====================

// Get hiring analytics for client
r.get('/analytics/client/:id', validateClientId, async (req, res) => {
  const start = performance.now();
  try {
    const clientId = Number(req.params.id);

    const analytics = await transaction(async (db) => {
      // Position stats
      const positionStats = await db.get(`
        SELECT
          COUNT(*) as total_positions,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_positions,
          COUNT(CASE WHEN status = 'filled' THEN 1 END) as filled_positions,
          SUM(headcount) as total_headcount,
          SUM(filled_count) as total_filled
        FROM positions
        WHERE client_id = $1
      `, [clientId]);

      // Resume stats by stage
      const resumeStats = await db.all(`
        SELECT
          stage,
          COUNT(*) as count,
          AVG(ai_match_score) as avg_match_score,
          AVG(rating) as avg_rating
        FROM resumes
        WHERE client_id = $1
        GROUP BY stage
      `, [clientId]);

      // Channel performance
      const channelStats = await db.all(`
        SELECT
          rc.*,
          ROUND((rc.candidates_hired::NUMERIC / NULLIF(rc.candidates_sourced, 0) * 100), 2) as conversion_percent
        FROM recruiting_channels rc
        WHERE rc.client_id = $1 AND rc.is_active = true
        ORDER BY rc.candidates_hired DESC
      `, [clientId]);

      // Bottlenecks
      const bottlenecks = await db.all(`
        SELECT
          bottleneck_type,
          severity,
          COUNT(*) as count,
          SUM(days_delayed) as total_days_delayed,
          SUM(cost_impact) as total_cost_impact
        FROM hiring_bottlenecks
        WHERE client_id = $1 AND status = 'open'
        GROUP BY bottleneck_type, severity
        ORDER BY total_cost_impact DESC
      `, [clientId]);

      // Budget overview
      const budgetStats = await db.get(`
        SELECT
          SUM(total_budget) as total_budget,
          SUM(spent_amount) as total_spent,
          SUM(available_amount) as total_available,
          SUM(headcount_budget) as total_headcount_budget,
          SUM(headcount_filled) as total_headcount_filled
        FROM hiring_budgets
        WHERE client_id = $1
      `, [clientId]);

      return {
        positions: positionStats,
        resumes_by_stage: resumeStats,
        channels: channelStats,
        bottlenecks,
        budget: budgetStats
      };
    });

    const duration = performance.now() - start;

    res.json({
      success: true,
      analytics,
      meta: { responseTime: Math.round(duration) }
    });
  } catch (error) {
    logError(error, { endpoint: 'GET /api/best-hire/analytics/client/:id', ip: req.ip });
    res.status(500).json({ success: false, error: 'Не вдалося отримати аналітику' });
  }
});

// Get market salary data
r.get('/market-salaries', async (req, res) => {
  const start = performance.now();
  try {
    const { position_title, seniority_level, location } = req.query;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (position_title) {
      whereConditions.push(`position_title ILIKE $${paramIndex}`);
      params.push(`%${position_title}%`);
      paramIndex++;
    }

    if (seniority_level) {
      whereConditions.push(`seniority_level = $${paramIndex}`);
      params.push(seniority_level);
      paramIndex++;
    }

    if (location) {
      whereConditions.push(`location ILIKE $${paramIndex}`);
      params.push(`%${location}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const salaries = await all(
      `SELECT * FROM market_salaries ${whereClause} ORDER BY year DESC, quarter DESC LIMIT 50`,
      params
    );

    const duration = performance.now() - start;

    res.json({
      success: true,
      salaries,
      meta: {
        count: salaries.length,
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    logError(error, { endpoint: 'GET /api/best-hire/market-salaries', ip: req.ip });
    res.status(500).json({ success: false, error: 'Не вдалося отримати ринкові зарплати' });
  }
});

// Create/Update recruiting channel
r.post('/channels', async (req, res) => {
  const start = performance.now();
  try {
    const payload = req.body || {};
    const clientId = Number(payload.client_id);

    const channel = await run(
      `INSERT INTO recruiting_channels (
        client_id, channel_name, channel_type, cost_per_month, cost_currency,
        candidates_sourced, candidates_screened, candidates_interviewed,
        candidates_hired, avg_time_to_hire_days, avg_quality_score,
        is_active, notes, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        clientId,
        payload.channel_name || 'New Channel',
        payload.channel_type,
        payload.cost_per_month || 0,
        payload.cost_currency || 'UAH',
        payload.candidates_sourced || 0,
        payload.candidates_screened || 0,
        payload.candidates_interviewed || 0,
        payload.candidates_hired || 0,
        payload.avg_time_to_hire_days,
        payload.avg_quality_score,
        payload.is_active !== false,
        payload.notes,
        payload.metadata || {}
      ]
    );

    const duration = performance.now() - start;

    res.status(201).json({
      success: true,
      channel: channel.rows[0],
      meta: { responseTime: Math.round(duration) }
    });
  } catch (error) {
    logError(error, { endpoint: 'POST /api/best-hire/channels', ip: req.ip });
    res.status(500).json({ success: false, error: 'Не вдалося створити канал' });
  }
});

// Create bottleneck
r.post('/bottlenecks', async (req, res) => {
  const start = performance.now();
  try {
    const payload = req.body || {};
    const clientId = Number(payload.client_id);

    const bottleneck = await run(
      `INSERT INTO hiring_bottlenecks (
        client_id, position_id, bottleneck_type, severity, stage,
        description, impact_description, affected_positions_count,
        days_delayed, cost_impact, cost_currency, identified_by,
        status, resolution_plan, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [
        clientId,
        payload.position_id,
        payload.bottleneck_type || 'unknown',
        payload.severity || 'medium',
        payload.stage,
        payload.description || '',
        payload.impact_description,
        payload.affected_positions_count || 1,
        payload.days_delayed || 0,
        payload.cost_impact || 0,
        payload.cost_currency || 'UAH',
        payload.identified_by || req.user?.username,
        payload.status || 'open',
        payload.resolution_plan,
        payload.metadata || {}
      ]
    );

    const duration = performance.now() - start;

    res.status(201).json({
      success: true,
      bottleneck: bottleneck.rows[0],
      meta: { responseTime: Math.round(duration) }
    });
  } catch (error) {
    logError(error, { endpoint: 'POST /api/best-hire/bottlenecks', ip: req.ip });
    res.status(500).json({ success: false, error: 'Не вдалося створити боттлнек' });
  }
});

// Resolve bottleneck
r.patch('/bottlenecks/:id/resolve', async (req, res) => {
  const start = performance.now();
  try {
    const bottleneckId = Number(req.params.id);
    const { resolution_notes } = req.body;

    const updated = await run(
      `UPDATE hiring_bottlenecks SET
        status = 'resolved',
        resolved_at = NOW(),
        resolution_notes = $1,
        updated_at = NOW()
      WHERE id = $2 RETURNING *`,
      [resolution_notes, bottleneckId]
    );

    if (!updated.rowCount) {
      return res.status(404).json({ success: false, error: 'Боттлнек не знайдено' });
    }

    const duration = performance.now() - start;

    res.json({
      success: true,
      bottleneck: updated.rows[0],
      meta: { responseTime: Math.round(duration) }
    });
  } catch (error) {
    logError(error, { endpoint: 'PATCH /api/best-hire/bottlenecks/:id/resolve', ip: req.ip });
    res.status(500).json({ success: false, error: 'Не вдалося вирішити боттлнек' });
  }
});

export default r;
