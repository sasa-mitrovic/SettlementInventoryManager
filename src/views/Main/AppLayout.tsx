import {
  Box,
  Group,
  Stack,
  Title,
  Button,
  Menu,
  Avatar,
  Text,
} from '@mantine/core';
import {
  IconLogout,
  IconUser,
  IconSettings,
  IconChevronDown,
} from '@tabler/icons-react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { DarkModeToggle } from '../../components/DarkModeToggle';
import { ImpersonationBanner } from '../../components/ImpersonationBanner';
import { useOptimizedUserWithProfile } from '../../supabase/loader';
import { useHasPermission } from '../../supabase/optimizedRoleHooks';
import { supabaseClient } from '../../supabase/supabaseClient';
import { notifications } from '@mantine/notifications';

export const AppLayout = () => {
  const { userProfile } = useOptimizedUserWithProfile();
  const navigate = useNavigate();
  const { hasPermission: hasSettingsAccess, loading: permissionLoading } =
    useHasPermission('settings.read');

  // Debug logging
  console.log('AppLayout - Settings access check:', {
    hasSettingsAccess,
    permissionLoading,
    userRole: userProfile?.role?.name,
    userId: userProfile?.id,
    isImpersonating: localStorage.getItem('impersonation_active') === 'true',
    targetUserId: localStorage.getItem('impersonation_target_user'),
  });

  const handleSignOut = async () => {
    try {
      // Clear any impersonation state first
      localStorage.removeItem('impersonating_user_id');
      localStorage.removeItem('impersonating_user_email');
      localStorage.removeItem('original_user_data');

      // Sign out from Supabase
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        console.error('Sign out error:', error);
        notifications.show({
          title: 'Sign Out Failed',
          message: error.message,
          color: 'red',
        });
      } else {
        notifications.show({
          title: 'Signed Out Successfully',
          message: 'You have been successfully signed out.',
          color: 'green',
        });

        // Navigate to auth page
        navigate('/auth');

        // Force a page reload to ensure clean state
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (err) {
      console.error('Unexpected sign out error:', err);
      notifications.show({
        title: 'Sign Out Error',
        message: 'An unexpected error occurred while signing out.',
        color: 'red',
      });
    }
  };

  return (
    <Stack gap={0}>
      <ImpersonationBanner />

      {/* Header with Navigation and User Menu */}
      <Box
        style={{
          borderBottom: '1px solid var(--mantine-color-gray-3)',
          backgroundColor: 'var(--mantine-color-body)',
        }}
      >
        <Group justify="space-between" p="md">
          {/* Logo/Title */}
          <Group>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Title order={3}>Settlement Manager</Title>
            </Link>
          </Group>

          {/* Right side with dark mode toggle and user menu */}
          <Group gap="md">
            <DarkModeToggle />

            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <Button
                  variant="subtle"
                  leftSection={
                    <Avatar size="sm" radius="xl">
                      {userProfile?.in_game_name?.[0] ||
                        userProfile?.email?.[0] ||
                        'U'}
                    </Avatar>
                  }
                  rightSection={<IconChevronDown size={14} />}
                >
                  <Box style={{ textAlign: 'left' }}>
                    <Text size="sm" fw={500}>
                      {userProfile?.in_game_name || 'User'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {userProfile?.role?.name || 'No role'}
                    </Text>
                  </Box>
                </Button>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Account</Menu.Label>
                <Menu.Item leftSection={<IconUser size={14} />} disabled>
                  <Text size="sm">{userProfile?.email}</Text>
                </Menu.Item>

                <Menu.Divider />

                {!permissionLoading && hasSettingsAccess && (
                  <>
                    <Menu.Item
                      leftSection={<IconSettings size={14} />}
                      component={Link}
                      to="/settings"
                    >
                      Settings
                    </Menu.Item>

                    <Menu.Divider />
                  </>
                )}

                <Menu.Item
                  leftSection={<IconLogout size={14} />}
                  onClick={handleSignOut}
                  color="red"
                >
                  Sign Out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Box>

      <Box flex={1}>
        <Outlet />
      </Box>
    </Stack>
  );
};
