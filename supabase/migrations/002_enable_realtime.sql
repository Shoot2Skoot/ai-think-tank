-- Enable Realtime for necessary tables
-- Run this after the initial schema migration

-- Enable Realtime on messages table for live message updates
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable Realtime on cost_records for live cost tracking
ALTER PUBLICATION supabase_realtime ADD TABLE cost_records;

-- Enable Realtime on conversations for status updates
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Enable Realtime on budget_alerts for instant budget warnings
ALTER PUBLICATION supabase_realtime ADD TABLE budget_alerts;

-- Verify Realtime is enabled (optional query to check)
SELECT
  schemaname,
  tablename,
  CASE
    WHEN tablename IN (
      SELECT tablename
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
    ) THEN 'Enabled'
    ELSE 'Disabled'
  END as realtime_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('messages', 'cost_records', 'conversations', 'budget_alerts')
ORDER BY tablename;