-- Create a junction table for many-to-many relationship between conversations and personas
-- This allows personas to participate in multiple conversations

-- Step 1: Create the junction table
CREATE TABLE IF NOT EXISTS conversation_personas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,

  -- Ensure a persona can only be added once to a conversation (active or not)
  UNIQUE(conversation_id, persona_id)
);

-- Step 2: Migrate existing relationships from personas table
-- For each persona with a conversation_id, create a junction table entry
INSERT INTO conversation_personas (conversation_id, persona_id, joined_at, is_active)
SELECT
  conversation_id,
  id as persona_id,
  created_at as joined_at,
  true as is_active
FROM personas
WHERE conversation_id IS NOT NULL
  AND is_template = false
ON CONFLICT (conversation_id, persona_id) DO NOTHING;

-- Step 3: Drop the check constraint that requires conversation_id for non-templates
ALTER TABLE personas
DROP CONSTRAINT IF EXISTS check_template_consistency;

-- Step 4: Drop the conversation_id column from personas table
ALTER TABLE personas
DROP COLUMN IF EXISTS conversation_id CASCADE;

-- Step 5: Update the personas table constraint
-- Now personas are either templates or instances, but don't directly reference conversations
ALTER TABLE personas
ADD CONSTRAINT check_persona_type
CHECK (
  (is_template = true) OR
  (is_template = false)
);

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_personas_conversation ON conversation_personas(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_personas_persona ON conversation_personas(persona_id);
CREATE INDEX IF NOT EXISTS idx_conversation_personas_active ON conversation_personas(conversation_id, is_active) WHERE is_active = true;

-- Step 7: Add comments for clarity
COMMENT ON TABLE conversation_personas IS 'Junction table for many-to-many relationship between conversations and personas';
COMMENT ON COLUMN conversation_personas.joined_at IS 'When the persona joined the conversation';
COMMENT ON COLUMN conversation_personas.left_at IS 'When the persona left the conversation (NULL if still active)';
COMMENT ON COLUMN conversation_personas.is_active IS 'Whether the persona is currently active in the conversation';

-- Step 8: Create a view for easy access to active personas in conversations
CREATE OR REPLACE VIEW active_conversation_personas AS
SELECT
  cp.conversation_id,
  cp.persona_id,
  p.*,
  cp.joined_at
FROM conversation_personas cp
JOIN personas p ON p.id = cp.persona_id
WHERE cp.is_active = true;

-- Step 9: Grant necessary permissions
GRANT ALL ON conversation_personas TO authenticated;
GRANT ALL ON active_conversation_personas TO authenticated;