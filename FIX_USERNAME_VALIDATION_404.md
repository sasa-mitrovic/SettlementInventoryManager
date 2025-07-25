# Fix for 404 Error: check_username_availability Function Not Found

## Problem

You're getting a 404 error when trying to use the username validation feature:

```
POST https://wivnmjigpxsonvgzwito.supabase.co/rest/v1/rpc/check_username_availability 404 (Not Found)
```

This means the `check_username_availability` database function hasn't been created in your Supabase database yet.

## Solution Options

### Option 1: Apply the Migration Manually (Recommended)

1. **Open your Supabase Dashboard**

   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**

   - Click on "SQL Editor" in the left sidebar

3. **Run the Migration Script**
   - Copy the contents of `apply_username_validation_function.sql` (created in your project root)
   - Paste it into the SQL Editor
   - Click "Run" to execute

### Option 2: Use Supabase CLI (If Available)

If you have the Supabase CLI installed:

```bash
# Navigate to your project directory
cd c:\Projects\SettlementInventoryManager

# Apply all pending migrations
supabase db push

# Or apply a specific migration
supabase db reset
```

### Option 3: Install Supabase CLI and Apply

1. **Install Supabase CLI**

   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**

   ```bash
   supabase login
   ```

3. **Apply the migration**
   ```bash
   supabase db push
   ```

## Verification

After applying the migration, you can verify it worked by:

1. **Test in SQL Editor**

   ```sql
   SELECT public.check_username_availability('testuser') as test_result;
   ```

2. **Test in your application**
   - Try using the username validation feature in the signup form
   - The 404 error should be resolved

## Fallback Behavior

The application has been updated with fallback behavior:

- If the function doesn't exist, username validation will assume usernames are available
- This prevents the signup process from being blocked while you apply the migration
- Users can still sign up, but won't get duplicate username protection until the function is applied

## Migration Contents

The migration creates:

- `check_username_availability(username_to_check TEXT)` function
- Proper permissions for authenticated users
- Case-insensitive username checking
- Graceful error handling

## Next Steps

1. Apply the migration using one of the options above
2. Test the username validation feature
3. Verify that duplicate username protection is working
4. Remove the fallback behavior if desired (optional)

## Files Created for This Fix

- `apply_username_validation_function.sql` - Standalone migration script
- Updated `useUsernameValidation.ts` - Added fallback for missing function

Choose the option that works best for your setup and apply the migration to resolve the 404 error.
