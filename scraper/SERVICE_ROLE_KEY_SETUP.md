# SERVICE ROLE KEY SETUP INSTRUCTIONS

## Problem Identified
The user profile updater is using the anon key instead of the service role key, which means it can't access user profiles due to Row Level Security (RLS) policies.

## Solution
You need to get your Service Role Key from Supabase and update the .env file.

## Steps to Fix:

### 1. Get Service Role Key from Supabase Dashboard
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `wivnmjigpxsonvgzwito`
3. Go to **Settings** > **API**
4. Under "Project API keys", find the **service_role** key
5. Copy the service_role key (it will be different from the anon key)

### 2. Update the .env file
Edit `c:\Projects\SettlementInventoryManager\scraper\.env` and replace the line:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpdm5tamlncHhzb252Z3p3aXRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODA4NDEsImV4cCI6MjA2ODg1Njg0MX0.cjeG6UfUtDvqZrBDIP2QllM8U_VeGtI6mf6dxXQi8i4
```

With:

```env
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

### 3. Test the Fix
After updating the service role key, run:

```powershell
Set-Location "c:\Projects\SettlementInventoryManager\scraper"
node test-db-connection.js
```

You should see it find 12 user profiles instead of 0.

### 4. Run the Profile Updates
Once the connection works, run:

```powershell
# Update all profiles
node user-profile-updater.js all

# Or run the comprehensive manual update
node manual-profile-update.js
```

## Security Note
The service role key has full database access and should be kept secret. Don't commit it to version control.

## Expected Results
After fixing the service role key, the updater should find and update these users:
- MoWine
- Larian  
- AlannahRaven
- TestUser
- Lusti
- Jekka
- Swan
- MaJingRui
- jingyui
- Exadonix
- Meat
- Hircus

Each will be updated with their empire information and Bitjita API IDs from the player search API.
