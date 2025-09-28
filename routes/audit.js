import { Router } from 'express';
import { listAuditEvents } from '../utils/audit.js';

const r = Router();

r.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const events = await listAuditEvents({ limit });
    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Не вдалося завантажити журнал подій' });
  }
});

export default r;
