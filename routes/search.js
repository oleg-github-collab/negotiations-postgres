// routes/search.js - Universal Search Across All Entities
import { Router } from 'express';
import { performance } from 'perf_hooks';
import { all } from '../utils/db.js';
import { logError } from '../utils/logger.js';

const r = Router();

// GET /api/search - Universal search across prospects, clients, teams, analyses
r.get('/', async (req, res) => {
  const start = performance.now();
  try {
    const { q, types = 'all', limit = 50 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Пошуковий запит має містити мінімум 2 символи'
      });
    }

    const searchTerm = `%${q.trim()}%`;
    const results = {
      prospects: [],
      clients: [],
      teams: [],
      analyses: []
    };

    const typesArray = types === 'all'
      ? ['prospects', 'clients', 'teams', 'analyses']
      : types.split(',');

    // Search prospects
    if (typesArray.includes('prospects')) {
      results.prospects = await all(`
        SELECT
          id,
          company,
          negotiator,
          sector,
          created_at,
          'prospect' as type
        FROM clients
        WHERE client_type = 'prospect'
          AND (
            company ILIKE $1 OR
            negotiator ILIKE $1 OR
            sector ILIKE $1 OR
            goal ILIKE $1
          )
        ORDER BY created_at DESC
        LIMIT $2
      `, [searchTerm, parseInt(limit)]);
    }

    // Search active clients
    if (typesArray.includes('clients')) {
      results.clients = await all(`
        SELECT
          id,
          company,
          negotiator,
          sector,
          created_at,
          'client' as type
        FROM clients
        WHERE client_type = 'active'
          AND (
            company ILIKE $1 OR
            negotiator ILIKE $1 OR
            sector ILIKE $1
          )
        ORDER BY created_at DESC
        LIMIT $2
      `, [searchTerm, parseInt(limit)]);
    }

    // Search teams
    if (typesArray.includes('teams')) {
      results.teams = await all(`
        SELECT
          t.id,
          t.title,
          t.description,
          c.company as client_name,
          t.created_at,
          'team' as type
        FROM teams t
        JOIN clients c ON t.client_id = c.id
        WHERE
          t.title ILIKE $1 OR
          t.description ILIKE $1 OR
          c.company ILIKE $1
        ORDER BY t.created_at DESC
        LIMIT $2
      `, [searchTerm, parseInt(limit)]);
    }

    // Search analyses
    if (typesArray.includes('analyses')) {
      results.analyses = await all(`
        SELECT
          a.id,
          a.title,
          a.source,
          c.company as client_name,
          a.created_at,
          'analysis' as type
        FROM analyses a
        JOIN clients c ON a.client_id = c.id
        WHERE
          a.title ILIKE $1 OR
          a.source ILIKE $1 OR
          a.original_text ILIKE $1 OR
          c.company ILIKE $1
        ORDER BY a.created_at DESC
        LIMIT $2
      `, [searchTerm, parseInt(limit)]);
    }

    const totalResults =
      results.prospects.length +
      results.clients.length +
      results.teams.length +
      results.analyses.length;

    const duration = performance.now() - start;

    res.json({
      success: true,
      query: q,
      results,
      meta: {
        total: totalResults,
        byType: {
          prospects: results.prospects.length,
          clients: results.clients.length,
          teams: results.teams.length,
          analyses: results.analyses.length
        },
        responseTime: Math.round(duration)
      }
    });

  } catch (error) {
    logError(error, { endpoint: 'GET /api/search', ip: req.ip });
    res.status(500).json({
      success: false,
      error: 'Помилка пошуку'
    });
  }
});

// GET /api/search/suggestions - Get search suggestions/autocomplete
r.get('/suggestions', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        suggestions: []
      });
    }

    const searchTerm = `${q.trim()}%`;

    // Get company names
    const companies = await all(`
      SELECT DISTINCT company as value, 'company' as type
      FROM clients
      WHERE company ILIKE $1
      LIMIT $2
    `, [searchTerm, parseInt(limit)]);

    // Get negotiator names
    const negotiators = await all(`
      SELECT DISTINCT negotiator as value, 'negotiator' as type
      FROM clients
      WHERE negotiator ILIKE $1 AND negotiator IS NOT NULL
      LIMIT $2
    `, [searchTerm, parseInt(limit)]);

    // Get sectors
    const sectors = await all(`
      SELECT DISTINCT sector as value, 'sector' as type
      FROM clients
      WHERE sector ILIKE $1 AND sector IS NOT NULL
      LIMIT $2
    `, [searchTerm, parseInt(limit)]);

    const suggestions = [
      ...companies,
      ...negotiators,
      ...sectors
    ].slice(0, parseInt(limit));

    res.json({
      success: true,
      suggestions
    });

  } catch (error) {
    logError(error, { endpoint: 'GET /api/search/suggestions', ip: req.ip });
    res.status(500).json({
      success: false,
      error: 'Помилка отримання підказок'
    });
  }
});

export default r;
