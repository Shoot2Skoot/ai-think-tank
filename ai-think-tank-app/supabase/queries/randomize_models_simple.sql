-- Simple query to randomly assign models to personas
-- This version doesn't use procedures and can be run directly

-- First, let's see current distribution
SELECT provider, model, COUNT(*) as count
FROM personas
WHERE is_template = true
GROUP BY provider, model
ORDER BY provider, model;

-- Create random assignments using a CTE with all models
WITH model_pool AS (
  SELECT 'anthropic' as provider, 'claude-opus-4-1-20250805' as model
  UNION ALL SELECT 'anthropic', 'claude-opus-4-20250514'
  UNION ALL SELECT 'anthropic', 'claude-sonnet-4-20250514'
  UNION ALL SELECT 'anthropic', 'claude-3-7-sonnet-20250219'
  UNION ALL SELECT 'gemini', 'gemini-2.5-pro'
  UNION ALL SELECT 'gemini', 'gemini-2.5-flash'
  UNION ALL SELECT 'gemini', 'gemini-2.5-flash-lite'
  UNION ALL SELECT 'openai', 'gpt-5'
  UNION ALL SELECT 'openai', 'gpt-5-mini'
  UNION ALL SELECT 'openai', 'gpt-5-nano'
  UNION ALL SELECT 'openai', 'gpt-4.1'
  UNION ALL SELECT 'openai', 'gpt-4.1-mini'
  UNION ALL SELECT 'openai', 'gpt-4.1-nano'
  UNION ALL SELECT 'openai', 'o4-mini'
  UNION ALL SELECT 'openai', 'o3'
),
-- Assign a random model to each persona
persona_assignments AS (
  SELECT
    p.id,
    p.name,
    p.role,
    p.experience_level,
    -- Select a random model for each persona
    (SELECT provider FROM model_pool ORDER BY RANDOM() LIMIT 1) as new_provider,
    (SELECT model FROM model_pool WHERE provider = (SELECT provider FROM model_pool ORDER BY RANDOM() LIMIT 1) ORDER BY RANDOM() LIMIT 1) as new_model
  FROM personas p
  WHERE p.is_template = true
)
-- Update each persona with its random assignment
UPDATE personas
SET
  provider = CASE
    WHEN id = 'replace-with-actual-id' THEN 'provider-value'
    -- We'll generate these cases dynamically
  END,
  model = CASE
    WHEN id = 'replace-with-actual-id' THEN 'model-value'
    -- We'll generate these cases dynamically
  END,
  temperature = ROUND((0.3 + RANDOM() * 0.6)::numeric, 2),
  max_tokens = FLOOR(500 + RANDOM() * 1500)::INT,
  updated_at = NOW()
WHERE is_template = true;

-- Alternative: Update in batches by category
-- This gives more control over distribution

-- Technical roles get more powerful models
UPDATE personas
SET
  provider = CASE
    WHEN RANDOM() < 0.4 THEN 'anthropic'
    WHEN RANDOM() < 0.7 THEN 'openai'
    ELSE 'gemini'
  END,
  model = CASE
    WHEN provider = 'anthropic' AND RANDOM() < 0.5 THEN 'claude-opus-4-1-20250805'
    WHEN provider = 'anthropic' THEN 'claude-sonnet-4-20250514'
    WHEN provider = 'openai' AND RANDOM() < 0.3 THEN 'gpt-5'
    WHEN provider = 'openai' AND RANDOM() < 0.6 THEN 'gpt-4.1'
    WHEN provider = 'openai' THEN 'gpt-5-mini'
    WHEN provider = 'gemini' AND RANDOM() < 0.5 THEN 'gemini-2.5-pro'
    ELSE 'gemini-2.5-flash'
  END,
  temperature = ROUND((0.5 + RANDOM() * 0.4)::numeric, 2),
  max_tokens = FLOOR(800 + RANDOM() * 1200)::INT,
  updated_at = NOW()
WHERE is_template = true
  AND (role ILIKE '%engineer%' OR role ILIKE '%developer%' OR role ILIKE '%architect%');

