// routes/clients.js - Production client management with PostgreSQL
import { Router } from 'express';
import { run, get } from '../utils/db.js';
import { validateClient, validateClientId, validateAnalysisId } from '../middleware/validators.js';
import { logError, logSecurity } from '../utils/logger.js';
import { performance } from 'perf_hooks';
import {
  fetchClientsWithStats,
  fetchClientWithHistory,
  createClientRecord,
  updateClientRecord,
  deleteClientRecord,
  getClientWorkflowGuide
} from '../services/clientsService.js';

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
    const clients = await fetchClientsWithStats();
    const duration = performance.now() - startTime;

    res.set('X-Response-Time', `${Math.round(duration)}ms`);
    res.json({
      success: true,
      clients,
      meta: {
        count: clients.length,
        responseTime: Math.round(duration)
      }
    });
  } catch (error) {
    logError(error, { endpoint: 'GET /api/clients', ip: req.ip });
    res.status(500).json({ success: false, error: 'Database error occurred' });
  }
});

// GET /api/clients/workflow - guidance for client creation and platform modules
r.get('/workflow', (_req, res) => {
  const guide = getClientWorkflowGuide();
  res.json({ success: true, guide });
});

// GET /api/clients/:id - get client details with analysis history
r.get('/:id', validateClientId, async (req, res) => {
  const startTime = performance.now();

  try {
    const id = Number(req.params.id);
    const result = await fetchClientWithHistory(id);

    if (!result) {
      logSecurity('Attempt to access non-existent client', {
        clientId: id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const { client, analyses } = result;

    const duration = performance.now() - startTime;

    res.set('X-Response-Time', `${Math.round(duration)}ms`);
    res.json({
      success: true,
      client,
      analyses,
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
    const client = await createClientRecord(req.body || {});
    const duration = performance.now() - startTime;
    res.status(201).json({
      success: true,
      id: client.id,
      client,
      created: true,
      meta: {
        responseTime: Math.round(duration),
        progress: client.progress
      }
    });
  } catch (error) {
    const status = error.message?.includes('обов’язкова') ? 400 : 500;
    if (status === 500) {
      logError(error, { endpoint: 'POST /api/clients', ip: req.ip });
    }
    res.status(status).json({ success: false, error: error.message || 'Database error occurred' });
  }
});

// PUT /api/clients/:id - update client
r.put('/:id', validateClientId, validateClient, async (req, res) => {
  const startTime = performance.now();

  try {
    const id = Number(req.params.id);
    const updatedClient = await updateClientRecord(id, req.body || {});
    if (!updatedClient) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    const duration = performance.now() - startTime;

    res.json({
      success: true,
      updated: true,
      client: updatedClient,
      meta: {
        responseTime: Math.round(duration),
        progress: updatedClient.progress
      }
    });
  } catch (error) {
    const status = error.message?.includes('обов’язкова') ? 400 : 500;
    if (status === 500) {
      logError(error, { endpoint: 'PUT /api/clients/:id', clientId: req.params.id, ip: req.ip });
    }
    res.status(status).json({ success: false, error: error.message || 'Database error occurred' });
  }
});

// DELETE /api/clients/:id - delete client
r.delete('/:id', validateClientId, async (req, res) => {
  const startTime = performance.now();

  try {
    const id = Number(req.params.id);
    const result = await deleteClientRecord(id);
    if (!result.deleted) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    logSecurity('Client deletion', {
      clientId: id,
      clientName: result.clientName,
      deletedAnalyses: result.analysesCount,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const duration = performance.now() - startTime;
    res.json({
      success: true,
      meta: {
        deletedRows: 1,
        deletedAnalyses: result.analysesCount,
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
