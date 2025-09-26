-- Create reactions table for message reactions
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  persona_id UUID REFERENCES personas(id) ON DELETE SET NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure unique reactions per user/persona per message
  CONSTRAINT unique_user_reaction UNIQUE(message_id, user_id, emoji),
  CONSTRAINT unique_persona_reaction UNIQUE(message_id, persona_id, emoji),
  -- Ensure either user_id or persona_id is set, not both
  CONSTRAINT reaction_author CHECK (
    (user_id IS NOT NULL AND persona_id IS NULL) OR
    (user_id IS NULL AND persona_id IS NOT NULL)
  )
);

-- Create indexes for performance
CREATE INDEX idx_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_reactions_user_id ON message_reactions(user_id);
CREATE INDEX idx_reactions_persona_id ON message_reactions(persona_id);
CREATE INDEX idx_reactions_emoji ON message_reactions(emoji);
CREATE INDEX idx_reactions_created_at ON message_reactions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reactions
-- Users can view reactions on messages they can see
CREATE POLICY "View reactions on accessible messages" ON message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = message_reactions.message_id
        AND c.user_id = auth.uid()
    )
  );

-- Users can add their own reactions
CREATE POLICY "Users can add own reactions" ON message_reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = message_reactions.message_id
        AND c.user_id = auth.uid()
    )
  );

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions" ON message_reactions
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- Function to get reaction counts for messages
CREATE OR REPLACE FUNCTION get_message_reaction_counts(p_message_ids UUID[])
RETURNS TABLE(
  message_id UUID,
  emoji TEXT,
  count BIGINT,
  reacted_by_user BOOLEAN,
  user_reactions UUID[],
  persona_reactions UUID[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mr.message_id,
    mr.emoji,
    COUNT(*)::BIGINT as count,
    BOOL_OR(mr.user_id = auth.uid()) as reacted_by_user,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT mr.user_id), NULL) as user_reactions,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT mr.persona_id), NULL) as persona_reactions
  FROM message_reactions mr
  WHERE mr.message_id = ANY(p_message_ids)
  GROUP BY mr.message_id, mr.emoji
  ORDER BY count DESC, mr.emoji;
END;
$$;

-- Function to add persona reactions programmatically
CREATE OR REPLACE FUNCTION add_persona_reaction(
  p_message_id UUID,
  p_persona_id UUID,
  p_emoji TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_reaction_id UUID;
BEGIN
  INSERT INTO message_reactions (message_id, persona_id, emoji)
  VALUES (p_message_id, p_persona_id, p_emoji)
  ON CONFLICT (message_id, persona_id, emoji) DO NOTHING
  RETURNING id INTO v_reaction_id;

  RETURN v_reaction_id;
END;
$$;

-- Function to check for keyword triggers and auto-react
CREATE OR REPLACE FUNCTION check_keyword_reactions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_keywords JSONB := '{
    "amazing": "🤩",
    "awesome": "🎉",
    "great": "👍",
    "excellent": "⭐",
    "perfect": "💯",
    "love": "❤️",
    "haha": "😂",
    "lol": "😄",
    "thanks": "🙏",
    "thank you": "🙏",
    "help": "🤝",
    "question": "❓",
    "confused": "😕",
    "error": "❌",
    "bug": "🐛",
    "fixed": "✅",
    "done": "✔️",
    "idea": "💡",
    "think": "🤔"
  }'::JSONB;
  v_keyword TEXT;
  v_emoji TEXT;
BEGIN
  -- Only check assistant messages for auto-reactions
  IF NEW.role = 'assistant' AND NEW.persona_id IS NOT NULL THEN
    -- Check each keyword
    FOR v_keyword, v_emoji IN SELECT * FROM jsonb_each_text(v_keywords)
    LOOP
      -- Case-insensitive check for keyword in content
      IF LOWER(NEW.content) LIKE '%' || LOWER(v_keyword) || '%' THEN
        -- Add auto-reaction from a random AI persona in the conversation
        -- (In practice, this would be more sophisticated)
        PERFORM add_persona_reaction(NEW.id, NEW.persona_id, v_emoji);
        EXIT; -- Only add one auto-reaction per message
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for keyword reactions
CREATE TRIGGER trigger_keyword_reactions
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION check_keyword_reactions();

-- Add function to get top emojis for quick reactions
CREATE OR REPLACE FUNCTION get_top_reaction_emojis(p_limit INTEGER DEFAULT 5)
RETURNS TABLE(emoji TEXT, total_count BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mr.emoji,
    COUNT(*)::BIGINT as total_count
  FROM message_reactions mr
  GROUP BY mr.emoji
  ORDER BY total_count DESC
  LIMIT p_limit;
END;
$$;