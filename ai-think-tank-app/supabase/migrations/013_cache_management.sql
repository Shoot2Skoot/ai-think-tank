-- Migration: Cache Management Tables
-- Description: Creates tables for caching LLM responses and tracking cache metrics
-- Author: AI Think Tank
-- Date: 2025-09-26

-- Create cache_entries table for storing cached content
CREATE TABLE IF NOT EXISTS cache_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  ttl INTEGER NOT NULL DEFAULT 300, -- Time to live in seconds
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on key for fast lookups
CREATE INDEX idx_cache_entries_key ON cache_entries(key);

-- Create index on expires_at for cleanup queries
CREATE INDEX idx_cache_entries_expires_at ON cache_entries(expires_at);

-- Create cache_metrics table for tracking cache performance
CREATE TABLE IF NOT EXISTS cache_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hits INTEGER NOT NULL DEFAULT 0,
  misses INTEGER NOT NULL DEFAULT 0,
  hit_rate DECIMAL(5,4) NOT NULL DEFAULT 0, -- Percentage as decimal (0.0000 - 1.0000)
  saved_cost DECIMAL(10,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on conversation_id for fast lookups
CREATE INDEX idx_cache_metrics_conversation_id ON cache_metrics(conversation_id);

-- Create index on user_id for user-specific metrics
CREATE INDEX idx_cache_metrics_user_id ON cache_metrics(user_id);

-- Create gemini_cache_references table for Gemini cached content management
CREATE TABLE IF NOT EXISTS gemini_cache_references (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  cache_name TEXT NOT NULL,
  model TEXT NOT NULL,
  display_name TEXT,
  system_instruction TEXT,
  ttl_seconds INTEGER NOT NULL DEFAULT 3600,
  expires_at TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on cache_key for fast lookups
CREATE INDEX idx_gemini_cache_references_cache_key ON gemini_cache_references(cache_key);

-- Create index on expires_at for cleanup queries
CREATE INDEX idx_gemini_cache_references_expires_at ON gemini_cache_references(expires_at);

-- Add cached_tokens column to usage_costs table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'usage_costs'
    AND column_name = 'cached_tokens'
  ) THEN
    ALTER TABLE usage_costs ADD COLUMN cached_tokens INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add cache_savings column to usage_costs table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'usage_costs'
    AND column_name = 'cache_savings'
  ) THEN
    ALTER TABLE usage_costs ADD COLUMN cache_savings DECIMAL(10,6) DEFAULT 0;
  END IF;
END $$;

-- Create function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache_entries()
RETURNS void AS $$
BEGIN
  -- Delete expired cache entries
  DELETE FROM cache_entries WHERE expires_at < NOW();

  -- Delete expired Gemini cache references
  DELETE FROM gemini_cache_references WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate and update cache metrics
CREATE OR REPLACE FUNCTION update_cache_metrics(
  p_conversation_id UUID,
  p_user_id UUID,
  p_hit BOOLEAN,
  p_saved_amount DECIMAL DEFAULT 0
)
RETURNS void AS $$
DECLARE
  v_metrics_id UUID;
  v_hits INTEGER;
  v_misses INTEGER;
BEGIN
  -- Get or create metrics record for this conversation
  SELECT id, hits, misses INTO v_metrics_id, v_hits, v_misses
  FROM cache_metrics
  WHERE conversation_id = p_conversation_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_metrics_id IS NULL THEN
    -- Create new metrics record
    INSERT INTO cache_metrics (conversation_id, user_id, hits, misses, hit_rate, saved_cost)
    VALUES (
      p_conversation_id,
      p_user_id,
      CASE WHEN p_hit THEN 1 ELSE 0 END,
      CASE WHEN NOT p_hit THEN 1 ELSE 0 END,
      CASE WHEN p_hit THEN 1.0 ELSE 0.0 END,
      p_saved_amount
    );
  ELSE
    -- Update existing metrics
    IF p_hit THEN
      v_hits := v_hits + 1;
    ELSE
      v_misses := v_misses + 1;
    END IF;

    UPDATE cache_metrics
    SET
      hits = v_hits,
      misses = v_misses,
      hit_rate = v_hits::DECIMAL / (v_hits + v_misses),
      saved_cost = saved_cost + p_saved_amount
    WHERE id = v_metrics_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job to clean up expired cache entries (runs every hour)
-- Note: This requires pg_cron extension which needs to be enabled separately
-- SELECT cron.schedule('cleanup-expired-cache', '0 * * * *', 'SELECT cleanup_expired_cache_entries();');

-- Create RLS policies for cache tables
ALTER TABLE cache_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE gemini_cache_references ENABLE ROW LEVEL SECURITY;

-- Service role has full access to cache tables
CREATE POLICY "Service role has full access to cache_entries" ON cache_entries
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to cache_metrics" ON cache_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to gemini_cache_references" ON gemini_cache_references
  FOR ALL USING (auth.role() = 'service_role');

-- Users can view their own cache metrics
CREATE POLICY "Users can view their own cache metrics" ON cache_metrics
  FOR SELECT USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE cache_entries IS 'Stores cached LLM responses and content for performance optimization';
COMMENT ON TABLE cache_metrics IS 'Tracks cache performance metrics per conversation and user';
COMMENT ON TABLE gemini_cache_references IS 'Manages Gemini-specific cached content references';
COMMENT ON COLUMN cache_entries.ttl IS 'Time to live in seconds';
COMMENT ON COLUMN cache_metrics.hit_rate IS 'Cache hit rate as decimal (0.0000 - 1.0000)';
COMMENT ON COLUMN cache_metrics.saved_cost IS 'Amount saved through caching in dollars';