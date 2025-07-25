# Username Validation System

## Overview

The username validation system prevents duplicate account creation by checking if a username is already associated with an existing user account. This system integrates with the player lookup functionality to provide a seamless signup experience.

## Components

### 1. Database Function: `check_username_availability`

**Location**: `supabase/migrations/[timestamp]_player_lookup_system.sql`

**Purpose**: Validates usernames against existing user profiles to prevent duplicate accounts.

**Parameters**:

- `username_to_check` (text): The username to validate

**Returns**: JSON object with:

```json
{
  "available": boolean,
  "message": "string",
  "existing_user_id": "uuid | null",
  "existing_email": "string | null"
}
```

**Features**:

- Case-insensitive comparison using `LOWER(TRIM())`
- Returns detailed information about existing accounts
- Uses `SECURITY DEFINER` for secure access across RLS policies

### 2. Player Search Hook: `usePlayerSearch`

**Location**: `src/hooks/usePlayerSearch.ts`

**Purpose**: Provides player search functionality with configurable minimum search length.

**Options**:

```typescript
{
  debounceMs?: number;        // Default: 300ms
  maxResults?: number;        // Default: 5
  minSearchLength?: number;   // Default: 3 characters
}
```

**Features**:

- **Minimum 3 characters required** before API requests are sent
- Debounced search to prevent excessive API calls
- Loading state management during searches
- Error handling for failed API requests

### 3. React Hook: `useUsernameValidation`

**Location**: `src/hooks/useUsernameValidation.ts`

**Purpose**: Provides React components with username validation functionality.

**Returns**:

```typescript
{
  isValidating: boolean;
  validationResult: UsernameValidationResult | null;
  validateUsername: (username: string) => Promise<UsernameValidationResult>;
  clearValidation: () => void;
}
```

**Features**:

- Loading state management
- Error handling with fallbacks
- Caching of validation results
- Async validation with promise returns

### 4. Enhanced PlayerSearchSelect Component

**Location**: `src/components/PlayerSearchSelect.tsx`

**Purpose**: Integrates username validation into the player search workflow.

**New Props**:

- `validateUsername?: boolean` - Enables validation when set to `true`

**Features**:

- **3-character minimum search requirement** prevents unnecessary API calls
- Automatic validation on player selection
- Visual feedback with success/error alerts
- Integration with existing player lookup system
- Displays validation status with appropriate icons
- Smart messaging based on search input length

### 5. Updated Signup Form

**Location**: `src/views/Signup.tsx`

**Changes**:

- Enables username validation in PlayerSearchSelect component
- Provides real-time feedback during user selection
- Prevents duplicate account creation

## Usage Examples

### Basic Username Validation

```typescript
import { useUsernameValidation } from '../hooks/useUsernameValidation';

function MyComponent() {
  const { validateUsername, validationResult, isValidating } = useUsernameValidation();

  const handleCheck = async (username: string) => {
    const result = await validateUsername(username);
    if (result.available) {
      console.log('Username is available!');
    } else {
      console.log(`Username taken: ${result.message}`);
    }
  };

  return (
    // Your component JSX
  );
}
```

### PlayerSearchSelect with Validation

```tsx
<PlayerSearchSelect
  label="In-Game Username"
  placeholder="Search for your username..."
  onChange={handlePlayerSelect}
  validateUsername={true} // Enable validation
  required
/>
```

### Direct Database Call

```typescript
const { data, error } = await supabase.rpc('check_username_availability', {
  username_to_check: 'testuser',
});

if (!error && data) {
  if (data.available) {
    console.log('Username is available');
  } else {
    console.log(`Username taken by user: ${data.existing_user_id}`);
  }
}
```

## Validation Flow

1. **User starts typing** in the PlayerSearchSelect input field
2. **Minimum character check** - API requests only sent after 3+ characters
3. **Player search** runs with debounced API calls to prevent excessive requests
4. **User selects a player** from the search results dropdown
5. **Automatic validation** triggers if `validateUsername={true}`
6. **Database check** runs against existing user_profiles
7. **Visual feedback** shows availability status:
   - ✅ Green alert for available usernames
   - ❌ Red alert for taken usernames with existing account info
8. **Signup prevention** - Multiple layers prevent duplicate account creation:
   - Submit button becomes disabled when username is taken
   - Form submission is blocked with error message if validation bypassed
   - Database-level validation as final safeguard

## Security Features

- **Multi-layer signup prevention** with UI, form validation, and database-level checks
- **3-character minimum requirement** reduces unnecessary API load and potential abuse
- **Case-insensitive matching** prevents bypass attempts with different casing
- **Trimmed comparison** handles whitespace variations
- **RLS-compliant** function uses SECURITY DEFINER for safe cross-user access
- **No sensitive data exposure** - only returns availability status and basic info

## Error Handling

The system includes comprehensive error handling:

1. **Database errors** are caught and logged
2. **Network failures** fall back to allowing signup (fail-open approach)
3. **Invalid inputs** are sanitized and validated
4. **User feedback** is provided for all error states

## Integration Points

### With Player Lookup System

- Validates usernames found through Bitjita Player API
- Maintains empire auto-population functionality
- Preserves player ID tracking (entity_id, user_id, empire_id)

### With Signup Process

- Prevents duplicate account creation
- Provides immediate feedback during user selection
- Integrates with existing form validation

### With Database Schema

- Uses existing user_profiles table structure
- Leverages in_game_name field for validation
- Compatible with RLS policies and triggers

## Testing

Use the provided test script (`test-username-validation.js`) to verify the system:

1. Update Supabase credentials in the test file
2. Install dependencies: `npm install @supabase/supabase-js`
3. Run: `node test-username-validation.js`

## Future Enhancements

Potential improvements for the username validation system:

1. **Batch validation** for multiple usernames at once
2. **Suggestion system** for alternative usernames when taken
3. **Reserved username protection** for admin/system accounts
4. **Username history tracking** for audit purposes
5. **Rate limiting** for validation requests

## Troubleshooting

### Common Issues

1. **Validation not triggering**: Ensure `validateUsername={true}` is set on PlayerSearchSelect
2. **Database function not found**: Check that migration has been applied
3. **RLS policy conflicts**: Function uses SECURITY DEFINER to bypass RLS
4. **TypeScript errors**: Ensure Supabase types are up to date

### Debug Steps

1. Check browser console for validation errors
2. Verify database function exists in Supabase dashboard
3. Test validation hook independently
4. Check network requests in browser dev tools

## Conclusion

The username validation system provides a robust solution for preventing duplicate accounts while maintaining a smooth user experience. It integrates seamlessly with the existing player lookup functionality and provides comprehensive feedback to users during the signup process.
