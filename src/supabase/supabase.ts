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
          empire: string | null;
          bitjita_user_id: string | null;
          bitjita_empire_id: string | null;
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
          empire?: string | null;
          bitjita_user_id?: string | null;
          bitjita_empire_id?: string | null;
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
          empire?: string | null;
          bitjita_user_id?: string | null;
          bitjita_empire_id?: string | null;
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
      crafting_orders: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          item_id: string;
          item_name: string;
          item_icon: string | null;
          item_tier: string | null;
          quantity: number;
          sector: string | null;
          status: 'unassigned' | 'assigned' | 'completed';
          placed_by: string;
          claimed_by: string | null;
          completed_at: string | null;
          completed_by: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          item_id: string;
          item_name: string;
          item_icon?: string | null;
          item_tier?: string | null;
          quantity: number;
          sector?: string | null;
          status?: 'unassigned' | 'assigned' | 'completed';
          placed_by: string;
          claimed_by?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          item_id?: string;
          item_name?: string;
          item_icon?: string | null;
          item_tier?: string | null;
          quantity?: number;
          sector?: string | null;
          status?: 'unassigned' | 'assigned' | 'completed';
          placed_by?: string;
          claimed_by?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
        };
      };
      discord_integrations: {
        Row: {
          id: string;
          settlement_id: string;
          server_id: string;
          server_name: string | null;
          webhook_url: string;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          settlement_id: string;
          server_id: string;
          server_name?: string | null;
          webhook_url: string;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          settlement_id?: string;
          server_id?: string;
          server_name?: string | null;
          webhook_url?: string;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      discord_channels: {
        Row: {
          id: string;
          discord_integration_id: string;
          sector: string;
          channel_id: string;
          channel_name: string | null;
          webhook_url: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          discord_integration_id: string;
          sector: string;
          channel_id: string;
          channel_name?: string | null;
          webhook_url: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          discord_integration_id?: string;
          sector?: string;
          channel_id?: string;
          channel_name?: string | null;
          webhook_url?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      discord_message_log: {
        Row: {
          id: string;
          crafting_order_id: string | null;
          discord_channel_id: string | null;
          message_type: string;
          discord_message_id: string | null;
          webhook_response: string | null;
          success: boolean;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          crafting_order_id?: string | null;
          discord_channel_id?: string | null;
          message_type: string;
          discord_message_id?: string | null;
          webhook_response?: string | null;
          success?: boolean;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          crafting_order_id?: string | null;
          discord_channel_id?: string | null;
          message_type?: string;
          discord_message_id?: string | null;
          webhook_response?: string | null;
          success?: boolean;
          error_message?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_username_availability: {
        Args: {
          username_to_check: string;
        };
        Returns: {
          available: boolean;
          message: string;
          existing_user_id?: string;
          existing_email?: string;
          error?: string;
        };
      };
      complete_user_signup: {
        Args: {
          user_id: string;
          user_email: string;
          user_in_game_name: string;
          user_empire?: string;
          user_bitjita_user_id?: string;
          user_bitjita_empire_id?: string;
        };
        Returns: {
          success: boolean;
          message?: string;
          error?: string;
        };
      };
      get_crafting_orders_with_names: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          created_at: string;
          updated_at: string;
          item_id: string;
          item_name: string;
          item_icon: string | null;
          item_tier: string | null;
          quantity: number;
          sector: string | null;
          status: 'unassigned' | 'assigned' | 'completed';
          placed_by: string;
          claimed_by: string | null;
          completed_at: string | null;
          completed_by: string | null;
          placed_by_name: string | null;
          claimed_by_name: string | null;
          completed_by_name: string | null;
        }[];
      };
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
      get_discord_integration_status: {
        Args: {
          settlement_id_param: string;
        };
        Returns: {
          has_integration: boolean;
          server_name: string | null;
          channel_count: number;
          is_active: boolean;
        }[];
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
