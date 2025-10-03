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
        client_type TEXT DEFAULT 'negotiation',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add new columns if they don't exist
    await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'negotiation';`);
    await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`);

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
        analysis_duration INTEGER DEFAULT 0,
        manipulation_count INTEGER DEFAULT 0,
        bias_count INTEGER DEFAULT 0,
        fallacy_count INTEGER DEFAULT 0,
        severity_average NUMERIC DEFAULT 0,
        risk_level TEXT DEFAULT 'low',
        client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add new columns if they don't exist
    await client.query(`ALTER TABLE negotiation_analyses ADD COLUMN IF NOT EXISTS analysis_duration INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE negotiation_analyses ADD COLUMN IF NOT EXISTS manipulation_count INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE negotiation_analyses ADD COLUMN IF NOT EXISTS bias_count INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE negotiation_analyses ADD COLUMN IF NOT EXISTS fallacy_count INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE negotiation_analyses ADD COLUMN IF NOT EXISTS severity_average NUMERIC DEFAULT 0;`);
    await client.query(`ALTER TABLE negotiation_analyses ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low';`);
    await client.query(`ALTER TABLE negotiation_analyses ADD COLUMN IF NOT EXISTS client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE;`);

    // ====== BEST HIRE MODULE TABLES ======

    // Job positions for clients
    await client.query(`
      CREATE TABLE IF NOT EXISTS positions (
        id BIGSERIAL PRIMARY KEY,
        client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        department TEXT,
        seniority_level TEXT,
        employment_type TEXT DEFAULT 'full-time',
        location TEXT,
        is_remote BOOLEAN DEFAULT false,
        salary_min NUMERIC,
        salary_max NUMERIC,
        salary_currency TEXT DEFAULT 'UAH',
        status TEXT DEFAULT 'open',
        priority TEXT DEFAULT 'medium',
        required_skills JSONB DEFAULT '[]'::jsonb,
        preferred_skills JSONB DEFAULT '[]'::jsonb,
        responsibilities JSONB DEFAULT '[]'::jsonb,
        requirements JSONB DEFAULT '[]'::jsonb,
        benefits JSONB DEFAULT '[]'::jsonb,
        description TEXT,
        headcount INTEGER DEFAULT 1,
        filled_count INTEGER DEFAULT 0,
        deadline DATE,
        hiring_manager TEXT,
        recruiter_assigned TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Resumes/Candidates
    await client.query(`
      CREATE TABLE IF NOT EXISTS resumes (
        id BIGSERIAL PRIMARY KEY,
        position_id BIGINT REFERENCES positions(id) ON DELETE CASCADE,
        client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE,
        candidate_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        linkedin_url TEXT,
        current_position TEXT,
        current_company TEXT,
        location TEXT,
        willing_to_relocate BOOLEAN DEFAULT false,
        expected_salary_min NUMERIC,
        expected_salary_max NUMERIC,
        salary_currency TEXT DEFAULT 'UAH',
        notice_period_days INTEGER,
        years_of_experience NUMERIC,
        skills JSONB DEFAULT '[]'::jsonb,
        education JSONB DEFAULT '[]'::jsonb,
        work_history JSONB DEFAULT '[]'::jsonb,
        certifications JSONB DEFAULT '[]'::jsonb,
        languages JSONB DEFAULT '[]'::jsonb,
        resume_text TEXT,
        resume_file_url TEXT,
        source_channel TEXT,
        stage TEXT DEFAULT 'new',
        rating NUMERIC DEFAULT 0,
        interviewer_notes JSONB DEFAULT '[]'::jsonb,
        ai_match_score NUMERIC,
        ai_analysis JSONB,
        rejection_reason TEXT,
        hired_date DATE,
        start_date DATE,
        actual_salary NUMERIC,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Recruiting channels analytics
    await client.query(`
      CREATE TABLE IF NOT EXISTS recruiting_channels (
        id BIGSERIAL PRIMARY KEY,
        client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE,
        channel_name TEXT NOT NULL,
        channel_type TEXT,
        cost_per_month NUMERIC DEFAULT 0,
        cost_currency TEXT DEFAULT 'UAH',
        candidates_sourced INTEGER DEFAULT 0,
        candidates_screened INTEGER DEFAULT 0,
        candidates_interviewed INTEGER DEFAULT 0,
        candidates_hired INTEGER DEFAULT 0,
        avg_time_to_hire_days NUMERIC,
        avg_quality_score NUMERIC,
        conversion_rate NUMERIC,
        cost_per_hire NUMERIC,
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Market salary data and benchmarks
    await client.query(`
      CREATE TABLE IF NOT EXISTS market_salaries (
        id BIGSERIAL PRIMARY KEY,
        position_title TEXT NOT NULL,
        seniority_level TEXT,
        location TEXT,
        industry TEXT,
        salary_min NUMERIC,
        salary_median NUMERIC,
        salary_max NUMERIC,
        salary_currency TEXT DEFAULT 'UAH',
        sample_size INTEGER,
        data_source TEXT,
        year INTEGER,
        quarter INTEGER,
        skills_required JSONB DEFAULT '[]'::jsonb,
        remote_allowed BOOLEAN,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Hiring bottlenecks and blockers
    await client.query(`
      CREATE TABLE IF NOT EXISTS hiring_bottlenecks (
        id BIGSERIAL PRIMARY KEY,
        client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE,
        position_id BIGINT REFERENCES positions(id) ON DELETE SET NULL,
        bottleneck_type TEXT NOT NULL,
        severity TEXT DEFAULT 'medium',
        stage TEXT,
        description TEXT NOT NULL,
        impact_description TEXT,
        affected_positions_count INTEGER DEFAULT 1,
        days_delayed INTEGER DEFAULT 0,
        cost_impact NUMERIC DEFAULT 0,
        cost_currency TEXT DEFAULT 'UAH',
        identified_by TEXT,
        status TEXT DEFAULT 'open',
        resolution_plan TEXT,
        resolved_at TIMESTAMPTZ,
        resolution_notes TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Interview pipeline and stages
    await client.query(`
      CREATE TABLE IF NOT EXISTS interview_stages (
        id BIGSERIAL PRIMARY KEY,
        resume_id BIGINT REFERENCES resumes(id) ON DELETE CASCADE,
        position_id BIGINT REFERENCES positions(id) ON DELETE CASCADE,
        stage_name TEXT NOT NULL,
        stage_order INTEGER DEFAULT 1,
        scheduled_date TIMESTAMPTZ,
        completed_date TIMESTAMPTZ,
        interviewer TEXT,
        status TEXT DEFAULT 'pending',
        feedback TEXT,
        rating NUMERIC,
        decision TEXT,
        next_steps TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Budget tracking for hiring
    await client.query(`
      CREATE TABLE IF NOT EXISTS hiring_budgets (
        id BIGSERIAL PRIMARY KEY,
        client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE,
        budget_year INTEGER NOT NULL,
        budget_quarter INTEGER,
        department TEXT,
        total_budget NUMERIC NOT NULL,
        budget_currency TEXT DEFAULT 'UAH',
        spent_amount NUMERIC DEFAULT 0,
        committed_amount NUMERIC DEFAULT 0,
        available_amount NUMERIC,
        headcount_budget INTEGER,
        headcount_filled INTEGER DEFAULT 0,
        notes TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add columns if they don't exist
    await client.query(`ALTER TABLE positions ADD COLUMN IF NOT EXISTS filled_count INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE positions ADD COLUMN IF NOT EXISTS hiring_manager TEXT;`);
    await client.query(`ALTER TABLE positions ADD COLUMN IF NOT EXISTS recruiter_assigned TEXT;`);
    await client.query(`ALTER TABLE resumes ADD COLUMN IF NOT EXISTS ai_match_score NUMERIC;`);
    await client.query(`ALTER TABLE resumes ADD COLUMN IF NOT EXISTS ai_analysis JSONB;`);
    await client.query(`ALTER TABLE resumes ADD COLUMN IF NOT EXISTS actual_salary NUMERIC;`);

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

    // Indices for Best Hire tables
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_positions_client ON positions(client_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_resumes_position ON resumes(position_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_resumes_client ON resumes(client_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_resumes_stage ON resumes(stage);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_recruiting_channels_client ON recruiting_channels(client_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hiring_bottlenecks_client ON hiring_bottlenecks(client_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hiring_bottlenecks_position ON hiring_bottlenecks(position_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_interview_stages_resume ON interview_stages(resume_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hiring_budgets_client ON hiring_budgets(client_id);
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
