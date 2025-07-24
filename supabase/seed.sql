-- Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL, -- e.g., 'inventory', 'users', 'reports'
    action VARCHAR(50) NOT NULL,   -- e.g., 'create', 'read', 'update', 'delete'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(role_id, permission_id)
);

-- Create user_profiles table to extend auth.users
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    in_game_name VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create settlement_members table for scraped member data
CREATE TABLE IF NOT EXISTS public.settlement_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player VARCHAR(100) NOT NULL,
    storage BOOLEAN DEFAULT false, -- inventoryPermission from bitjita data
    build BOOLEAN DEFAULT false, -- buildPermission from bitjita data
    officer BOOLEAN DEFAULT false, -- officerPermission from bitjita data
    co_owner BOOLEAN DEFAULT false, -- coOwnerPermission from bitjita data
    is_online BOOLEAN DEFAULT false,
    role VARCHAR(100) DEFAULT 'member',
    can_invite BOOLEAN DEFAULT false, -- deprecated, use officer/co_owner
    can_kick BOOLEAN DEFAULT false, -- deprecated, use co_owner
    last_seen TIMESTAMP WITH TIME ZONE,
    player_id VARCHAR(100), -- playerEntityId from bitjita data
    entity_id VARCHAR(100), -- entityId from bitjita data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(player)
);

-- Create settlement_inventory table for scraped inventory data
CREATE TABLE IF NOT EXISTS public.settlement_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name VARCHAR(200) NOT NULL,
    tier INTEGER,
    rarity VARCHAR(50),
    quantity INTEGER NOT NULL,
    container_name VARCHAR(200) NOT NULL,
    icon_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(item_name, container_name)
);

-- Create inventory_targets table for user-defined targets
CREATE TABLE IF NOT EXISTS public.inventory_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name VARCHAR(200) NOT NULL UNIQUE,
    target_quantity INTEGER NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create settlement_skills table for member skills data
CREATE TABLE IF NOT EXISTS public.settlement_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_name VARCHAR(100) NOT NULL,
    skill_name VARCHAR(100) NOT NULL,
    skill_level INTEGER,
    skill_xp INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(player_name, skill_name)
);

-- Insert default roles (skip if they already exist)
INSERT INTO public.roles (name, description) 
SELECT * FROM (VALUES
    ('super_admin', 'Full system access with all permissions'),
    ('admin', 'Administrative access with most permissions'),
    ('manager', 'Management level access to inventory and reports'),
    ('employee', 'Basic access to view and update inventory'),
    ('viewer', 'Read-only access to inventory data')
) AS new_roles(name, description)
WHERE NOT EXISTS (
    SELECT 1 FROM public.roles WHERE roles.name = new_roles.name
);

-- Insert default permissions (skip if they already exist)
INSERT INTO public.permissions (name, description, resource, action)
SELECT * FROM (VALUES
    -- User management permissions
    ('users.create', 'Create new users', 'users', 'create'),
    ('users.read', 'View user information', 'users', 'read'),
    ('users.update', 'Update user information', 'users', 'update'),
    ('users.delete', 'Delete users', 'users', 'delete'),
    ('users.manage_roles', 'Assign roles to users', 'users', 'manage_roles'),
    
    -- Inventory management permissions
    ('inventory.create', 'Add new inventory items', 'inventory', 'create'),
    ('inventory.read', 'View inventory items', 'inventory', 'read'),
    ('inventory.update', 'Update inventory items', 'inventory', 'update'),
    ('inventory.delete', 'Delete inventory items', 'inventory', 'delete'),
    ('inventory.bulk_update', 'Bulk update inventory items', 'inventory', 'bulk_update'),
    
    -- Reports permissions
    ('reports.read', 'View reports', 'reports', 'read'),
    ('reports.create', 'Create custom reports', 'reports', 'create'),
    ('reports.export', 'Export report data', 'reports', 'export'),
    
    -- Settings permissions
    ('settings.read', 'View system settings', 'settings', 'read'),
    ('settings.update', 'Update system settings', 'settings', 'update'),
    
    -- Audit permissions
    ('audit.read', 'View audit logs', 'audit', 'read')
) AS new_permissions(name, description, resource, action)
WHERE NOT EXISTS (
    SELECT 1 FROM public.permissions WHERE permissions.name = new_permissions.name
);

