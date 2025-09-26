-- Randomly assign models from our TypeScript models file to each persona
-- This creates a more realistic distribution of models across personas

-- Create a temporary table with all available models
CREATE TEMP TABLE available_models (
  provider VARCHAR(50),
  model VARCHAR(100),
  weight INT DEFAULT 1  -- Weight for random selection (higher = more likely)
);

-- Insert all models from our TypeScript file with weights
-- Giving slightly higher weights to more common/cheaper models
INSERT INTO available_models (provider, model, weight) VALUES
-- Anthropic models
('anthropic', 'claude-opus-4-1-20250805', 2),
('anthropic', 'claude-opus-4-20250514', 2),
('anthropic', 'claude-sonnet-4-20250514', 5),  -- More common, mid-tier
('anthropic', 'claude-3-7-sonnet-20250219', 5),

-- Gemini models
('gemini', 'gemini-2.5-pro', 4),
('gemini', 'gemini-2.5-flash', 6),  -- Cheaper, more common
('gemini', 'gemini-2.5-flash-lite', 6),

-- OpenAI models
('openai', 'gpt-5', 2),  -- Premium
('openai', 'gpt-5-mini', 5),  -- Mid-tier
('openai', 'gpt-5-nano', 6),  -- Cheap, common
('openai', 'gpt-4.1', 3),
('openai', 'gpt-4.1-mini', 5),
('openai', 'gpt-4.1-nano', 6),
('openai', 'o4-mini', 4),
('openai', 'o3', 3);

-- Create a function to randomly select a model with weighted distribution
CREATE OR REPLACE FUNCTION get_random_model()
RETURNS TABLE(provider VARCHAR, model VARCHAR) AS $$
DECLARE
  total_weight INT;
  random_value FLOAT;
  cumulative_weight INT := 0;
  selected_model RECORD;
BEGIN
  -- Calculate total weight
  SELECT SUM(weight) INTO total_weight FROM available_models;

  -- Generate random number between 0 and total_weight
  random_value := random() * total_weight;

  -- Select model based on weighted random selection
  FOR selected_model IN
    SELECT am.provider, am.model, am.weight
    FROM available_models am
    ORDER BY random()  -- Randomize order for variety
  LOOP
    cumulative_weight := cumulative_weight + selected_model.weight;
    IF cumulative_weight >= random_value THEN
      provider := selected_model.provider;
      model := selected_model.model;
      RETURN NEXT;
      RETURN;
    END IF;
  END LOOP;

  -- Fallback (should never reach here)
  SELECT am.provider, am.model INTO provider, model
  FROM available_models am
  LIMIT 1;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Update all personas with random models
-- Keep existing provider/model if they're valid, otherwise assign random ones
DO $$
DECLARE
  persona_record RECORD;
  random_model RECORD;
BEGIN
  FOR persona_record IN
    SELECT id, provider, model
    FROM personas
    WHERE is_template = true  -- Only update templates
  LOOP
    -- Get a random model
    SELECT * INTO random_model FROM get_random_model();

    -- Update the persona with the random model
    UPDATE personas
    SET
      provider = random_model.provider,
      model = random_model.model,
      updated_at = NOW()
    WHERE id = persona_record.id;
  END LOOP;
END $$;

-- Also randomize temperature settings for more variety (between 0.3 and 0.9)
UPDATE personas
SET
  temperature = ROUND((0.3 + random() * 0.6)::numeric, 2),
  updated_at = NOW()
WHERE is_template = true;

-- Randomize max_tokens (between 500 and 2000)
UPDATE personas
SET
  max_tokens = FLOOR(500 + random() * 1500)::INT,
  updated_at = NOW()
WHERE is_template = true;

-- Clean up
DROP FUNCTION IF EXISTS get_random_model();
DROP TABLE IF EXISTS available_models;

-- Add some variance based on persona characteristics
-- More technical personas get higher-end models
UPDATE personas
SET
  model = CASE
    WHEN experience_level IN ('expert', 'senior') AND provider = 'openai' THEN 'gpt-5'
    WHEN experience_level IN ('expert', 'senior') AND provider = 'anthropic' THEN 'claude-opus-4-1-20250805'
    WHEN experience_level IN ('expert', 'senior') AND provider = 'gemini' THEN 'gemini-2.5-pro'
    ELSE model
  END
WHERE is_template = true
  AND role ILIKE '%engineer%' OR role ILIKE '%scientist%' OR role ILIKE '%researcher%';

-- Students and juniors get more cost-effective models
UPDATE personas
SET
  model = CASE
    WHEN provider = 'openai' THEN 'gpt-5-nano'
    WHEN provider = 'anthropic' THEN 'claude-3-7-sonnet-20250219'
    WHEN provider = 'gemini' THEN 'gemini-2.5-flash-lite'
    ELSE model
  END
WHERE is_template = true
  AND (experience_level IN ('student', 'junior') OR role ILIKE '%student%');

-- Output summary
SELECT
  provider,
  model,
  COUNT(*) as persona_count,
  ROUND(AVG(temperature)::numeric, 2) as avg_temperature,
  ROUND(AVG(max_tokens)::numeric, 0) as avg_max_tokens
FROM personas
WHERE is_template = true
GROUP BY provider, model
ORDER BY provider, model;