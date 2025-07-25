-- Migration Script: Remove bitjita_entity_id column
-- Run this in your Supabase SQL Editor
-- =============================================

-- Step 1: First, copy any data from bitjita_entity_id to bitjita_user_id if needed
UPDATE public.user_profiles 
SET bitjita_user_id = bitjita_entity_id 
WHERE bitjita_user_id IS NULL AND bitjita_entity_id IS NOT NULL;

-- Step 2: Remove the bitjita_entity_id column
ALTER TABLE public.user_profiles 
DROP COLUMN IF EXISTS bitjita_entity_id;

-- Step 3: Update the handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id UUID;
    user_in_game_name TEXT;
    user_empire TEXT;
    user_bitjita_user_id TEXT;
    user_bitjita_empire_id TEXT;
BEGIN
    -- Get the default role ID for 'User'
    SELECT id INTO default_role_id FROM public.roles WHERE role_name = 'User' LIMIT 1;
    
    -- Extract metadata from the new user
    user_in_game_name := NEW.raw_user_meta_data->>'in_game_name';
    user_empire := NEW.raw_user_meta_data->>'empire';
    user_bitjita_user_id := NEW.raw_user_meta_data->>'bitjita_user_id';
    user_bitjita_empire_id := NEW.raw_user_meta_data->>'bitjita_empire_id';
    
    -- Insert the new user profile (without bitjita_entity_id)
    INSERT INTO public.user_profiles (id, email, role_id, in_game_name, empire, bitjita_user_id, bitjita_empire_id)
    VALUES (NEW.id, NEW.email, default_role_id, user_in_game_name, user_empire, user_bitjita_user_id, user_bitjita_empire_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Update the update_user_profile_from_auth function
CREATE OR REPLACE FUNCTION public.update_user_profile_from_auth(
    user_email TEXT,
    user_in_game_name TEXT DEFAULT NULL,
    user_empire TEXT DEFAULT NULL,
    user_bitjita_user_id TEXT DEFAULT NULL,
    user_bitjita_empire_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.user_profiles 
    SET 
        in_game_name = COALESCE(user_in_game_name, in_game_name),
        empire = COALESCE(user_empire, empire),
        bitjita_user_id = COALESCE(user_bitjita_user_id, bitjita_user_id),
        bitjita_empire_id = COALESCE(user_bitjita_empire_id, bitjita_empire_id),
        updated_at = NOW()
    WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Update the complete_user_signup function (if it exists)
CREATE OR REPLACE FUNCTION public.complete_user_signup(
    user_id UUID,
    user_email TEXT,
    user_in_game_name TEXT DEFAULT NULL,
    user_empire TEXT DEFAULT NULL,
    user_bitjita_user_id TEXT DEFAULT NULL,
    user_bitjita_empire_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
    -- Update the user profile with the provided data
    UPDATE public.user_profiles 
    SET 
        in_game_name = COALESCE(user_in_game_name, in_game_name),
        empire = COALESCE(user_empire, empire),
        bitjita_user_id = COALESCE(user_bitjita_user_id, bitjita_user_id),
        bitjita_empire_id = COALESCE(user_bitjita_empire_id, bitjita_empire_id),
        updated_at = NOW()
    WHERE id = user_id AND email = user_email;
    
    -- Return success
    RETURN json_build_object(
        'success', true,
        'message', 'User profile completed successfully'
    );
EXCEPTION 
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
AND column_name LIKE '%bitjita%'
ORDER BY column_name;
