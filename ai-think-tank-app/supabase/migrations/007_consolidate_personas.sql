-- Consolidate persona_templates and personas into a single personas table
-- This migration merges both tables to simplify the schema

-- Step 1: Add new columns to personas table for template functionality
ALTER TABLE personas
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS expertise_areas TEXT[],
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating FLOAT CHECK (rating >= 0 AND rating <= 5),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Make conversation_id nullable (templates don't belong to conversations)
ALTER TABLE personas
ALTER COLUMN conversation_id DROP NOT NULL;

-- Step 3: Copy all persona_templates data into personas table as templates
INSERT INTO personas (
  name,
  role,
  model,
  provider,
  temperature,
  max_tokens,
  demographics,
  background,
  personality,
  system_prompt,
  experience_level,
  attitude,
  is_template,
  user_id,
  conversation_id,
  avatar_url,
  color,
  category,
  description,
  expertise_areas,
  is_premium,
  usage_count,
  rating,
  created_at,
  updated_at
)
SELECT
  name,
  role,
  default_model as model,
  default_provider as provider,
  0.7 as temperature,
  1000 as max_tokens,
  demographics,
  background,
  personality,
  system_prompt,
  experience_level,
  attitude,
  true as is_template,  -- Mark as template
  NULL as user_id,       -- Global templates have no user
  NULL as conversation_id, -- Templates don't belong to conversations
  COALESCE(avatar_url, '/avatars/tile000.png') as avatar_url,
  COALESCE(color, '#6366f1') as color,
  category,
  description,
  expertise_areas,
  is_premium,
  usage_count,
  rating,
  created_at,
  updated_at
FROM persona_templates
WHERE NOT EXISTS (
  -- Avoid duplicates if migration is run multiple times
  SELECT 1 FROM personas p
  WHERE p.name = persona_templates.name
  AND p.is_template = true
);

-- Step 4: Drop the foreign key constraint on template_id
ALTER TABLE personas
DROP CONSTRAINT IF EXISTS personas_template_id_fkey;

-- Step 5: Drop the template_id column
ALTER TABLE personas
DROP COLUMN IF EXISTS template_id;

-- Step 6: Drop the persona_templates table
DROP TABLE IF EXISTS persona_templates CASCADE;

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_personas_is_template ON personas(is_template);
CREATE INDEX IF NOT EXISTS idx_personas_conversation_id ON personas(conversation_id);
CREATE INDEX IF NOT EXISTS idx_personas_user_id ON personas(user_id);
CREATE INDEX IF NOT EXISTS idx_personas_template_global ON personas(is_template, user_id)
WHERE is_template = true AND user_id IS NULL;

-- Step 8: Add comments for clarity
COMMENT ON COLUMN personas.is_template IS 'True if this is a template persona, false if it belongs to a specific conversation';
COMMENT ON COLUMN personas.user_id IS 'User who owns this template (NULL for global templates)';
COMMENT ON COLUMN personas.conversation_id IS 'Conversation this persona belongs to (NULL for templates)';

-- Step 9: Add constraint to ensure templates have no conversation_id
ALTER TABLE personas
ADD CONSTRAINT check_template_consistency
CHECK (
  (is_template = true AND conversation_id IS NULL) OR
  (is_template = false AND conversation_id IS NOT NULL)
);