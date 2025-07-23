import {
  Box,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Title,
  Badge,
  Grid,
  Divider,
  Alert,
} from '@mantine/core';
import {
  IconShield,
  IconUser,
  IconSettings,
  IconEye,
} from '@tabler/icons-react';
import {
  PermissionGate,
  UnauthorizedAccess,
} from '../components/PermissionGate';
import { useUserWithProfile, useUser } from '../supabase/loader';
import { useUserPermissions } from '../supabase/optimizedRoleHooks';

export function PermissionsDemo() {
  const { user } = useUser();
  const { userProfile, loading: profileLoading } = useUserWithProfile();
  const { permissions, loading: permissionsLoading } = useUserPermissions();

  if (!user) {
    return (
      <Alert color="yellow" icon={<IconUser size="1rem" />}>
        Please sign in to view this page.
      </Alert>
    );
  }

  return (
    <Box p="md">
      <Stack gap="lg">
        <Title order={2}>Role-Based Permissions Demo</Title>

        {/* User Profile Card */}
        <Card withBorder shadow="sm" radius="md">
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start">
              <Text size="lg" fw={500}>
                Current User Profile
              </Text>
              <Badge color="blue" variant="light">
                {profileLoading
                  ? 'Loading...'
                  : userProfile?.role?.name || 'No Role'}
              </Badge>
            </Group>

            <Text c="dimmed">Email: {user.email}</Text>
            {userProfile?.in_game_name && (
              <Text c="dimmed">In Game Name: {userProfile.in_game_name}</Text>
            )}
            {userProfile?.first_name && (
              <Text c="dimmed">
                Name: {userProfile.first_name} {userProfile.last_name}
              </Text>
            )}

            <Divider />

            <Text size="sm" fw={500} mb="xs">
              Your Permissions:
            </Text>
            {permissionsLoading ? (
              <Text size="sm" c="dimmed">
                Loading permissions...
              </Text>
            ) : (
              <Grid>
                {Object.entries(permissions).map(
                  ([permissionName, _details]) => (
                    <Grid.Col span={6} key={permissionName}>
                      <Badge variant="outline" size="sm">
                        {permissionName}
                      </Badge>
                    </Grid.Col>
                  ),
                )}
              </Grid>
            )}
          </Stack>
        </Card>

        {/* Permission-Based UI Examples */}
        <Title order={3}>Permission-Based UI Examples</Title>

        <Grid>
          {/* User Management Section */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder shadow="sm" radius="md" h="100%">
              <Stack gap="md">
                <Group>
                  <IconUser size="1.2rem" />
                  <Text fw={500}>User Management</Text>
                </Group>

                <PermissionGate
                  permission="users.read"
                  fallback={<UnauthorizedAccess />}
                >
                  <Button variant="light" size="sm">
                    View Users
                  </Button>
                </PermissionGate>

                <PermissionGate
                  permission="users.create"
                  fallback={
                    <Text size="sm" c="dimmed">
                      Create users: Not authorized
                    </Text>
                  }
                >
                  <Button variant="light" color="green" size="sm">
                    Create User
                  </Button>
                </PermissionGate>

                <PermissionGate
                  permission="users.manage_roles"
                  fallback={
                    <Text size="sm" c="dimmed">
                      Manage roles: Not authorized
                    </Text>
                  }
                >
                  <Button variant="light" color="orange" size="sm">
                    Manage User Roles
                  </Button>
                </PermissionGate>
              </Stack>
            </Card>
          </Grid.Col>

          {/* Inventory Management Section */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder shadow="sm" radius="md" h="100%">
              <Stack gap="md">
                <Group>
                  <IconShield size="1.2rem" />
                  <Text fw={500}>Inventory Management</Text>
                </Group>

                <PermissionGate
                  permission="inventory.read"
                  fallback={<UnauthorizedAccess />}
                >
                  <Button variant="light" size="sm">
                    View Inventory
                  </Button>
                </PermissionGate>

                <PermissionGate
                  permission="inventory.create"
                  fallback={
                    <Text size="sm" c="dimmed">
                      Add items: Not authorized
                    </Text>
                  }
                >
                  <Button variant="light" color="green" size="sm">
                    Add Item
                  </Button>
                </PermissionGate>

                <PermissionGate
                  permission="inventory.bulk_update"
                  fallback={
                    <Text size="sm" c="dimmed">
                      Bulk update: Not authorized
                    </Text>
                  }
                >
                  <Button variant="light" color="orange" size="sm">
                    Bulk Update
                  </Button>
                </PermissionGate>
              </Stack>
            </Card>
          </Grid.Col>

          {/* Settings Section */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder shadow="sm" radius="md" h="100%">
              <Stack gap="md">
                <Group>
                  <IconSettings size="1.2rem" />
                  <Text fw={500}>System Settings</Text>
                </Group>

                <PermissionGate
                  permission="settings.read"
                  fallback={<UnauthorizedAccess />}
                >
                  <Button variant="light" size="sm">
                    View Settings
                  </Button>
                </PermissionGate>

                <PermissionGate
                  permission="settings.update"
                  fallback={
                    <Text size="sm" c="dimmed">
                      Update settings: Not authorized
                    </Text>
                  }
                >
                  <Button variant="light" color="orange" size="sm">
                    Update Settings
                  </Button>
                </PermissionGate>
              </Stack>
            </Card>
          </Grid.Col>

          {/* Reports Section */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder shadow="sm" radius="md" h="100%">
              <Stack gap="md">
                <Group>
                  <IconEye size="1.2rem" />
                  <Text fw={500}>Reports</Text>
                </Group>

                <PermissionGate
                  permission="reports.read"
                  fallback={<UnauthorizedAccess />}
                >
                  <Button variant="light" size="sm">
                    View Reports
                  </Button>
                </PermissionGate>

                <PermissionGate
                  permission="reports.create"
                  fallback={
                    <Text size="sm" c="dimmed">
                      Create reports: Not authorized
                    </Text>
                  }
                >
                  <Button variant="light" color="green" size="sm">
                    Create Report
                  </Button>
                </PermissionGate>

                <PermissionGate
                  permission="reports.export"
                  fallback={
                    <Text size="sm" c="dimmed">
                      Export reports: Not authorized
                    </Text>
                  }
                >
                  <Button variant="light" color="blue" size="sm">
                    Export Data
                  </Button>
                </PermissionGate>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Multiple Permission Example */}
        <Card withBorder shadow="sm" radius="md">
          <Stack gap="md">
            <Text fw={500}>Multiple Permission Examples</Text>

            <PermissionGate
              anyPermissions={['users.create', 'users.update', 'users.delete']}
              fallback={
                <Text c="red">
                  You need at least one user management permission
                </Text>
              }
            >
              <Alert color="green">
                ✅ You have at least one user management permission!
              </Alert>
            </PermissionGate>

            <PermissionGate
              allPermissions={['inventory.read', 'inventory.update']}
              fallback={
                <Text c="orange">
                  You need both read AND update permissions for inventory
                </Text>
              }
            >
              <Alert color="blue">
                ✅ You have both read and update permissions for inventory!
              </Alert>
            </PermissionGate>
          </Stack>
        </Card>
      </Stack>
    </Box>
  );
}
