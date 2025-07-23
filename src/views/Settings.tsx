import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Table,
  Stack,
  Text,
  Group,
  Button,
  Alert,
  Loader,
  Center,
  Select,
  Paper,
  Badge,
} from '@mantine/core';
import {
  IconSettings,
  IconArrowLeft,
  IconRefresh,
  IconUser,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { supabaseClient } from '../supabase/supabaseClient';
import { PermissionGate } from '../components/PermissionGate';
import { useOptimizedUser } from '../supabase/loader';

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  in_game_name: string | null;
  is_active: boolean;
  created_at: string;
  role: {
    id: string;
    name: string;
    description: string;
  } | null;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

export function Settings() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const { user } = useOptimizedUser();

  const fetchUsers = async () => {
    try {
      const { data: usersData, error: usersError } = await supabaseClient
        .from('user_profiles')
        .select(
          `
          id,
          email,
          first_name,
          last_name,
          in_game_name,
          is_active,
          created_at,
          role_id,
          roles(id, name, description)
        `,
        )
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Transform the data to match our interface
      const transformedUsers = (usersData || []).map((user: any) => ({
        ...user,
        role: user.roles,
      }));

      setUsers(transformedUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    }
  };

  const fetchRoles = async () => {
    try {
      const { data: rolesData, error: rolesError } = await supabaseClient
        .from('roles')
        .select('*')
        .order('name', { ascending: true });

      if (rolesError) throw rolesError;
      setRoles(rolesData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch roles');
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchUsers(), fetchRoles()]);
    setRefreshing(false);
  };

  const updateUserRole = async (userId: string, roleId: string | null) => {
    if (!user) return;

    setUpdatingUserId(userId);
    try {
      const { error } = await supabaseClient
        .from('user_profiles')
        .update({ role_id: roleId })
        .eq('id', userId);

      if (error) throw error;

      // Refresh users data to show the updated role
      await fetchUsers();
    } catch (err) {
      console.error('Failed to update user role:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to update user role',
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchRoles()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const getRoleBadgeColor = (roleName: string | null) => {
    switch (roleName?.toLowerCase()) {
      case 'super_admin':
        return 'red';
      case 'admin':
        return 'orange';
      case 'manager':
        return 'blue';
      case 'employee':
        return 'green';
      case 'viewer':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const formatUserName = (user: UserProfile) => {
    if (user.in_game_name) return user.in_game_name;
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.first_name) return user.first_name;
    return user.email;
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <PermissionGate permission="settings.read">
      <Container size="xl" py="md">
        <Stack gap="md">
          <Group justify="space-between">
            <Group>
              <Button
                component={Link}
                to="/"
                leftSection={<IconArrowLeft size={16} />}
                variant="subtle"
              >
                Back to Dashboard
              </Button>
              <Title order={2}>
                <IconSettings size={28} style={{ marginRight: 8 }} />
                Settings
              </Title>
            </Group>
            <Button
              leftSection={<IconRefresh size={16} />}
              loading={refreshing}
              onClick={refreshData}
              variant="light"
            >
              Refresh Data
            </Button>
          </Group>

          {error && (
            <Alert color="red" title="Error">
              {error}
            </Alert>
          )}

          <Paper withBorder shadow="sm" radius="md" p="xl">
            <Stack gap="md">
              <Group>
                <IconUser size={24} />
                <Title order={3}>User Role Management</Title>
              </Group>
              <Text c="dimmed">
                Manage user roles and permissions. Only super admins and admins
                can access this section.
              </Text>

              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>User</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Current Role</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Joined</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {users.map((userProfile) => (
                    <Table.Tr key={userProfile.id}>
                      <Table.Td>
                        <Text fw={500}>{formatUserName(userProfile)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {userProfile.email}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={getRoleBadgeColor(
                            userProfile.role?.name || null,
                          )}
                          size="sm"
                          variant="light"
                        >
                          {userProfile.role?.name || 'No Role'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={userProfile.is_active ? 'green' : 'red'}
                          size="sm"
                          variant="light"
                        >
                          {userProfile.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {new Date(
                            userProfile.created_at,
                          ).toLocaleDateString()}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <PermissionGate permission="users.manage_roles">
                          <Select
                            placeholder="Select role"
                            value={userProfile.role?.id || ''}
                            onChange={(value) =>
                              updateUserRole(userProfile.id, value)
                            }
                            data={[
                              { value: '', label: 'No Role' },
                              ...roles.map((role) => ({
                                value: role.id,
                                label: role.name,
                              })),
                            ]}
                            size="sm"
                            w={150}
                            disabled={updatingUserId === userProfile.id}
                          />
                        </PermissionGate>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              {users.length === 0 && (
                <Center h={200}>
                  <Stack align="center">
                    <Text size="lg" c="dimmed">
                      No users found
                    </Text>
                    <Text size="sm" c="dimmed">
                      Users will appear here when they sign up
                    </Text>
                  </Stack>
                </Center>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </PermissionGate>
  );
}
