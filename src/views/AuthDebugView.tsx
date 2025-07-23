import { useAuth } from '../components/AuthProvider';
import { usePermissionContext } from '../supabase/optimizedRoleHooks';
import {
  useOptimizedUser,
  useOptimizedUserWithProfile,
} from '../supabase/loader';
import { Paper, Stack, Text, Title, Code, Alert, Button } from '@mantine/core';

export function AuthDebugView() {
  const authData = useAuth();
  const permissionData = usePermissionContext();
  const optimizedUser = useOptimizedUser();
  const optimizedUserWithProfile = useOptimizedUserWithProfile();

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleLogout = async () => {
    const { supabaseClient } = await import('../supabase/supabaseClient');
    await supabaseClient.auth.signOut();
  };

  return (
    <Stack gap="md" p="md">
      <Title order={2}>Authentication Debug Information</Title>

      <Paper withBorder p="md">
        <Title order={3}>AuthProvider Data</Title>
        <Code block>
          {JSON.stringify(
            {
              user: authData.user
                ? {
                    id: authData.user.id,
                    email: authData.user.email,
                    email_confirmed_at: authData.user.email_confirmed_at,
                    last_sign_in_at: authData.user.last_sign_in_at,
                  }
                : null,
              session: authData.session ? 'Session exists' : 'No session',
              loading: authData.loading,
              initialized: authData.initialized,
            },
            null,
            2,
          )}
        </Code>
      </Paper>

      <Paper withBorder p="md">
        <Title order={3}>Permission Context Data</Title>
        <Code block>
          {JSON.stringify(
            {
              cachedData: permissionData.cachedData
                ? {
                    user: permissionData.cachedData.user
                      ? {
                          id: permissionData.cachedData.user.id,
                          email: permissionData.cachedData.user.email,
                        }
                      : null,
                    profile: permissionData.cachedData.profile
                      ? {
                          id: permissionData.cachedData.profile.id,
                          email: permissionData.cachedData.profile.email,
                          first_name:
                            permissionData.cachedData.profile.first_name,
                          role: permissionData.cachedData.profile.role,
                        }
                      : null,
                    permissions: Object.keys(
                      permissionData.cachedData.permissions || {},
                    ),
                    permissionCount: Object.keys(
                      permissionData.cachedData.permissions || {},
                    ).length,
                  }
                : null,
              loading: permissionData.loading,
              error: permissionData.error,
            },
            null,
            2,
          )}
        </Code>
      </Paper>

      <Paper withBorder p="md">
        <Title order={3}>Optimized User Hooks</Title>
        <Code block>
          {JSON.stringify(
            {
              optimizedUser: {
                user: optimizedUser.user
                  ? {
                      id: optimizedUser.user.id,
                      email: optimizedUser.user.email,
                    }
                  : null,
                loading: optimizedUser.loading,
              },
              optimizedUserWithProfile: {
                user: optimizedUserWithProfile.user
                  ? {
                      id: optimizedUserWithProfile.user.id,
                      email: optimizedUserWithProfile.user.email,
                    }
                  : null,
                userProfile: optimizedUserWithProfile.userProfile
                  ? {
                      id: optimizedUserWithProfile.userProfile.id,
                      email: optimizedUserWithProfile.userProfile.email,
                      first_name:
                        optimizedUserWithProfile.userProfile.first_name,
                      role: optimizedUserWithProfile.userProfile.role,
                    }
                  : null,
                loading: optimizedUserWithProfile.loading,
              },
            },
            null,
            2,
          )}
        </Code>
      </Paper>

      {permissionData.error && (
        <Alert color="red" title="Permission Context Error">
          {permissionData.error}
        </Alert>
      )}

      <Paper withBorder p="md">
        <Title order={3}>Actions</Title>
        <Stack gap="sm">
          <Button onClick={handleRefresh}>Refresh Page</Button>
          <Button
            onClick={permissionData.refetch}
            loading={permissionData.loading}
          >
            Refetch Permission Data
          </Button>
          <Button color="red" onClick={handleLogout}>
            Logout and Re-login
          </Button>
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Title order={3}>Expected Values</Title>
        <Text size="sm">
          • User ID should be: 58db2c15-e7a0-4f96-b602-7be400723b64
          <br />
          • Email should be: sasam1996@gmail.com
          <br />
          • Role should be: super_admin
          <br />
          • Should have multiple permissions (20+)
          <br />• Loading states should be false when data is loaded
        </Text>
      </Paper>
    </Stack>
  );
}
