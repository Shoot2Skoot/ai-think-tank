-- Create a function to add personas to a conversation during setup
-- This handles creating persona instances from templates and linking them

CREATE OR REPLACE FUNCTION create_personas_for_conversation(
  p_conversation_id UUID,
  p_persona_configs JSONB
)
RETURNS SETOF personas AS $$
DECLARE
  v_persona_config JSONB;
  v_persona personas;
  v_template personas;
BEGIN
  -- Loop through each persona config
  FOR v_persona_config IN SELECT * FROM jsonb_array_elements(p_persona_configs)
  LOOP
    -- Check if this is based on a template
    IF v_persona_config->>'template_id' IS NOT NULL THEN
      -- Get the template
      SELECT * INTO v_template
      FROM personas
      WHERE id = (v_persona_config->>'template_id')::UUID
        AND is_template = true;

      IF FOUND THEN
        -- Create persona instance from template
        INSERT INTO personas (
          name,
          role,
          model,
          provider,
          system_prompt,
          temperature,
          max_tokens,
          demographics,
          background,
          personality,
          experience_level,
          attitude,
          avatar_url,
          color,
          category,
          description,
          expertise_areas,
          is_template
        ) VALUES (
          COALESCE(v_persona_config->>'name', v_template.name),
          COALESCE(v_persona_config->>'role', v_template.role),
          COALESCE(v_persona_config->>'model', v_template.model),
          COALESCE(v_persona_config->>'provider', v_template.provider),
          COALESCE(v_persona_config->>'system_prompt', v_template.system_prompt),
          COALESCE((v_persona_config->>'temperature')::FLOAT, v_template.temperature),
          COALESCE((v_persona_config->>'max_tokens')::INT, v_template.max_tokens),
          COALESCE(v_persona_config->>'demographics', v_template.demographics),
          COALESCE(v_persona_config->>'background', v_template.background),
          COALESCE(v_persona_config->>'personality', v_template.personality),
          COALESCE(v_persona_config->>'experience_level', v_template.experience_level),
          COALESCE(v_persona_config->>'attitude', v_template.attitude),
          v_template.avatar_url,
          v_template.color,
          v_template.category,
          v_template.description,
          v_template.expertise_areas,
          false  -- This is an instance, not a template
        )
        RETURNING * INTO v_persona;
      END IF;
    ELSE
      -- Create custom persona
      INSERT INTO personas (
        name,
        role,
        model,
        provider,
        system_prompt,
        temperature,
        max_tokens,
        demographics,
        background,
        personality,
        experience_level,
        attitude,
        is_template
      ) VALUES (
        v_persona_config->>'name',
        v_persona_config->>'role',
        v_persona_config->>'model',
        v_persona_config->>'provider',
        v_persona_config->>'system_prompt',
        COALESCE((v_persona_config->>'temperature')::FLOAT, 0.7),
        COALESCE((v_persona_config->>'max_tokens')::INT, 1000),
        v_persona_config->>'demographics',
        v_persona_config->>'background',
        v_persona_config->>'personality',
        v_persona_config->>'experience_level',
        v_persona_config->>'attitude',
        false  -- This is an instance, not a template
      )
      RETURNING * INTO v_persona;
    END IF;

    -- Link persona to conversation
    INSERT INTO conversation_personas (conversation_id, persona_id)
    VALUES (p_conversation_id, v_persona.id);

    RETURN NEXT v_persona;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_personas_for_conversation(UUID, JSONB) TO authenticated;