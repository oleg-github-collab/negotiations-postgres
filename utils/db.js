import pg from 'pg';
import logger from './logger.js';

const { Pool, types } = pg;

const parseInteger = (value) => {
  if (value === null) return null;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return null;
  return Math.abs(parsed) <= Number.MAX_SAFE_INTEGER ? parsed : value;
};

const parseFloatSafe = (value) => {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

// Ensure PostgreSQL numeric types are converted to JavaScript numbers where safe
types.setTypeParser(20, parseInteger); // int8/bigint
types.setTypeParser(21, parseInteger); // int2/smallint
types.setTypeParser(23, parseInteger); // int4/integer
types.setTypeParser(700, parseFloatSafe); // float4/real
types.setTypeParser(701, parseFloatSafe); // float8/double
types.setTypeParser(1700, parseFloatSafe); // numeric/decimal

const FALLBACK_URL = 'postgres://postgres:postgres@localhost:5432/teampulse';

function resolveConnectionString() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.PGHOST;
  const database = process.env.PGDATABASE;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const port = process.env.PGPORT || '5432';

  if (host && database && user) {
    const encodedUser = encodeURIComponent(user);
    const encodedPassword = password ? encodeURIComponent(password) : '';
    const auth = encodedPassword ? `${encodedUser}:${encodedPassword}` : encodedUser;
    return `postgres://${auth}@${host}:${port}/${database}`;
  }

  logger.warn('DATABASE_URL not provided. Falling back to local Postgres connection string.');
  return FALLBACK_URL;
}

function shouldUseSSL(connectionString) {
  if (process.env.PG_SSL === 'false') return false;
  if (process.env.PG_SSL === 'true') return true;
  return /(\.railway\.app|\.render\.com|\.supabase\.co|\.herokuapp\.com)/i.test(connectionString);
}

const connectionString = resolveConnectionString();

const pool = new Pool({
  connectionString,
  max: parseInt(process.env.PG_POOL_MAX || '10', 10),
  idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.PG_CONNECTION_TIMEOUT || '5000', 10),
  ssl: shouldUseSSL(connectionString) ? { rejectUnauthorized: false } : undefined
});

pool.on('error', (error) => {
  logger.error('Unexpected PostgreSQL connection error', { error });
});

