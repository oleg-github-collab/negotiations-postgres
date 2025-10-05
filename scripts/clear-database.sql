-- Clear all data from TeamPulse database
-- Run this with: psql -U postgres -d teampulse -f scripts/clear-database.sql

BEGIN;

-- Clear Best Hire tables
TRUNCATE TABLE interview_stages CASCADE;
TRUNCATE TABLE hiring_budgets CASCADE;
TRUNCATE TABLE hiring_bottlenecks CASCADE;
TRUNCATE TABLE market_salaries CASCADE;
TRUNCATE TABLE recruiting_channels CASCADE;
TRUNCATE TABLE resumes CASCADE;
TRUNCATE TABLE positions CASCADE;

-- Clear Team tables
TRUNCATE TABLE salary_insights CASCADE;
TRUNCATE TABLE raci_snapshots CASCADE;
TRUNCATE TABLE team_members CASCADE;
TRUNCATE TABLE teams CASCADE;

-- Clear Negotiations tables
TRUNCATE TABLE negotiation_analyses CASCADE;
TRUNCATE TABLE negotiations CASCADE;

-- Clear Analysis tables
TRUNCATE TABLE analyses CASCADE;

-- Clear Clients (this will cascade to all related tables)
TRUNCATE TABLE clients RESTART IDENTITY CASCADE;

-- Clear usage tracking
DELETE FROM usage_daily;

-- Clear audit logs
TRUNCATE TABLE audit_events CASCADE;

COMMIT;

-- Verify cleanup
SELECT 'clients' as table_name, COUNT(*) as count FROM clients
UNION ALL
SELECT 'analyses', COUNT(*) FROM analyses
UNION ALL
SELECT 'teams', COUNT(*) FROM teams
UNION ALL
SELECT 'team_members', COUNT(*) FROM team_members
UNION ALL
SELECT 'positions', COUNT(*) FROM positions
UNION ALL
SELECT 'resumes', COUNT(*) FROM resumes
UNION ALL
SELECT 'negotiations', COUNT(*) FROM negotiations;
