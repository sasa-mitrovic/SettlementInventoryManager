-- Fix email uniqueness constraint on user_profiles table
-- This prevents duplicate email registrations

-- Step 1: Check for existing duplicate emails before adding constraint
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT email, COUNT(*) as count
        FROM public.user_profiles
        GROUP BY email
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'Found % duplicate email groups. Please review and clean up manually before adding unique constraint.', duplicate_count;
        
        -- Show the duplicates for manual review
        RAISE NOTICE 'Duplicate emails found:';
        FOR rec IN 
            SELECT email, COUNT(*) as count
            FROM public.user_profiles
            GROUP BY email
            HAVING COUNT(*) > 1
            ORDER BY count DESC
        LOOP
            RAISE NOTICE 'Email: %, Count: %', rec.email, rec.count;
        END LOOP;
    ELSE
        RAISE NOTICE 'No duplicate emails found. Safe to add unique constraint.';
    END IF;
END $$;

-- Step 2: Add unique constraint on email (only if no duplicates exist)
-- This will fail if there are duplicate emails, which is intentional for safety
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_email_unique UNIQUE (email);

-- Step 3: Create an index for performance (if constraint was added successfully)
CREATE INDEX IF NOT EXISTS user_profiles_email_idx ON public.user_profiles (email);

-- Step 4: Add a function to check email availability before signup
CREATE OR REPLACE FUNCTION public.check_email_availability(
    email_to_check TEXT
)
RETURNS JSON AS $$
DECLARE
    existing_count INTEGER := 0;
    existing_user_id UUID;
    existing_in_game_name TEXT;
BEGIN
    -- Check if email already exists in user_profiles
    SELECT COUNT(*), MIN(id), MIN(in_game_name)
    INTO existing_count, existing_user_id, existing_in_game_name
    FROM public.user_profiles 
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(email_to_check));
    
    IF existing_count > 0 THEN
        RETURN JSON_BUILD_OBJECT(
            'available', false, 
            'message', 'Email already registered',
            'existing_user_id', existing_user_id,
            'existing_in_game_name', existing_in_game_name
        );
    ELSE
        RETURN JSON_BUILD_OBJECT(
            'available', true, 
            'message', 'Email is available'
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        -- On error, assume email is available to avoid blocking legitimate signups
        RETURN JSON_BUILD_OBJECT(
            'available', true, 
            'message', 'Email availability check failed, proceeding with signup'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Update the handle_new_user function to check for existing emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id UUID;
    user_in_game_name TEXT;
    user_empire TEXT;
    user_bitjita_user_id TEXT;
    user_bitjita_empire_id TEXT;
    existing_profile_count INTEGER := 0;
BEGIN
    -- Check if a profile with this email already exists
    SELECT COUNT(*) INTO existing_profile_count
    FROM public.user_profiles 
    WHERE email = NEW.email;
    
    IF existing_profile_count > 0 THEN
        RAISE EXCEPTION 'A user profile with email % already exists', NEW.email;
    END IF;
    
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
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Duplicate email detected: %', NEW.email;
    WHEN OTHERS THEN
        -- Log the error details for debugging
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        -- Re-raise the error so it's visible
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
