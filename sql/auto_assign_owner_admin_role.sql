-- Auto-assign admin role to settlement owners and cleanup stale data
-- Run this in the Supabase SQL editor

-- ============================================
-- PART 1: Updated sync_user_settlement_roles function
-- Now handles:
-- - Adding new settlement roles
-- - Assigning admin role to owners
-- - REMOVING stale settlement roles not in API response
-- ============================================

DROP FUNCTION IF EXISTS public.sync_user_settlement_roles(UUID, TEXT[], TEXT, TEXT[]);
DROP FUNCTION IF EXISTS public.sync_user_settlement_roles(UUID, TEXT[], TEXT, TEXT[], BOOLEAN);

CREATE OR REPLACE FUNCTION public.sync_user_settlement_roles(
  p_user_id UUID,
  p_settlement_ids TEXT[],
  p_in_game_name TEXT,
  p_owner_settlement_ids TEXT[] DEFAULT '{}'::TEXT[],
  p_remove_stale BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  settlement_id TEXT,
  created BOOLEAN,
  updated BOOLEAN,
  removed BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_settlement_id TEXT;
  v_admin_role_id UUID;
  v_employee_role_id UUID;
  v_existing_role_id UUID;
  v_is_owner BOOLEAN;
  v_created BOOLEAN;
  v_updated BOOLEAN;
  v_stale_settlement_id TEXT;
BEGIN
  -- Get the admin role ID (for owners)
  SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'admin' LIMIT 1;

  -- Get the employee role ID (default for non-owners)
  SELECT id INTO v_employee_role_id FROM public.roles WHERE name = 'employee' LIMIT 1;

  -- If p_remove_stale is true, remove settlement_roles not in the API response
  IF p_remove_stale THEN
    FOR v_stale_settlement_id IN
      SELECT sr.settlement_id
      FROM public.settlement_roles sr
      WHERE sr.profile_id = p_user_id
      AND NOT (sr.settlement_id = ANY(p_settlement_ids))
    LOOP
      DELETE FROM public.settlement_roles
      WHERE profile_id = p_user_id AND settlement_roles.settlement_id = v_stale_settlement_id;

      RETURN QUERY SELECT v_stale_settlement_id, FALSE, FALSE, TRUE, NULL::TEXT;
    END LOOP;
  END IF;

  -- Loop through each settlement from API
  FOREACH v_settlement_id IN ARRAY p_settlement_ids
  LOOP
    v_created := FALSE;
    v_updated := FALSE;

    -- Check if this settlement is one where the user is an owner
    v_is_owner := v_settlement_id = ANY(p_owner_settlement_ids);

    -- Check if a settlement_roles entry already exists
    SELECT role_id INTO v_existing_role_id
    FROM public.settlement_roles
    WHERE profile_id = p_user_id AND settlement_roles.settlement_id = v_settlement_id;

    IF v_existing_role_id IS NULL THEN
      -- No entry exists - create one
      -- Assign admin role if owner, otherwise employee
      INSERT INTO public.settlement_roles (profile_id, role_id, settlement_id, in_game_name)
      VALUES (
        p_user_id,
        CASE WHEN v_is_owner THEN v_admin_role_id ELSE v_employee_role_id END,
        v_settlement_id,
        p_in_game_name
      );
      v_created := TRUE;

    ELSIF v_is_owner AND v_existing_role_id != v_admin_role_id THEN
      -- Entry exists but user is owner and doesn't have admin role
      -- Upgrade them to admin
      UPDATE public.settlement_roles
      SET role_id = v_admin_role_id,
          in_game_name = p_in_game_name
      WHERE profile_id = p_user_id AND settlement_roles.settlement_id = v_settlement_id;
      v_updated := TRUE;

    ELSE
      -- Entry exists, just update in_game_name if needed
      UPDATE public.settlement_roles
      SET in_game_name = p_in_game_name
      WHERE profile_id = p_user_id AND settlement_roles.settlement_id = v_settlement_id;
    END IF;

    RETURN QUERY SELECT v_settlement_id, v_created, v_updated, FALSE, NULL::TEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- PART 2: Cleanup function for orphaned settlements
-- Removes settlements from the database where:
-- - No users are affiliated (no entries in settlement_roles)
-- - Settlement name matches placeholder pattern "Settlement {number}"
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_settlements()
RETURNS TABLE (
  settlement_id TEXT,
  settlement_name TEXT,
  reason TEXT
) AS $$
BEGIN
  -- Return and delete settlements with placeholder names
  RETURN QUERY
  WITH deleted_placeholder AS (
    DELETE FROM public.settlements s
    WHERE s.settlement_name ~ '^Settlement [0-9]+$'
    RETURNING s.settlement_id, s.settlement_name
  )
  SELECT
    d.settlement_id,
    d.settlement_name,
    'Placeholder name' as reason
  FROM deleted_placeholder d;

  -- Return and delete settlements with no users affiliated
  RETURN QUERY
  WITH deleted_orphaned AS (
    DELETE FROM public.settlements s
    WHERE NOT EXISTS (
      SELECT 1 FROM public.settlement_roles sr
      WHERE sr.settlement_id = s.settlement_id
    )
    RETURNING s.settlement_id, s.settlement_name
  )
  SELECT
    d.settlement_id,
    d.settlement_name,
    'No users affiliated' as reason
  FROM deleted_orphaned d;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- PART 3: Preview orphaned settlements (DRY RUN)
-- Run this first to see what would be deleted
-- ============================================

-- Preview placeholder-named settlements:
/*
SELECT settlement_id, settlement_name, 'Placeholder name' as reason
FROM public.settlements
WHERE settlement_name ~ '^Settlement [0-9]+$';
*/

-- Preview settlements with no users affiliated:
/*
SELECT s.settlement_id, s.settlement_name, 'No users affiliated' as reason
FROM public.settlements s
WHERE NOT EXISTS (
  SELECT 1 FROM public.settlement_roles sr
  WHERE sr.settlement_id = s.settlement_id
);
*/


-- ============================================
-- PART 4: Manual cleanup queries
-- Use these if you want more control
-- ============================================

-- Delete all placeholder-named settlements:
/*
DELETE FROM public.settlements
WHERE settlement_name ~ '^Settlement [0-9]+$';
*/

-- Delete settlements with no affiliated users:
/*
DELETE FROM public.settlements s
WHERE NOT EXISTS (
  SELECT 1 FROM public.settlement_roles sr
  WHERE sr.settlement_id = s.settlement_id
);
*/

-- Delete specific settlement by ID:
/*
DELETE FROM public.settlements WHERE settlement_id = 'YOUR_SETTLEMENT_ID';
DELETE FROM public.settlement_roles WHERE settlement_id = 'YOUR_SETTLEMENT_ID';
*/


-- ============================================
-- PART 5: Fix existing owners with no/wrong role
-- ============================================

-- Assign admin to all users with NULL role_id:
/*
UPDATE public.settlement_roles
SET role_id = (SELECT id FROM public.roles WHERE name = 'admin')
WHERE role_id IS NULL;
*/

-- Or assign employee role (safer default):
/*
UPDATE public.settlement_roles
SET role_id = (SELECT id FROM public.roles WHERE name = 'employee')
WHERE role_id IS NULL;
*/
