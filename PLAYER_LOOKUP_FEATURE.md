# Player Lookup Feature Documentation

This feature implements Bitjita player lookup functionality during the signup process, allowing users to search for their in-game username and automatically populate empire information.

## Overview

The player lookup feature integrates with the Bitjita API to:

1. Search for players by username during signup
2. Display a dropdown with matching players (top 5 results)
3. Auto-populate the in-game name field when a player is selected
4. Auto-populate and disable the empire field if the player has empire membership
5. Store the Bitjita entity ID for future reference

## Technical Implementation

### API Integration

**Player Search Endpoint:**

- URL: `https://bitjita.com/api/players?q={username}`
- Method: GET
- Returns: Array of player objects with basic info

**Player Details Endpoint:**

- URL: `https://bitjita.com/api/players/{entityId}`
- Method: GET
- Returns: Detailed player information including empire memberships

### Components

#### 1. BitjitaPlayerService (`src/services/bitjitaPlayerService.ts`)

Main service for interacting with the Bitjita Player API:

```typescript
export interface BitjitaPlayer {
  entityId: string;
  username: string;
  signedIn: boolean;
  lastLogin?: string;
  empireMemberships?: EmpireMembership[];
}

export class BitjitaPlayerService {
  static async searchPlayers(query: string): Promise<BitjitaPlayer[]>;
  static async getPlayerDetails(
    entityId: string,
  ): Promise<BitjitaPlayerDetails>;
}
```

#### 2. usePlayerSearch Hook (`src/hooks/usePlayerSearch.ts`)

React hook providing debounced search functionality:

```typescript
export function usePlayerSearch() {
  const {
    players, // Search results
    loading, // Loading state
    error, // Error message
    searchValue, // Current search input
    setSearchValue, // Update search input
    selectedPlayer, // Selected player details
    selectPlayerById, // Select player by ID
  } = usePlayerSearch();
}
```

Features:

- 300ms debounced search
- Automatic loading states
- Error handling
- Player selection with detailed info retrieval

#### 3. PlayerSearchSelect Component (`src/components/PlayerSearchSelect.tsx`)

Mantine Select component with custom player rendering:

```typescript
<PlayerSearchSelect
  label="In-Game Username"
  placeholder="Search for your in-game username..."
  onChange={(entityId, playerName, empireName, userId, empireId) => {
    // Handle player selection with all available IDs
  }}
  required
/>
```

Features:

- Searchable dropdown with player results
- Custom option rendering with avatars and online status
- Auto-populated player info display
- Error handling and loading indicators

### Database Schema

#### New User Profile Fields

Added to `user_profiles` table:

```sql
-- Player empire name from Bitjita API
empire VARCHAR(200)

-- Bitjita API entity ID for player validation
bitjita_entity_id VARCHAR(100)

-- Bitjita API user ID associated with the player
bitjita_user_id VARCHAR(100)

-- Bitjita API empire ID associated with the player empire
bitjita_empire_id VARCHAR(100)
```

#### Updated Functions

**handle_new_user()** - Enhanced to store empire and entity ID from signup metadata

**complete_user_signup()** - Updated to accept and store new fields:

```sql
complete_user_signup(
  user_id UUID,
  user_email TEXT,
  user_in_game_name TEXT,
  user_empire TEXT DEFAULT NULL,
  user_bitjita_entity_id TEXT DEFAULT NULL,
  user_bitjita_user_id TEXT DEFAULT NULL,
  user_bitjita_empire_id TEXT DEFAULT NULL
)
```

### Signup Flow Integration

#### Updated Signup Form (`src/views/Signup.tsx`)

The signup form now includes:

1. **Player Search Field** - Interactive dropdown for player lookup
2. **In-Game Name Field** - Auto-populated when player selected, manual entry as fallback
3. **Empire Field** - Auto-populated from player's empire membership, disabled if found

#### Form Behavior

- **Player Found**: Fields auto-populate and become disabled
- **Player Not Found**: Manual entry remains available
- **Empire Detection**: Automatically extracts from `empireMemberships[0].empireName`
- **Validation**: Existing form validation continues to work

## Setup Instructions

### 1. Run Database Migration

Apply the migration to add new fields:

```sql
-- In Supabase SQL Editor, run:
-- c:\Projects\SettlementInventoryManager\supabase\migrations\20250124_add_empire_and_bitjita_fields.sql
```

### 2. Environment Setup

No additional environment variables needed - uses public Bitjita API endpoints.

### 3. Testing

1. Navigate to signup page
2. Start typing a username in the player search field
3. Select a player from the dropdown
4. Verify empire field auto-populates if player has empire membership
5. Complete signup and verify data is stored correctly

## API Rate Limiting & CORS Handling

The Bitjita API doesn't require authentication but may have rate limits and CORS restrictions. The implementation includes:

- **CORS Proxy**: Uses `api.allorigins.win` for all API requests to avoid browser CORS errors
- **Clean Console**: No CORS error messages displayed in browser console
- **Debounced Search**: 300ms delay to reduce API calls
- **Error Handling**: Graceful fallback to manual entry on API failures

### CORS Solution

Due to CORS restrictions on the Bitjita API, the service uses a CORS proxy by default:

- **CORS Proxy**: Uses `api.allorigins.win` for all API requests to avoid browser CORS errors
- **Clean Console**: No CORS error messages in browser console during development
- **Reliable Access**: Consistent API access without browser security restrictions

```typescript
// CORS proxy implementation
private async makeRequest<T>(endpoint: string): Promise<T> {
  const url = `${this.BASE_URL}${endpoint}`;
  const proxyUrl = `${this.CORS_PROXY}${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);
  const data = await response.json();
  return JSON.parse(data.contents);
}
```

## Error Handling

- **API Unavailable**: Falls back to manual entry
- **Player Not Found**: Shows "No players found" message
- **Network Errors**: Displays error alert with retry option
- **Invalid Responses**: Handles malformed API responses
- **Proxy Failures**: Graceful degradation to manual entry mode

## Future Enhancements

Potential improvements:

1. **Player Verification**: Verify in-game name matches selected player
2. **Empire Validation**: Cross-reference empire membership with settlement data
3. **Player Status**: Display additional player information (level, location, etc.)
4. **Caching**: Cache player search results for better performance
5. **Analytics**: Track successful player matches vs manual entries

## Troubleshooting

### Common Issues

**"No players found" but player exists:**

- Player might use different username format
- Check exact spelling and capitalization
- Use manual entry as fallback

**Empire field not auto-populating:**

- Player might not have empire membership
- API might return empty empireMemberships array
- Manual empire entry is still available

**CORS/API errors:**

- Bitjita API might be temporarily unavailable
- CORS proxy might be experiencing issues
- Network connectivity problems
- Try refreshing the page and searching again

### Debugging

Enable console logging to debug API calls:

```javascript
// In browser console
localStorage.setItem('debug', 'bitjita-player-service');
```

This will log all API requests and responses for troubleshooting.

## Security Considerations

- **No API Keys**: Uses public endpoints, no secrets to manage
- **Data Validation**: All user inputs are validated before storage
- **XSS Protection**: Player data is properly escaped in UI
- **Rate Limiting**: Debounced to prevent API abuse

The player lookup feature enhances the user experience by reducing manual data entry while maintaining fallback options for edge cases.
