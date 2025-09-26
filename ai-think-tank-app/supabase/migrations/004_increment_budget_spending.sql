-- Database function to atomically increment budget spending
-- This ensures accurate tracking even with concurrent requests

CREATE OR REPLACE FUNCTION increment_budget_spending(
  p_user_id UUID,
  p_amount DECIMAL
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update both daily and monthly spending atomically
  UPDATE user_budgets
  SET
    current_daily_spend = current_daily_spend + p_amount,
    current_monthly_spend = current_monthly_spend + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- If no budget exists, create one with defaults
  IF NOT FOUND THEN
    INSERT INTO user_budgets (
      user_id,
      monthly_limit,
      daily_limit,
      warning_threshold,
      auto_stop,
      current_monthly_spend,
      current_daily_spend,
      reset_day
    ) VALUES (
      p_user_id,
      10.00,  -- Default $10/month
      1.00,   -- Default $1/day
      8.00,   -- Default warning at $8
      true,   -- Auto-stop enabled by default
      p_amount,
      p_amount,
      1       -- Reset on 1st of month
    );
  END IF;

  -- Check if we need to create budget alerts
  DECLARE
    v_budget user_budgets%ROWTYPE;
  BEGIN
    SELECT * INTO v_budget FROM user_budgets WHERE user_id = p_user_id;

    -- Check daily limit
    IF v_budget.current_daily_spend >= v_budget.daily_limit THEN
      INSERT INTO budget_alerts (
        user_id,
        alert_type,
        message,
        threshold_value,
        current_value
      ) VALUES (
        p_user_id,
        'limit_reached',
        'Daily spending limit reached',
        v_budget.daily_limit,
        v_budget.current_daily_spend
      ) ON CONFLICT DO NOTHING;
    ELSIF v_budget.current_daily_spend >= v_budget.daily_limit * 0.8 THEN
      INSERT INTO budget_alerts (
        user_id,
        alert_type,
        message,
        threshold_value,
        current_value
      ) VALUES (
        p_user_id,
        'warning',
        'Approaching daily spending limit (80%)',
        v_budget.daily_limit * 0.8,
        v_budget.current_daily_spend
      ) ON CONFLICT DO NOTHING;
    END IF;

    -- Check monthly limit
    IF v_budget.current_monthly_spend >= v_budget.monthly_limit THEN
      INSERT INTO budget_alerts (
        user_id,
        alert_type,
        message,
        threshold_value,
        current_value
      ) VALUES (
        p_user_id,
        'limit_reached',
        'Monthly spending limit reached',
        v_budget.monthly_limit,
        v_budget.current_monthly_spend
      ) ON CONFLICT DO NOTHING;
    ELSIF v_budget.current_monthly_spend >= v_budget.warning_threshold THEN
      INSERT INTO budget_alerts (
        user_id,
        alert_type,
        message,
        threshold_value,
        current_value
      ) VALUES (
        p_user_id,
        'warning',
        'Monthly spending has reached warning threshold',
        v_budget.warning_threshold,
        v_budget.current_monthly_spend
      ) ON CONFLICT DO NOTHING;
    END IF;
  END;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION increment_budget_spending TO service_role;

-- Create a scheduled function to reset daily spending at midnight
CREATE OR REPLACE FUNCTION reset_daily_spending() RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE user_budgets
  SET
    current_daily_spend = 0,
    updated_at = NOW();
END;
$$;

-- Create a scheduled function to reset monthly spending
CREATE OR REPLACE FUNCTION reset_monthly_spending() RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE user_budgets
  SET
    current_monthly_spend = 0,
    updated_at = NOW()
  WHERE EXTRACT(DAY FROM NOW()) = reset_day;
END;
$$;

-- Note: You'll need to set up cron jobs in Supabase to call these functions:
-- Daily reset: Run reset_daily_spending() at midnight
-- Monthly reset: Run reset_monthly_spending() daily (it checks if it's the reset day)