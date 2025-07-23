# User Deletion Feature

## Overview

This feature allows authorized users to permanently delete user accounts from the application with proper permission controls and safety measures.

## Permission Requirements

- Only users with `super_admin` or `admin` roles can access the delete functionality
- The feature requires the `users.delete` or `users.manage` permission

## Deletion Rules

1. **Super Admin**:

   - Can delete any user EXCEPT other super admins
   - Cannot delete their own account

2. **Admin**:

   - Can delete users with no role or regular users
   - CANNOT delete other admins or super admins
   - Cannot delete their own account

3. **Super Admin Protection**:
   - Super admin users cannot be deleted by anyone
   - This prevents accidental deletion of the highest privilege accounts

## Setup Instructions

### 1. Database Function

First, you need to create the database function in your Supabase SQL editor:

```sql
-- Copy and paste the contents of delete_user_function.sql into your Supabase SQL editor
-- This creates the delete_user_completely function with proper security checks
```

### 2. Permissions Setup

Ensure your role-based permission system includes:

- `users.delete` permission for user deletion
- `users.manage` permission for general user management
- Proper role assignments (super_admin, admin, etc.)

## How It Works

### UI Components

- **Trash Icon**: Appears next to eligible users in the Settings page
- **Tooltip**: Shows "Delete user permanently" on hover
- **Permission Gate**: Only shows delete option to authorized users

### Confirmation Flow

1. User clicks the trash icon
2. Confirmation modal appears with:
   - User's name and email
   - Warning about permanent deletion
   - "Delete User" (red) and "Cancel" buttons

### Deletion Process

1. Client-side permission check
2. Database function execution with server-side security checks
3. Deletion from both `user_profiles` and `auth.users` tables
4. Success/error notification
5. Automatic refresh of user list

## Security Features

### Client-Side Checks

- Role-based UI rendering
- Permission gate controls
- Visual confirmation modal

### Server-Side Checks (Database Function)

- Verify current user's role and permissions
- Prevent deletion of super admins
- Prevent self-deletion
- Enforce role hierarchy rules
- Atomic deletion from both tables

## Error Handling

- Permission denied errors
- Database constraint violations
- Network/connection errors
- User-friendly error notifications

## Testing

To test the feature:

1. Log in as a super_admin or admin
2. Navigate to Settings page
3. Look for trash icons next to eligible users
4. Try deleting different user types to verify permission rules
5. Confirm users are removed from both UI and database

## Troubleshooting

- If trash icons don't appear: Check user permissions and role assignments
- If deletion fails: Check database function exists and has proper permissions
- If wrong users can be deleted: Verify the `canDeleteUser` logic matches your requirements