export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id BIGSERIAL PRIMARY KEY,
        company TEXT NOT NULL,
        negotiator TEXT,
        sector TEXT,
        company_size TEXT,
        negotiation_type TEXT,
        deal_value TEXT,
        timeline TEXT,
        goal TEXT,
        decision_criteria TEXT,
        constraints TEXT,
        user_goals TEXT,
        client_goals TEXT,
        competitors TEXT,
        competitive_advantage TEXT,
        market_position TEXT,
        weekly_hours INTEGER DEFAULT 0,
        offered_services TEXT,
        deadlines TEXT,
        previous_interactions TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS analyses (
        id BIGSERIAL PRIMARY KEY,
        client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE,
        title TEXT,
        source TEXT,
        original_filename TEXT,
        original_text TEXT,
        tokens_estimated INTEGER,
        highlights JSONB DEFAULT '[]'::jsonb,
        summary JSONB DEFAULT '{}'::jsonb,
        barometer JSONB DEFAULT '{}'::jsonb,
        personas JSONB DEFAULT '[]'::jsonb,
        insights JSONB DEFAULT '{}'::jsonb,
        highlighted_text TEXT,
        person_focus TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`ALTER TABLE analyses ADD COLUMN IF NOT EXISTS highlights JSONB DEFAULT '[]'::jsonb;`);
    await client.query(`ALTER TABLE analyses ADD COLUMN IF NOT EXISTS summary JSONB DEFAULT '{}'::jsonb;`);
    await client.query(`ALTER TABLE analyses ADD COLUMN IF NOT EXISTS barometer JSONB DEFAULT '{}'::jsonb;`);
    await client.query(`ALTER TABLE analyses ADD COLUMN IF NOT EXISTS personas JSONB DEFAULT '[]'::jsonb;`);
    await client.query(`ALTER TABLE analyses ADD COLUMN IF NOT EXISTS insights JSONB DEFAULT '{}'::jsonb;`);
    await client.query(`ALTER TABLE analyses ADD COLUMN IF NOT EXISTS highlighted_text TEXT;`);
    await client.query(`ALTER TABLE analyses ADD COLUMN IF NOT EXISTS person_focus TEXT;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS usage_daily (
        day DATE PRIMARY KEY,
        tokens_used BIGINT DEFAULT 0,
        locked_until TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id BIGSERIAL PRIMARY KEY,
        client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE,
        title TEXT,
        description TEXT,
        raw_payload JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id BIGSERIAL PRIMARY KEY,
        team_id BIGINT REFERENCES teams(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        role TEXT,
        seniority TEXT,
        responsibilities TEXT,
        workload_percent NUMERIC,
        location TEXT,
        compensation_currency TEXT,
        compensation_amount NUMERIC,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS raci_snapshots (
        id BIGSERIAL PRIMARY KEY,
        team_id BIGINT REFERENCES teams(id) ON DELETE CASCADE,
        member_summary JSONB,
        matrix_actual JSONB,
        matrix_ideal JSONB,
        gaps JSONB,
        generated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS salary_insights (
        id BIGSERIAL PRIMARY KEY,
        member_id BIGINT REFERENCES team_members(id) ON DELETE CASCADE,
        input_payload JSONB,
        utilization JSONB,
        compensation_json JSONB,
        recommendations JSONB,
        generated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id BIGSERIAL PRIMARY KEY,
        request_id UUID,
        event_type TEXT NOT NULL,
        actor TEXT,
        entity_type TEXT,
        entity_id TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // New tables for independent negotiation system
    await client.query(`
      CREATE TABLE IF NOT EXISTS negotiations (
        id BIGSERIAL PRIMARY KEY,
        client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        negotiation_type TEXT DEFAULT 'sales',
        status TEXT DEFAULT 'active',
        outcome TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS negotiation_analyses (
        id BIGSERIAL PRIMARY KEY,
        negotiation_id BIGINT REFERENCES negotiations(id) ON DELETE CASCADE,
        title TEXT,
        source TEXT,
        original_filename TEXT,
        original_text TEXT,
        tokens_estimated INTEGER,
        highlights JSONB DEFAULT '[]'::jsonb,
        summary JSONB DEFAULT '{}'::jsonb,
        barometer JSONB DEFAULT '{}'::jsonb,
        personas JSONB DEFAULT '[]'::jsonb,
        insights JSONB DEFAULT '{}'::jsonb,
        highlighted_text TEXT,
        person_focus TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analyses_client ON analyses(client_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_events_type ON audit_events(event_type);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
    `);

    // Indices for new negotiation tables
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_negotiations_client ON negotiations(client_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_negotiations_status ON negotiations(status);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_negotiations_created_at ON negotiations(created_at DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_negotiation_analyses_negotiation ON negotiation_analyses(negotiation_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_negotiation_analyses_created_at ON negotiation_analyses(created_at DESC);
    `);

    await client.query('COMMIT');
    logger.info('PostgreSQL schema initialized');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to initialize PostgreSQL schema', { error });
    throw error;
  } finally {
    client.release();
  }
}

export async function query(sql, params = []) {
  const start = Date.now();
  const result = await pool.query(sql, params);
  const duration = Date.now() - start;
  if (duration > 500) {
    logger.warn('Slow database query detected', { duration, sql });
  }
  return result;
}

export async function run(sql, params = []) {
  const result = await query(sql, params);
  return { rowCount: result.rowCount, rows: result.rows };
}

export async function get(sql, params = []) {
  const result = await query(sql, params);
  return result.rows[0] ?? null;
}

export async function all(sql, params = []) {
  const result = await query(sql, params);
  return result.rows;
}

export async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work({
      query: (sql, params = []) => client.query(sql, params),
      get: async (sql, params = []) => (await client.query(sql, params)).rows[0] ?? null,
      all: async (sql, params = []) => (await client.query(sql, params)).rows,
    });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function getPool() {
  return pool;
}