-- Creative roles get more varied models with higher temperature
UPDATE personas
SET
  provider = CASE
    WHEN RANDOM() < 0.35 THEN 'anthropic'
    WHEN RANDOM() < 0.7 THEN 'openai'
    ELSE 'gemini'
  END,
  model = CASE
    WHEN provider = 'anthropic' THEN 'claude-3-7-sonnet-20250219'
    WHEN provider = 'openai' AND RANDOM() < 0.5 THEN 'gpt-5-mini'
    WHEN provider = 'openai' THEN 'gpt-4.1-mini'
    WHEN provider = 'gemini' THEN 'gemini-2.5-flash'
    ELSE model
  END,
  temperature = ROUND((0.6 + RANDOM() * 0.3)::numeric, 2),
  max_tokens = FLOOR(600 + RANDOM() * 900)::INT,
  updated_at = NOW()
WHERE is_template = true
  AND (role ILIKE '%designer%' OR role ILIKE '%artist%' OR role ILIKE '%writer%');

-- Business/Professional roles get balanced models
UPDATE personas
SET
  provider = CASE
    WHEN RANDOM() < 0.33 THEN 'anthropic'
    WHEN RANDOM() < 0.66 THEN 'openai'
    ELSE 'gemini'
  END,
  model = CASE
    WHEN provider = 'anthropic' THEN 'claude-sonnet-4-20250514'
    WHEN provider = 'openai' AND RANDOM() < 0.5 THEN 'gpt-4.1'
    WHEN provider = 'openai' THEN 'gpt-4.1-mini'
    WHEN provider = 'gemini' THEN 'gemini-2.5-pro'
    ELSE model
  END,
  temperature = ROUND((0.4 + RANDOM() * 0.4)::numeric, 2),
  max_tokens = FLOOR(700 + RANDOM() * 800)::INT,
  updated_at = NOW()
WHERE is_template = true
  AND (role ILIKE '%manager%' OR role ILIKE '%analyst%' OR role ILIKE '%consultant%');

-- Students/Entry-level get cost-effective models
UPDATE personas
SET
  provider = CASE
    WHEN RANDOM() < 0.25 THEN 'anthropic'
    WHEN RANDOM() < 0.5 THEN 'openai'
    ELSE 'gemini'
  END,
  model = CASE
    WHEN provider = 'anthropic' THEN 'claude-3-7-sonnet-20250219'
    WHEN provider = 'openai' AND RANDOM() < 0.5 THEN 'gpt-5-nano'
    WHEN provider = 'openai' THEN 'gpt-4.1-nano'
    WHEN provider = 'gemini' AND RANDOM() < 0.5 THEN 'gemini-2.5-flash-lite'
    ELSE 'gemini-2.5-flash'
  END,
  temperature = ROUND((0.5 + RANDOM() * 0.3)::numeric, 2),
  max_tokens = FLOOR(500 + RANDOM() * 500)::INT,
  updated_at = NOW()
WHERE is_template = true
  AND (experience_level IN ('student', 'junior') OR role ILIKE '%student%' OR role ILIKE '%intern%');

-- Handle any remaining personas with a general distribution
UPDATE personas
SET
  provider = CASE
    WHEN RANDOM() < 0.33 THEN 'anthropic'
    WHEN RANDOM() < 0.66 THEN 'openai'
    ELSE 'gemini'
  END,
  model = CASE
    WHEN provider = 'anthropic' AND RANDOM() < 0.5 THEN 'claude-sonnet-4-20250514'
    WHEN provider = 'anthropic' THEN 'claude-3-7-sonnet-20250219'
    WHEN provider = 'openai' AND RANDOM() < 0.3 THEN 'gpt-5-mini'
    WHEN provider = 'openai' AND RANDOM() < 0.6 THEN 'gpt-4.1-mini'
    WHEN provider = 'openai' THEN 'gpt-5-nano'
    WHEN provider = 'gemini' AND RANDOM() < 0.5 THEN 'gemini-2.5-flash'
    ELSE 'gemini-2.5-flash-lite'
  END,
  temperature = ROUND((0.4 + RANDOM() * 0.5)::numeric, 2),
  max_tokens = FLOOR(600 + RANDOM() * 900)::INT,
  updated_at = NOW()
WHERE is_template = true
  AND model IS NULL; -- Only update if not already set by previous queries

-- Show final distribution
SELECT
  provider,
  model,
  COUNT(*) as persona_count,
  STRING_AGG(DISTINCT SUBSTRING(role FROM 1 FOR 20), ', ') as sample_roles,
  ROUND(AVG(temperature)::numeric, 2) as avg_temperature,
  ROUND(AVG(max_tokens)::numeric, 0) as avg_max_tokens
FROM personas
WHERE is_template = true
GROUP BY provider, model
ORDER BY provider, model;