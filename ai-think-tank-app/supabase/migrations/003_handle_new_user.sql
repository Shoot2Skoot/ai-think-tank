-- Migration to update handle_new_user function for our schema
-- This ensures new users automatically get their preferences and budgets set up

-- Drop the existing function if it exists (we'll recreate it)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create the updated handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user preferences with defaults
  INSERT INTO public.user_preferences (
    user_id,
    data_retention,
    allow_analytics,
    delete_after_days
  )
  VALUES (
    NEW.id,
    'session',  -- Default to session-only retention
    false,      -- Analytics off by default for privacy
    30          -- Delete data after 30 days
  )
  ON CONFLICT (user_id) DO NOTHING;  -- Prevent errors if preferences already exist

  -- Create user budget with sensible defaults
  INSERT INTO public.user_budgets (
    user_id,
    monthly_limit,
    daily_limit,
    warning_threshold,
    auto_stop,
    current_monthly_spend,
    current_daily_spend,
    reset_day
  )
  VALUES (
    NEW.id,
    10.00,     -- $10/month default limit
    1.00,      -- $1/day default limit
    8.00,      -- Warning at $8 (80% of monthly)
    true,      -- Auto-stop enabled for safety
    0.00,      -- Start with zero spend
    0.00,      -- Start with zero daily spend
    1          -- Reset on 1st of each month
  )
  ON CONFLICT (user_id) DO NOTHING;  -- Prevent errors if budget already exists

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists on the auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Verify the function and trigger are set up correctly
DO $$
BEGIN
  RAISE NOTICE 'handle_new_user function and trigger created successfully';

  -- Check if there are existing users without preferences/budgets
  -- and create them retroactively
  INSERT INTO public.user_preferences (
    user_id,
    data_retention,
    allow_analytics,
    delete_after_days
  )
  SELECT
    id,
    'session',
    false,
    30
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_preferences p WHERE p.user_id = u.id
  );

  INSERT INTO public.user_budgets (
    user_id,
    monthly_limit,
    daily_limit,
    warning_threshold,
    auto_stop,
    current_monthly_spend,
    current_daily_spend,
    reset_day
  )
  SELECT
    id,
    10.00,
    1.00,
    8.00,
    true,
    0.00,
    0.00,
    1
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_budgets b WHERE b.user_id = u.id
  );

  RAISE NOTICE 'Retroactively created preferences and budgets for existing users';
END $$;

-- Test query to verify everything is set up
-- (You can run this separately to check)
/*
SELECT
  'Users' as table_name,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT
  'User Preferences' as table_name,
  COUNT(*) as count
FROM public.user_preferences
UNION ALL
SELECT
  'User Budgets' as table_name,
  COUNT(*) as count
FROM public.user_budgets;
*/