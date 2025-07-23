export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      permissions: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          resource: string;
          action: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          resource: string;
          action: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          resource?: string;
          action?: string;
          created_at?: string;
        };
      };
      role_permissions: {
        Row: {
          id: string;
          role_id: string;
          permission_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          role_id: string;
          permission_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          role_id?: string;
          permission_id?: string;
          created_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          role_id: string | null;
          first_name: string | null;
          last_name: string | null;
          in_game_name: string | null;
          email: string;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role_id?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          in_game_name?: string | null;
          email: string;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role_id?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          in_game_name?: string | null;
          email?: string;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      settlement_members: {
        Row: {
          id: string;
          player: string;
          storage: boolean;
          build: boolean;
          officer: boolean;
          co_owner: boolean;
          is_online: boolean;
          role: string;
          can_invite: boolean;
          can_kick: boolean;
          last_seen: string | null;
          player_id: string | null;
          entity_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player: string;
          storage?: boolean;
          build?: boolean;
          officer?: boolean;
          co_owner?: boolean;
          is_online?: boolean;
          role?: string;
          can_invite?: boolean;
          can_kick?: boolean;
          last_seen?: string | null;
          player_id?: string | null;
          entity_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          player_name?: string;
          has_access?: boolean;
          can_build?: boolean;
          can_manage?: boolean;
          can_kick?: boolean;
          last_seen?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      settlement_inventory: {
        Row: {
          id: string;
          item_name: string;
          tier: number | null;
          rarity: string | null;
          quantity: number;
          container_name: string;
          icon_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_name: string;
          tier?: number | null;
          rarity?: string | null;
          quantity: number;
          container_name: string;
          icon_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_name?: string;
          tier?: number | null;
          rarity?: string | null;
          quantity?: number;
          container_name?: string;
          icon_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      inventory_targets: {
        Row: {
          id: string;
          item_name: string;
          target_quantity: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_name: string;
          target_quantity: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_name?: string;
          target_quantity?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      settlement_skills: {
        Row: {
          id: string;
          player_name: string;
          skill_name: string;
          skill_level: number | null;
          skill_xp: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_name: string;
          skill_name: string;
          skill_level?: number | null;
          skill_xp?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          player_name?: string;
          skill_name?: string;
          skill_level?: number | null;
          skill_xp?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_permissions: {
        Args: {
          user_id: string;
        };
        Returns: {
          permission_name: string;
          resource: string;
          action: string;
        }[];
      };
      user_has_permission: {
        Args: {
          user_id: string;
          permission_name: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Additional types for easier use
export type Role = Database['public']['Tables']['roles']['Row'];
export type Permission = Database['public']['Tables']['permissions']['Row'];
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type RolePermission =
  Database['public']['Tables']['role_permissions']['Row'];

export interface UserWithRole extends UserProfile {
  role?: Role;
}

export interface RoleWithPermissions extends Role {
  permissions?: Permission[];
}

export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'manage_roles'
  | 'bulk_update'
  | 'export';
export type PermissionResource =
  | 'users'
  | 'inventory'
  | 'reports'
  | 'settings'
  | 'audit';

export interface UserPermissions {
  [key: string]: {
    resource: string;
    action: string;
  };
}
