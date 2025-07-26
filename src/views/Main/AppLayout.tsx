import {
  Box,
  Group,
  Stack,
  Title,
  Button,
  Menu,
  Avatar,
  Text,
  AppShell,
  Burger,
} from '@mantine/core';
import {
  IconLogout,
  IconUser,
  IconSettings,
  IconChevronDown,
} from '@tabler/icons-react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import { DarkModeToggle } from '../../components/DarkModeToggle';
import { ImpersonationBanner } from '../../components/ImpersonationBanner';
import { SettlementSideNav } from '../../components/SettlementSideNav';
import { SettlementProvider } from '../../contexts/SettlementContext_simple';
import { useOptimizedUserWithProfile } from '../../supabase/loader';
import { useHasPermission } from '../../supabase/optimizedRoleHooks';
import { supabaseClient } from '../../supabase/supabaseClient';
import { notifications } from '@mantine/notifications';
// Alternative robust sign out is available at: ../../utils/robustSignOut
// Production diagnostics available at: ../../utils/productionDiagnostics

export const AppLayout = () => {
  const { userProfile } = useOptimizedUserWithProfile();
  const navigate = useNavigate();
  const [sidebarOpened, { toggle: toggleSidebar }] = useDisclosure(true); // Start expanded by default
  const { hasPermission: hasSettingsAccess, loading: permissionLoading } =
    useHasPermission('settings.read');

  const handleSignOut = async () => {
    try {
      // Clear any impersonation state first
      localStorage.removeItem('impersonation_active');
      localStorage.removeItem('impersonation_target_user');
      localStorage.removeItem('impersonation_original_admin');
      localStorage.removeItem('impersonating_user_id');
      localStorage.removeItem('impersonating_user_email');
      localStorage.removeItem('original_user_data');

      // Sign out from Supabase
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        console.error('Sign out error:', error);

        // Check if it's just a session missing error - this is actually OK in production
        const isSessionMissing =
          error.message?.toLowerCase().includes('session') ||
          error.message?.toLowerCase().includes('missing') ||
          error.message?.toLowerCase().includes('invalid');

        if (isSessionMissing) {
          // Treat as successful since user is already effectively signed out
        } else {
          // Show error for other types of failures
          notifications.show({
            title: 'Sign Out Failed',
            message: error.message,
            color: 'red',
          });
          return; // Don't proceed with navigation if there's a real error
        }
      }

      // Show success message (either normal success or session was already missing)
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
    } catch (err) {
      console.error('Unexpected sign out error:', err);

      // Even if there's an unexpected error, we should still try to clear local state
      // and redirect to auth page since the user clicked sign out
      localStorage.clear();

      notifications.show({
        title: 'Sign Out',
        message: 'Redirecting to sign in page...',
        color: 'blue',
      });

      navigate('/auth');

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  return (
    <SettlementProvider>
      <Stack gap={0}>
        <ImpersonationBanner />

        <AppShell
          header={{ height: 60 }}
          navbar={{
            width: sidebarOpened ? 300 : 60,
            breakpoint: 'sm',
            collapsed: { mobile: false }, // Always show on desktop
          }}
          padding="md"
          transitionDuration={200}
          transitionTimingFunction="ease"
        >
          <AppShell.Header>
            <Group h="100%" px="md" justify="space-between">
              {/* Left side with burger menu and title */}
              <Group>
                <Burger
                  opened={sidebarOpened}
                  onClick={toggleSidebar}
                  size="sm"
                />
                <Link
                  to="/"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
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
          </AppShell.Header>

          <AppShell.Navbar>
            <SettlementSideNav collapsed={!sidebarOpened} />
          </AppShell.Navbar>

          <AppShell.Main>
            <Outlet />
          </AppShell.Main>
        </AppShell>
      </Stack>
    </SettlementProvider>
  );
};
