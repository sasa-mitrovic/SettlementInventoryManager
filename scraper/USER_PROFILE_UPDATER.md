# User Profile Updater

This system automatically updates user profiles with data from the Bitjita Player API, ensuring that empire information and player IDs are kept current.

## Overview

The User Profile Updater serves two main purposes:

1. **Automatic Updates**: Integrated with the main scraper to periodically update user profiles
2. **Manual Updates**: Standalone scripts for on-demand profile updates

## Files

### Core Files

- **`user-profile-updater.js`** - Main updater class with Bitjita API integration
- **`manual-profile-update.js`** - Script for manual full updates
- **`update-profiles.bat`** - Windows batch script with menu interface

### Updated Files

- **`scraper.js`** - Modified to include automatic profile updates every 30 minutes

## Features

### Automatic Updates (Integrated with Scraper)

- Runs every 30 minutes alongside the settlement data scraper
- Updates profiles that haven't been updated in 24+ hours
- Non-blocking - won't interfere with inventory/member scraping

### Manual Updates

- Update all user profiles at once
- Update only stale profiles (configurable age threshold)
- Update specific users by username
- Comprehensive logging and error handling

### Data Updated

For each user profile, the system updates:

- **Empire Name** - Current player empire from `empireMemberships`
- **Bitjita Entity ID** - Player's entity ID for API calls
- **Bitjita User ID** - Player's user ID
- **Bitjita Empire ID** - Empire's entity ID

## Usage

### Automatic Operation

The updater runs automatically when you start the main scraper:

```bash
cd scraper
node scraper.js
```

Profile updates occur every 30 minutes without manual intervention.

### Manual Operation

#### Option 1: Interactive Menu (Windows)

```bash
cd scraper
update-profiles.bat
```

This launches an interactive menu with options for different update types.

#### Option 2: Command Line

```bash
cd scraper

# Update all profiles
node user-profile-updater.js all

# Update stale profiles (default: 24 hours)
node user-profile-updater.js stale

# Update stale profiles (custom threshold)
node user-profile-updater.js stale 12

# Update specific user
node user-profile-updater.js user "Lusti"

# Run comprehensive manual update
node manual-profile-update.js
```

### Example Commands

```bash
# Update all user profiles immediately
node user-profile-updater.js all

# Update profiles that haven't been updated in 12 hours
node user-profile-updater.js stale 12

# Update a specific player's profile
node user-profile-updater.js user "PlayerName"
```

## Configuration

### Environment Variables

The updater uses the same environment variables as the main scraper:

```env
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Update Intervals

**Automatic Updates** (in `scraper.js`):
- Profile update interval: 30 minutes
- Stale profile threshold: 24 hours

**Manual Updates**:
- Configurable via command line arguments
- Default stale threshold: 24 hours

## API Integration

### Player Search

Uses the Bitjita Player API to find player data:

```
GET https://bitjita.com/api/player/search?name={username}
```

For development with CORS issues, falls back through proxy:

```
GET http://localhost:5173/api/bitjita-proxy/player/search?name={username}
```

### Empire Information

Extracts empire data from the player's `empireMemberships` array:

- Uses the first (primary) empire membership
- Handles cases where players have no empire
- Updates both empire name and empire ID

### Rate Limiting

- 500ms delay between API calls to avoid rate limiting
- Graceful error handling for API failures
- Continues processing even if individual updates fail

## Database Schema

The system updates these fields in the `user_profiles` table:

```sql
ALTER TABLE public.user_profiles ADD COLUMN empire VARCHAR(200);
ALTER TABLE public.user_profiles ADD COLUMN bitjita_entity_id VARCHAR(100);
ALTER TABLE public.user_profiles ADD COLUMN bitjita_user_id VARCHAR(100);
ALTER TABLE public.user_profiles ADD COLUMN bitjita_empire_id VARCHAR(100);
```

## Logging and Monitoring

### Console Output

The updater provides detailed logging:

```
🔍 Updating profile for: PlayerName
✅ PlayerName updated successfully
   Empire: Empire Name
   Entity ID: 123456789
   User ID: 987654321
   Empire ID: 555555555

📈 Update Summary:
✅ Updated: 5
⏭️  Skipped (not found): 2
❌ Errors: 0
📊 Total processed: 7
```

### Error Handling

- Graceful handling of API failures
- Continues processing other profiles if one fails
- Clear error messages for troubleshooting
- Fallback behavior for missing player data

## Empire Change Detection

The system automatically detects when players change empires:

1. **Stale Profile Detection** - Identifies profiles that need updating
2. **API Comparison** - Compares current API data with stored data
3. **Selective Updates** - Only updates profiles with actual changes
4. **Change Logging** - Reports what data was updated

## Integration with Signup Process

The updater works seamlessly with the signup process:

1. **New User Signup** - Empire data is set during registration
2. **Automatic Updates** - Keeps empire information current
3. **Empire Changes** - Detects and updates when players move empires
4. **Data Integrity** - Ensures all Bitjita IDs remain accurate

## Troubleshooting

### Common Issues

**"Player not found in Bitjita API"**
- Player may have changed their username
- Player may not exist in the game
- API may be temporarily unavailable

**"No changes needed"**
- Profile is already up to date
- Normal behavior for stable players

**"CORS errors in development"**
- Ensure the main app server is running for proxy functionality
- Direct API calls will work in production

### Verification

To verify the updater is working:

1. Check the scraper console output for profile update messages
2. Look at the `updated_at` timestamps in the `user_profiles` table
3. Verify empire and ID fields are populated correctly

## Performance

### Automatic Updates

- Low impact on scraper performance
- Only updates stale profiles, not all profiles each cycle
- Runs asynchronously without blocking other operations

### Manual Updates

- Can update all profiles in sequence
- Rate limited to avoid API overload
- Provides progress feedback during long operations

## Security

- Uses service role key for database access
- No exposure of sensitive user data in logs
- Respects API rate limits and terms of service
- Only updates existing user profiles, never creates new users
