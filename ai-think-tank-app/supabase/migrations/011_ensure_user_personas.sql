-- Ensure personas are properly scoped to users
-- Templates (is_template=true) should have user_id=NULL (global)
-- All other personas (is_template=false) should have a user_id

-- First, add a constraint to ensure non-templates have a user_id
ALTER TABLE personas
DROP CONSTRAINT IF EXISTS check_persona_type;

ALTER TABLE personas
ADD CONSTRAINT check_persona_user_consistency
CHECK (
  (is_template = true AND user_id IS NULL) OR
  (is_template = false AND user_id IS NOT NULL)
);

-- Create an index for better query performance on user personas
CREATE INDEX IF NOT EXISTS idx_personas_user_id_not_template
ON personas(user_id)
WHERE is_template = false;

-- Create a view for user's personas (including their instances)
CREATE OR REPLACE VIEW user_personas AS
SELECT
  p.*,
  CASE
    WHEN cp.conversation_id IS NOT NULL THEN true
    ELSE false
  END as in_active_conversation
FROM personas p
LEFT JOIN conversation_personas cp ON cp.persona_id = p.id AND cp.is_active = true
WHERE p.is_template = false;

-- Grant access to the view
GRANT ALL ON user_personas TO authenticated;

-- Add RLS (Row Level Security) policies for personas
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read templates
CREATE POLICY "Templates are viewable by everyone" ON personas
FOR SELECT
USING (is_template = true);

-- Policy: Users can only see their own persona instances
CREATE POLICY "Users can view their own personas" ON personas
FOR SELECT
USING (
  is_template = false
  AND user_id = auth.uid()
);

-- Policy: Users can create their own personas
CREATE POLICY "Users can create their own personas" ON personas
FOR INSERT
WITH CHECK (
  is_template = false
  AND user_id = auth.uid()
);

-- Policy: Users can update their own personas
CREATE POLICY "Users can update their own personas" ON personas
FOR UPDATE
USING (
  is_template = false
  AND user_id = auth.uid()
)
WITH CHECK (
  is_template = false
  AND user_id = auth.uid()
);

-- Policy: Users can delete their own personas
CREATE POLICY "Users can delete their own personas" ON personas
FOR DELETE
USING (
  is_template = false
  AND user_id = auth.uid()
);

-- Also add RLS for conversation_personas
ALTER TABLE conversation_personas ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see persona relationships for their conversations
CREATE POLICY "Users can view their conversation personas" ON conversation_personas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_personas.conversation_id
    AND c.user_id = auth.uid()
  )
);

-- Policy: Users can add personas to their conversations
CREATE POLICY "Users can add personas to their conversations" ON conversation_personas
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND c.user_id = auth.uid()
  )
);

-- Policy: Users can update personas in their conversations
CREATE POLICY "Users can update personas in their conversations" ON conversation_personas
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_personas.conversation_id
    AND c.user_id = auth.uid()
  )
);

-- Policy: Users can remove personas from their conversations
CREATE POLICY "Users can remove personas from their conversations" ON conversation_personas
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_personas.conversation_id
    AND c.user_id = auth.uid()
  )
);