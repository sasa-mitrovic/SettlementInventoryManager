-- Add empire and bitjita_entity_id fields to user_profiles table
-- This migration adds support for storing player empire information and Bitjita API entity ID

-- Add empire field to store player's empire name
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS empire VARCHAR(200);

-- Add bitjita_entity_id field to store the Bitjita API entity ID for the player
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS bitjita_entity_id VARCHAR(100);

-- Add bitjita_user_id field to store the Bitjita API user ID
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS bitjita_user_id VARCHAR(100);

-- Add bitjita_empire_id field to store the Bitjita API empire ID
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS bitjita_empire_id VARCHAR(100);

-- Add comment to document the new columns
COMMENT ON COLUMN public.user_profiles.empire IS 'Player empire name from Bitjita API empireMemberships';
COMMENT ON COLUMN public.user_profiles.bitjita_entity_id IS 'Bitjita API entity ID for player validation and lookups';
COMMENT ON COLUMN public.user_profiles.bitjita_user_id IS 'Bitjita API user ID associated with the player';
COMMENT ON COLUMN public.user_profiles.bitjita_empire_id IS 'Bitjita API empire ID associated with the player empire';

-- Update the handle_new_user function to include the new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id UUID;
    user_in_game_name TEXT;
    user_empire TEXT;
    user_bitjita_entity_id TEXT;
    user_bitjita_user_id TEXT;
    user_bitjita_empire_id TEXT;
BEGIN
    -- Get the default role (employee)
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'employee' LIMIT 1;
    
    -- Extract fields from auth metadata
    user_in_game_name := NEW.raw_user_meta_data->>'in_game_name';
    user_empire := NEW.raw_user_meta_data->>'empire';
    user_bitjita_entity_id := NEW.raw_user_meta_data->>'bitjita_entity_id';
    user_bitjita_user_id := NEW.raw_user_meta_data->>'bitjita_user_id';
    user_bitjita_empire_id := NEW.raw_user_meta_data->>'bitjita_empire_id';
    
    -- Insert user profile with all fields
    INSERT INTO public.user_profiles (id, email, role_id, in_game_name, empire, bitjita_entity_id, bitjita_user_id, bitjita_empire_id)
    VALUES (NEW.id, NEW.email, default_role_id, user_in_game_name, user_empire, user_bitjita_entity_id, user_bitjita_user_id, user_bitjita_empire_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or update the complete_user_signup function to handle the new fields
CREATE OR REPLACE FUNCTION public.complete_user_signup(
    user_id UUID,
    user_email TEXT,
    user_in_game_name TEXT,
    user_empire TEXT DEFAULT NULL,
    user_bitjita_entity_id TEXT DEFAULT NULL,
    user_bitjita_user_id TEXT DEFAULT NULL,
    user_bitjita_empire_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    profile_exists BOOLEAN := false;
    default_role_id UUID;
BEGIN
    -- Check if profile already exists
    SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = user_id) INTO profile_exists;
    
    IF profile_exists THEN
        -- Update existing profile
        UPDATE public.user_profiles 
        SET 
            in_game_name = COALESCE(user_in_game_name, in_game_name),
            empire = COALESCE(user_empire, empire),
            bitjita_entity_id = COALESCE(user_bitjita_entity_id, bitjita_entity_id),
            bitjita_user_id = COALESCE(user_bitjita_user_id, bitjita_user_id),
            bitjita_empire_id = COALESCE(user_bitjita_empire_id, bitjita_empire_id),
            updated_at = NOW()
        WHERE id = user_id;
        
        RETURN JSON_BUILD_OBJECT('success', true, 'message', 'Profile updated successfully');
    ELSE
        -- Get default role
        SELECT id INTO default_role_id FROM public.roles WHERE name = 'employee' LIMIT 1;
        
        -- Create new profile
        INSERT INTO public.user_profiles (id, email, role_id, in_game_name, empire, bitjita_entity_id, bitjita_user_id, bitjita_empire_id)
        VALUES (user_id, user_email, default_role_id, user_in_game_name, user_empire, user_bitjita_entity_id, user_bitjita_user_id, user_bitjita_empire_id);
        
        RETURN JSON_BUILD_OBJECT('success', true, 'message', 'Profile created successfully');
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if username is already taken
CREATE OR REPLACE FUNCTION public.check_username_availability(
    username_to_check TEXT
)
RETURNS JSON AS $$
DECLARE
    existing_count INTEGER := 0;
    existing_user_id UUID;
BEGIN
    -- Check if username already exists in user_profiles
    SELECT COUNT(*) 
    INTO existing_count
    FROM public.user_profiles 
    WHERE LOWER(TRIM(in_game_name)) = LOWER(TRIM(username_to_check))
    AND in_game_name IS NOT NULL 
    AND in_game_name != '';
    
    -- If username exists, get the first matching user ID only
    IF existing_count > 0 THEN
        SELECT id 
        INTO existing_user_id
        FROM public.user_profiles 
        WHERE LOWER(TRIM(in_game_name)) = LOWER(TRIM(username_to_check))
        AND in_game_name IS NOT NULL 
        AND in_game_name != ''
        LIMIT 1;
    END IF;
    
    IF existing_count > 0 THEN
        RETURN JSON_BUILD_OBJECT(
            'available', false, 
            'message', 'Username Already Taken',
            'existing_user_id', existing_user_id
        );
    ELSE
        RETURN JSON_BUILD_OBJECT(
            'available', true, 
            'message', 'Username is available'
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        -- On error, assume username is available to avoid blocking legitimate signups
        RETURN JSON_BUILD_OBJECT(
            'available', true, 
            'message', 'Username is available'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
