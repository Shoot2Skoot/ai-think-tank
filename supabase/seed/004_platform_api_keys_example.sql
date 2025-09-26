-- Example script for adding platform API keys
-- IMPORTANT: Replace the placeholder values with your actual encrypted API keys
--
-- For production, you should:
-- 1. Use Supabase Vault to encrypt the keys
-- 2. Or use a separate encryption service
-- 3. Never store plain text API keys in the database

-- Example using Supabase Vault (recommended approach):
-- First enable the pgsodium extension in Supabase dashboard
-- Then use the following pattern:

/*
-- Enable encryption extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Insert encrypted API keys
INSERT INTO platform_api_keys (
  provider,
  encrypted_key,
  tier,
  rate_limit_rpm,
  rate_limit_tpm,
  is_active
) VALUES
(
  'openai',
  pgsodium.crypto_aead_det_encrypt(
    'your-actual-openai-api-key-here'::bytea,
    'platform_api_keys'::bytea, -- additional data for context
    (SELECT key_id FROM pgsodium.valid_key WHERE name = 'default') -- use default key
  ),
  'free',
  60,
  100000,
  true
),
(
  'anthropic',
  pgsodium.crypto_aead_det_encrypt(
    'your-actual-anthropic-api-key-here'::bytea,
    'platform_api_keys'::bytea,
    (SELECT key_id FROM pgsodium.valid_key WHERE name = 'default')
  ),
  'free',
  60,
  100000,
  true
),
(
  'gemini',
  pgsodium.crypto_aead_det_encrypt(
    'your-actual-gemini-api-key-here'::bytea,
    'platform_api_keys'::bytea,
    (SELECT key_id FROM pgsodium.valid_key WHERE name = 'default')
  ),
  'free',
  60,
  100000,
  true
);
*/

-- Alternative: Manual encryption approach (less secure, for development only)
-- You would encrypt the keys in your application and store them here
-- This is just a placeholder structure:

INSERT INTO platform_api_keys (
  provider,
  encrypted_key,
  tier,
  rate_limit_rpm,
  rate_limit_tpm,
  is_active
) VALUES
(
  'openai',
  'ENCRYPTED_OPENAI_KEY_PLACEHOLDER', -- Replace with actual encrypted key
  'free',
  60,
  100000,
  true
),
(
  'anthropic',
  'ENCRYPTED_ANTHROPIC_KEY_PLACEHOLDER', -- Replace with actual encrypted key
  'free',
  60,
  100000,
  true
),
(
  'gemini',
  'ENCRYPTED_GEMINI_KEY_PLACEHOLDER', -- Replace with actual encrypted key
  'free',
  60,
  100000,
  true
);

-- To decrypt keys in your application (using Supabase Vault):
/*
-- Create a function to safely decrypt keys (only accessible by service role)
CREATE OR REPLACE FUNCTION decrypt_platform_key(provider_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encrypted_val bytea;
  decrypted_key text;
BEGIN
  -- Check if user has appropriate permissions
  -- In production, add more security checks here

  SELECT encrypted_key::bytea INTO encrypted_val
  FROM platform_api_keys
  WHERE provider = provider_name
    AND is_active = true
  LIMIT 1;

  IF encrypted_val IS NULL THEN
    RETURN NULL;
  END IF;

  -- Decrypt the key
  decrypted_key := convert_from(
    pgsodium.crypto_aead_det_decrypt(
      encrypted_val,
      'platform_api_keys'::bytea,
      (SELECT key_id FROM pgsodium.valid_key WHERE name = 'default')
    ),
    'utf8'
  );

  RETURN decrypted_key;
END;
$$;

-- Grant execute permission only to service role
REVOKE ALL ON FUNCTION decrypt_platform_key FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decrypt_platform_key TO service_role;
*/

-- For development with mock providers:
-- If VITE_USE_MOCK_PROVIDERS=true, these keys won't be used
-- The application will use the MockLangChainProvider instead

-- Rate limits by tier:
-- Free tier: 60 requests/minute, 100K tokens/minute
-- Pro tier: 300 requests/minute, 500K tokens/minute
-- Enterprise tier: 1000 requests/minute, 2M tokens/minute

-- You can update tiers and rate limits as needed:
/*
UPDATE platform_api_keys
SET
  tier = 'pro',
  rate_limit_rpm = 300,
  rate_limit_tpm = 500000
WHERE provider = 'openai';
*/