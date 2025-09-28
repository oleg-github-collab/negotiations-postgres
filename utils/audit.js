import { run, all } from './db.js';
import logger from './logger.js';

export async function recordAuditEvent({
  requestId = null,
  eventType,
  actor = 'system',
  entityType = null,
  entityId = null,
  metadata = {},
}) {
  if (!eventType) {
    logger.warn('Attempted to record audit event without eventType');
    return;
  }

  try {
    await run(
      `
      INSERT INTO audit_events(
        request_id,
        event_type,
        actor,
        entity_type,
        entity_id,
        metadata
      ) VALUES ($1,$2,$3,$4,$5,$6)
      `,
      [requestId, eventType, actor, entityType, entityId, metadata]
    );
  } catch (error) {
    logger.error('Failed to record audit event', { error, eventType, entityType, entityId });
  }
}

export async function listAuditEvents({ limit = 100 } = {}) {
  const rows = await all(
    `
    SELECT id, request_id, event_type, actor, entity_type, entity_id, metadata, created_at
    FROM audit_events
    ORDER BY created_at DESC
    LIMIT $1
    `,
    [limit]
  );
  return rows;
}
