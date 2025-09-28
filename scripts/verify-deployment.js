#!/usr/bin/env node
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

function collectConfigWarnings() {
  const warnings = [];
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'demo') {
    warnings.push('OPENAI_API_KEY is missing or using demo value.');
  }
  if (!process.env.DATABASE_URL && !(process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE)) {
    warnings.push('PostgreSQL connection is not configured. Set DATABASE_URL or PGHOST/PGUSER/PGDATABASE.');
  }
  if (!process.env.NODE_ENV) {
    warnings.push('NODE_ENV is not set. Defaulting to development.');
  }
  return warnings;
}

function buildConnectionConfig() {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    const sslNeeded = process.env.PG_SSL === 'true' || /(\.railway\.app|\.render\.com|\.supabase\.co|\.herokuapp\.com)/i.test(connectionString);
    return {
      connectionString,
      max: Number(process.env.PG_POOL_MAX || 5),
      ssl: sslNeeded ? { rejectUnauthorized: false } : undefined
    };
  }

  const host = process.env.PGHOST;
  const user = process.env.PGUSER;
  const database = process.env.PGDATABASE;
  if (!host || !user || !database) {
    throw new Error('PostgreSQL environment variables are incomplete.');
  }

  return {
    host,
    port: Number(process.env.PGPORT || 5432),
    user,
    password: process.env.PGPASSWORD,
    database,
    max: Number(process.env.PG_POOL_MAX || 5),
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  };
}

async function verifyDatabase() {
  const config = buildConnectionConfig();
  const pool = new Pool(config);

  try {
    const { rows } = await pool.query('SELECT NOW() as current_time, current_database() as database');
    const { rows: tableCheck } = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_name IN ('clients', 'analyses', 'audit_events')`
    );

    return {
      success: true,
      connection: {
        database: rows[0]?.database,
        currentTime: rows[0]?.current_time,
        tablesPresent: tableCheck.map(row => row.table_name)
      }
    };
  } finally {
    await pool.end();
  }
}

async function main() {
  const warnings = collectConfigWarnings();
  if (warnings.length) {
    console.warn('⚠️  Configuration warnings:');
    warnings.forEach(w => console.warn(`  - ${w}`));
  }

  try {
    const dbStatus = await verifyDatabase();
    console.log('✅ PostgreSQL connection established');
    console.log(JSON.stringify(dbStatus.connection, null, 2));
    console.log('✅ Deployment environment is ready.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Deployment verification failed:', error.message);
    process.exit(1);
  }
}

main();
