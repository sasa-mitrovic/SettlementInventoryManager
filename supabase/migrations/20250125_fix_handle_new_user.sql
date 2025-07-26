-- Fix handle_new_user function role lookup
-- This fixes the database error when creating new users with null empire IDs

-- Step 1: Fix the handle_new_user function with correct role lookup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id UUID;
    user_in_game_name TEXT;
    user_empire TEXT;
    user_bitjita_user_id TEXT;
    user_bitjita_empire_id TEXT;
BEGIN
    -- Get the default role (employee) - FIX: Use 'name' not 'role_name'
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'employee' LIMIT 1;
    
    -- If no employee role found, try to get any default role
    IF default_role_id IS NULL THEN
        SELECT id INTO default_role_id FROM public.roles ORDER BY created_at ASC LIMIT 1;
    END IF;
    
    -- Extract metadata from the new user
    user_in_game_name := NEW.raw_user_meta_data->>'in_game_name';
    user_empire := NEW.raw_user_meta_data->>'empire';
    user_bitjita_user_id := NEW.raw_user_meta_data->>'bitjita_user_id';
    user_bitjita_empire_id := NEW.raw_user_meta_data->>'bitjita_empire_id';
    
    -- Insert the new user profile (supports null empire values for independent players)
    INSERT INTO public.user_profiles (id, email, role_id, in_game_name, empire, bitjita_user_id, bitjita_empire_id)
    VALUES (NEW.id, NEW.email, default_role_id, user_in_game_name, user_empire, user_bitjita_user_id, user_bitjita_empire_id);
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error details for debugging
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        -- Re-raise the error so it's visible
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Ensure the trigger is properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Improve the complete_user_signup function with better error handling
CREATE OR REPLACE FUNCTION public.complete_user_signup(
    user_id UUID,
    user_email TEXT,
    user_in_game_name TEXT DEFAULT NULL,
    user_empire TEXT DEFAULT NULL,
    user_bitjita_user_id TEXT DEFAULT NULL,
    user_bitjita_empire_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    profile_exists BOOLEAN := false;
    default_role_id UUID;
    rows_affected INTEGER := 0;
BEGIN
    -- Check if profile already exists
    SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = user_id) INTO profile_exists;
    
    IF profile_exists THEN
        -- Update existing profile (supports null empire values for independent players)
        UPDATE public.user_profiles 
        SET 
            in_game_name = COALESCE(user_in_game_name, in_game_name),
            empire = COALESCE(user_empire, empire),
            bitjita_user_id = COALESCE(user_bitjita_user_id, bitjita_user_id),
            bitjita_empire_id = COALESCE(user_bitjita_empire_id, bitjita_empire_id),
            updated_at = NOW()
        WHERE id = user_id;
        
        GET DIAGNOSTICS rows_affected = ROW_COUNT;
        
        IF rows_affected > 0 THEN
            RETURN json_build_object(
                'success', true,
                'message', 'User profile updated successfully',
                'operation', 'update'
            );
        ELSE
            RETURN json_build_object(
                'success', false,
                'error', 'No profile found to update for user_id: ' || user_id::text
            );
        END IF;
    ELSE
        -- Create new profile if it doesn't exist
        SELECT id INTO default_role_id FROM public.roles WHERE name = 'employee' LIMIT 1;
        
        -- If no employee role found, try to get any default role
        IF default_role_id IS NULL THEN
            SELECT id INTO default_role_id FROM public.roles ORDER BY created_at ASC LIMIT 1;
        END IF;
        
        INSERT INTO public.user_profiles (id, email, role_id, in_game_name, empire, bitjita_user_id, bitjita_empire_id)
        VALUES (user_id, user_email, default_role_id, user_in_game_name, user_empire, user_bitjita_user_id, user_bitjita_empire_id);
        
        RETURN json_build_object(
            'success', true,
            'message', 'User profile created successfully',
            'operation', 'create'
        );
    END IF;
    
EXCEPTION 
    WHEN OTHERS THEN
        -- Return detailed error information for debugging
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'error_detail', SQLSTATE,
            'context', 'complete_user_signup function'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
