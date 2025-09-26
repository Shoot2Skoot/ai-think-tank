-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User preferences for data retention
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data_retention TEXT CHECK (data_retention IN ('none', 'session', 'permanent')) DEFAULT 'session',
  allow_analytics BOOLEAN DEFAULT false,
  delete_after_days INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform API keys (encrypted)
CREATE TABLE platform_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'gemini')),
  encrypted_key TEXT NOT NULL,
  tier TEXT CHECK (tier IN ('free', 'pro', 'enterprise')) DEFAULT 'free',
  rate_limit_rpm INTEGER DEFAULT 60,
  rate_limit_tpm INTEGER DEFAULT 100000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User custom API keys (Phase 2)
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'gemini')),
  encrypted_key TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  is_valid BOOLEAN DEFAULT true,
  last_validated TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Pre-built personas library
CREATE TABLE persona_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  system_prompt TEXT NOT NULL,
  default_model TEXT NOT NULL,
  default_provider TEXT NOT NULL CHECK (default_provider IN ('openai', 'anthropic', 'gemini')),
  demographics JSONB,
  background JSONB,
  personality JSONB,
  expertise_areas TEXT[],
  experience_level TEXT CHECK (experience_level IN ('None', 'Limited', 'Entry', 'Senior', 'Mastery')),
  attitude TEXT CHECK (attitude IN ('Pessimistic', 'Skeptical', 'Neutral', 'Intrigued', 'Excited')),
  is_premium BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  rating FLOAT CHECK (rating >= 0 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation templates
CREATE TABLE conversation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  industry TEXT,
  name TEXT NOT NULL,
  description TEXT,
  personas UUID[], -- References to persona_templates
  initial_prompt TEXT,
  conversation_mode TEXT CHECK (conversation_mode IN ('debate', 'ideation', 'refinement', 'planning')),
  estimated_messages INTEGER,
  estimated_cost DECIMAL(10, 4),
  is_premium BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  rating FLOAT CHECK (rating >= 0 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT,
  mode TEXT CHECK (mode IN ('auto', 'manual')) DEFAULT 'auto',
  conversation_type TEXT CHECK (conversation_type IN ('debate', 'ideation', 'refinement', 'planning')) DEFAULT 'ideation',
  speed INTEGER CHECK (speed >= 1 AND speed <= 10) DEFAULT 5,
  total_cost DECIMAL(10, 6) DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Personas table
CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES persona_templates(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  model TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'gemini')),
  temperature FLOAT DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER DEFAULT 1000,
  demographics JSONB,
  background JSONB,
  personality JSONB,
  system_prompt TEXT NOT NULL,
  experience_level TEXT,
  attitude TEXT,
  total_cost DECIMAL(10, 6) DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
  content TEXT NOT NULL,
  tokens_input INTEGER,
  tokens_output INTEGER,
  tokens_cached INTEGER,
  cost DECIMAL(10, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Cost tracking tables
CREATE TABLE cost_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cached_tokens INTEGER DEFAULT 0,
  cache_write_tokens INTEGER DEFAULT 0,
  input_cost DECIMAL(10, 8),
  output_cost DECIMAL(10, 8),
  cache_cost DECIMAL(10, 8),
  total_cost DECIMAL(10, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aggregated costs by hour
CREATE TABLE hourly_costs (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hour_start TIMESTAMP WITH TIME ZONE,
  provider TEXT,
  total_cost DECIMAL(10, 6),
  message_count INTEGER,
  total_tokens INTEGER,
  cache_hit_rate FLOAT,
  PRIMARY KEY (user_id, hour_start, provider)
);

-- Budget configuration
CREATE TABLE user_budgets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_limit DECIMAL(10, 2) DEFAULT 10.00,
  daily_limit DECIMAL(10, 2) DEFAULT 1.00,
  warning_threshold DECIMAL(10, 2) DEFAULT 8.00,
  auto_stop BOOLEAN DEFAULT true,
  current_monthly_spend DECIMAL(10, 2) DEFAULT 0,
  current_daily_spend DECIMAL(10, 2) DEFAULT 0,
  reset_day INTEGER DEFAULT 1 CHECK (reset_day >= 1 AND reset_day <= 28),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget alerts
CREATE TABLE budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT CHECK (alert_type IN ('warning', 'limit_reached', 'stopped')) NOT NULL,
  message TEXT,
  threshold_value DECIMAL(10, 2),
  current_value DECIMAL(10, 2),
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session management for caching
CREATE TABLE conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  cache_key TEXT UNIQUE,
  provider TEXT,
  cache_type TEXT CHECK (cache_type IN ('persona', 'context', 'both')),
  ttl_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX idx_personas_conversation_id ON personas(conversation_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_persona_id ON messages(persona_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_cost_records_user_date ON cost_records(user_id, created_at);
CREATE INDEX idx_cost_records_conversation ON cost_records(conversation_id);
CREATE INDEX idx_hourly_costs_user ON hourly_costs(user_id, hour_start);
CREATE INDEX idx_budget_alerts_user ON budget_alerts(user_id, created_at);

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- User preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User API keys
CREATE POLICY "Users can manage own API keys" ON user_api_keys
  FOR ALL USING (auth.uid() = user_id);

-- Conversations
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Personas
CREATE POLICY "Users can view personas in own conversations" ON personas
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage personas in own conversations" ON personas
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- Messages
CREATE POLICY "Users can view messages in own conversations" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations" ON messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- Cost records
CREATE POLICY "Users can view own cost records" ON cost_records
  FOR SELECT USING (auth.uid() = user_id);

-- Hourly costs
CREATE POLICY "Users can view own hourly costs" ON hourly_costs
  FOR SELECT USING (auth.uid() = user_id);

-- User budgets
CREATE POLICY "Users can manage own budgets" ON user_budgets
  FOR ALL USING (auth.uid() = user_id);

-- Budget alerts
CREATE POLICY "Users can view own alerts" ON budget_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can acknowledge own alerts" ON budget_alerts
  FOR UPDATE USING (auth.uid() = user_id);

-- Create functions for triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_persona_templates_updated_at
  BEFORE UPDATE ON persona_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_conversation_templates_updated_at
  BEFORE UPDATE ON conversation_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_budgets_updated_at
  BEFORE UPDATE ON user_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();