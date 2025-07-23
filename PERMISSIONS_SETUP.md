# Role-Based Permissions System Setup Guide

This guide explains how to set up and use the role-based permissions system for your Bitjita Inventory Manager.

## 🚀 Quick Setup

### 1. Database Setup

Run the SQL migrations to create the necessary tables and functions:

```bash
# Using Supabase CLI
supabase db reset

# Or manually run the seed.sql file in your Supabase dashboard
```

### 2. Environment Variables

Make sure your `.env` file contains the Supabase configuration:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Test the System

1. Sign up for a new account (users get 'employee' role by default)
2. Visit `/permissions-demo` to see the permissions system in action
3. Test different roles by updating user profiles in the Supabase dashboard

## 📊 Database Schema

### Tables Created:

- **`roles`** - Defines available roles (super_admin, admin, manager, employee, viewer)
- **`permissions`** - Defines granular permissions (users.create, inventory.read, etc.)
- **`role_permissions`** - Junction table linking roles to permissions
- **`user_profiles`** - Extended user information with role assignments

### Default Roles:

- **Super Admin**: Full system access
- **Admin**: Most permissions (cannot delete users or update settings)
- **Manager**: Inventory and reports management
- **Employee**: Basic inventory read/update, view reports
- **Viewer**: Read-only access to inventory and reports

### Permission Categories:

- **Users**: create, read, update, delete, manage_roles
- **Inventory**: create, read, update, delete, bulk_update
- **Reports**: read, create, export
- **Settings**: read, update
- **Audit**: read

## 🛠️ Usage Examples

### 1. Basic Permission Checking

```typescript
import { PermissionGate } from '../components/PermissionGate';

<PermissionGate permission="users.create">
  <Button>Create User</Button>
</PermissionGate>
```

### 2. Multiple Permission Checks

```typescript
// User needs ANY of these permissions
<PermissionGate anyPermissions={['inventory.create', 'inventory.update']}>
  <Button>Manage Inventory</Button>
</PermissionGate>

// User needs ALL of these permissions
<PermissionGate allPermissions={['reports.read', 'reports.export']}>
  <Button>Export Reports</Button>
</PermissionGate>
```

### 3. Using Hooks

```typescript
import { useHasPermission, useUserPermissions } from '../supabase/roleHooks';

function MyComponent() {
  const { hasPermission, loading } = useHasPermission('users.create');
  const { permissions } = useUserPermissions();

  if (loading) return <Loader />;

  return (
    <div>
      {hasPermission && <Button>Create User</Button>}
      <Text>You have {Object.keys(permissions).length} permissions</Text>
    </div>
  );
}
```

### 4. Programmatic Permission Checks

```typescript
import {
  hasPermission,
  getCurrentUserPermissions,
} from '../supabase/roleUtils';

async function handleAction() {
  const canCreateUsers = await hasPermission('users.create');
  if (canCreateUsers) {
    // Proceed with user creation
  }

  const allPermissions = await getCurrentUserPermissions();
  console.log('User permissions:', allPermissions);
}
```

## 🔐 Security Features

### Row Level Security (RLS)

- All tables have RLS enabled
- Users can only access data they have permissions for
- Policies enforce permission checks at the database level

### Automatic Profile Creation

- New users automatically get a profile with 'employee' role
- Triggered when users sign up through Supabase Auth

### Permission Caching

- Permissions are cached in React hooks for performance
- Automatic refetching when authentication state changes

## 🎛️ Admin Functions

### Managing User Roles

```typescript
import { updateUserRole, getUsersWithRoles } from '../supabase/roleUtils';

// Get all users with their roles
const users = await getUsersWithRoles();

// Update a user's role
await updateUserRole(userId, newRoleId);
```

### Creating Custom Permissions

Add new permissions in the database:

```sql
INSERT INTO public.permissions (name, description, resource, action) VALUES
('inventory.approve', 'Approve inventory changes', 'inventory', 'approve');
```

Then assign to roles:

```sql
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'manager' AND p.name = 'inventory.approve';
```

## 🧪 Testing Different Roles

1. **Sign up as a new user** (gets 'employee' role)
2. **Check the permissions demo** at `/permissions-demo`
3. **Manually change roles** in Supabase dashboard:
   ```sql
   UPDATE public.user_profiles
   SET role_id = (SELECT id FROM public.roles WHERE name = 'admin')
   WHERE email = 'your-email@example.com';
   ```
4. **Refresh the app** to see different permissions

## 📝 Customization

### Adding New Roles

1. Insert into `roles` table
2. Add permissions via `role_permissions` table
3. Update TypeScript types if needed

### Adding New Resources

1. Add permissions with new resource names
2. Create corresponding UI components
3. Implement backend logic with permission checks

### Custom Permission Logic

Extend the `PermissionGate` component or create new permission-checking utilities as needed.

## 🐛 Troubleshooting

### Common Issues:

1. **"Access denied" errors**: Check RLS policies and user permissions
2. **Permissions not updating**: Clear browser cache or refresh authentication
3. **Database connection issues**: Verify environment variables
4. **TypeScript errors**: Run `supabase gen types typescript` to update types

### Debug Tools:

- Check user permissions: `/permissions-demo`
- View database logs in Supabase dashboard
- Use browser developer tools to inspect API calls
