-- Role Permissions Report
-- This script shows all roles and their associated permissions
-- Run this in your Supabase SQL Editor or database management tool

SELECT 
    r.name AS role_name,
    r.description AS role_description,
    p.name AS permission_name,
    p.description AS permission_description,
    p.resource,
    p.action,
    COUNT(*) OVER (PARTITION BY r.id) AS total_permissions_for_role
FROM 
    public.roles r
    LEFT JOIN public.role_permissions rp ON r.id = rp.role_id
    LEFT JOIN public.permissions p ON rp.permission_id = p.id
ORDER BY 
    r.name, 
    p.resource, 
    p.action;

-- Summary view: Count of permissions per role
SELECT 
    r.name AS role_name,
    r.description AS role_description,
    COUNT(p.id) AS permission_count,
    STRING_AGG(p.name, ', ' ORDER BY p.name) AS permissions_list
FROM 
    public.roles r
    LEFT JOIN public.role_permissions rp ON r.id = rp.role_id
    LEFT JOIN public.permissions p ON rp.permission_id = p.id
GROUP BY 
    r.id, r.name, r.description
ORDER BY 
    permission_count DESC, r.name;

-- Detailed permissions breakdown by resource
SELECT 
    r.name AS role_name,
    p.resource,
    STRING_AGG(p.action, ', ' ORDER BY p.action) AS actions
FROM 
    public.roles r
    LEFT JOIN public.role_permissions rp ON r.id = rp.role_id
    LEFT JOIN public.permissions p ON rp.permission_id = p.id
WHERE 
    p.resource IS NOT NULL
GROUP BY 
    r.id, r.name, p.resource
ORDER BY 
    r.name, p.resource;

-- Show all available permissions in the system
SELECT 
    p.resource,
    p.action,
    p.name AS permission_name,
    p.description,
    COUNT(rp.role_id) AS assigned_to_roles_count,
    STRING_AGG(r.name, ', ' ORDER BY r.name) AS assigned_to_roles
FROM 
    public.permissions p
    LEFT JOIN public.role_permissions rp ON p.id = rp.permission_id
    LEFT JOIN public.roles r ON rp.role_id = r.id
GROUP BY 
    p.id, p.resource, p.action, p.name, p.description
ORDER BY 
    p.resource, p.action;
