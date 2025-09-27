-- Migration: Debug Logging System
-- Description: Creates tables for debugging Edge function calls
-- Author: AI Think Tank
-- Date: 2025-09-26

-- Create debug_logs table
CREATE TABLE IF NOT EXISTS debug_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('request', 'response', 'error', 'internal')),
  phase TEXT NOT NULL,
  data JSONB,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX idx_debug_logs_conversation_id ON debug_logs(conversation_id);
CREATE INDEX idx_debug_logs_persona_id ON debug_logs(persona_id);
CREATE INDEX idx_debug_logs_function_name ON debug_logs(function_name);
CREATE INDEX idx_debug_logs_timestamp ON debug_logs(timestamp DESC);
CREATE INDEX idx_debug_logs_event_type ON debug_logs(event_type);

-- Create a view for recent debug logs
CREATE OR REPLACE VIEW recent_debug_logs AS
SELECT
  dl.*,
  c.title as conversation_title,
  p.name as persona_name,
  u.email as user_email
FROM debug_logs dl
LEFT JOIN conversations c ON dl.conversation_id = c.id
LEFT JOIN personas p ON dl.persona_id = p.id
LEFT JOIN auth.users u ON dl.user_id = u.id
WHERE dl.timestamp > NOW() - INTERVAL '1 hour'
ORDER BY dl.timestamp DESC;

-- Function to clean up old debug logs (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_debug_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM debug_logs WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- RLS policies
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role has full access to debug_logs" ON debug_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Users can view their own debug logs
CREATE POLICY "Users can view their own debug logs" ON debug_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE debug_logs IS 'Stores debug information from Edge function executions';
COMMENT ON COLUMN debug_logs.event_type IS 'Type of event: request, response, error, or internal processing';
COMMENT ON COLUMN debug_logs.phase IS 'Specific phase within the function execution';
COMMENT ON COLUMN debug_logs.data IS 'The actual data being processed at this phase';