-- Assign permissions to roles (skip if they already exist)
WITH role_permission_assignments AS (
    SELECT 
        r.id as role_id,
        p.id as permission_id
    FROM public.roles r
    CROSS JOIN public.permissions p
    WHERE 
        -- Super Admin gets all permissions
        (r.name = 'super_admin') OR
        
        -- Admin gets all except some sensitive permissions
        (r.name = 'admin' AND p.name NOT IN ('users.delete', 'settings.update')) OR
        
        -- Manager gets inventory and reports permissions
        (r.name = 'manager' AND p.resource IN ('inventory', 'reports') AND p.action != 'delete') OR
        (r.name = 'manager' AND p.name IN ('users.read', 'audit.read')) OR
        
        -- Employee gets basic inventory permissions
        (r.name = 'employee' AND p.resource = 'inventory' AND p.action IN ('read', 'update')) OR
        (r.name = 'employee' AND p.name = 'reports.read') OR
        
        -- Viewer gets only read permissions
        (r.name = 'viewer' AND p.action = 'read' AND p.resource IN ('inventory', 'reports'))
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role_id, permission_id FROM role_permission_assignments
WHERE NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp 
    WHERE rp.role_id = role_permission_assignments.role_id 
    AND rp.permission_id = role_permission_assignments.permission_id
);

-- Create function to automatically create user profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id UUID;
    user_in_game_name TEXT;
BEGIN
    -- Get the default role (employee)
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'employee' LIMIT 1;
    
    -- Extract in_game_name from auth metadata
    user_in_game_name := NEW.raw_user_meta_data->>'in_game_name';
    
    -- Insert user profile with in_game_name
    INSERT INTO public.user_profiles (id, email, role_id, in_game_name)
    VALUES (NEW.id, NEW.email, default_role_id, user_in_game_name);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile (drop and recreate to avoid conflicts)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id UUID)
RETURNS TABLE (
    permission_name VARCHAR(100),
    resource VARCHAR(50),
    action VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.name as permission_name,
        p.resource,
        p.action
    FROM public.user_profiles up
    JOIN public.roles r ON up.role_id = r.id
    JOIN public.role_permissions rp ON r.id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE up.id = user_id AND up.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(user_id UUID, permission_name VARCHAR(100))
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := false;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM public.user_profiles up
        JOIN public.roles r ON up.role_id = r.id
        JOIN public.role_permissions rp ON r.id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE up.id = user_id 
        AND up.is_active = true 
        AND p.name = permission_name
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS (Row Level Security)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role_id = (SELECT role_id FROM public.user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users with permission can view profiles" ON public.user_profiles;
CREATE POLICY "Users with permission can view profiles" ON public.user_profiles
    FOR SELECT USING (
        public.user_has_permission(auth.uid(), 'users.read')
    );

DROP POLICY IF EXISTS "Users with permission can update profiles" ON public.user_profiles;
CREATE POLICY "Users with permission can update profiles" ON public.user_profiles
    FOR UPDATE USING (
        public.user_has_permission(auth.uid(), 'users.update')
    );

DROP POLICY IF EXISTS "Users with permission can manage roles" ON public.user_profiles;
CREATE POLICY "Users with permission can manage roles" ON public.user_profiles
    FOR UPDATE USING (
        public.user_has_permission(auth.uid(), 'users.manage_roles')
    );

-- Allow reading roles and permissions for authenticated users (needed for UI)
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.roles;
CREATE POLICY "Authenticated users can view roles" ON public.roles
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.permissions;
CREATE POLICY "Authenticated users can view permissions" ON public.permissions
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view role permissions" ON public.role_permissions;
CREATE POLICY "Authenticated users can view role permissions" ON public.role_permissions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers (drop and recreate to avoid conflicts)
DROP TRIGGER IF EXISTS set_roles_updated_at ON public.roles;
CREATE TRIGGER set_roles_updated_at
    BEFORE UPDATE ON public.roles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
