import { useState, useEffect } from 'react';
import {
  Stack,
  Text,
  Group,
  Button,
  Alert,
  Loader,
  Paper,
  Badge,
  Table,
  ActionIcon,
  Tooltip,
  Modal,
  TextInput,
  Textarea,
  Checkbox,
  Card,
  Title,
  Divider,
  Grid,
  Accordion,
  Box,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconShield,
  IconKey,
  IconUsers,
} from '@tabler/icons-react';
import { supabaseClient } from '../supabase/supabaseClient';
import { Permission, Role } from '../supabase/supabase';

interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

interface PermissionModalProps {
  permission?: Permission;
  onClose: () => void;
  onSuccess: () => void;
}

function PermissionModal({
  permission,
  onClose,
  onSuccess,
}: PermissionModalProps) {
  const form = useForm({
    initialValues: {
      name: permission?.name || '',
      description: permission?.description || '',
      resource: permission?.resource || '',
      action: permission?.action || '',
    },
    validate: {
      name: (value) => (!value ? 'Permission name is required' : null),
      resource: (value) => (!value ? 'Resource is required' : null),
      action: (value) => (!value ? 'Action is required' : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (permission) {
        // Update existing permission
        const { error } = await supabaseClient
          .from('permissions')
          .update(values)
          .eq('id', permission.id);

        if (error) throw error;

        notifications.show({
          title: 'Permission Updated',
          message: `Permission "${values.name}" has been updated successfully.`,
          color: 'green',
        });
      } else {
        // Create new permission
        const { error } = await supabaseClient
          .from('permissions')
          .insert(values);

        if (error) throw error;

        notifications.show({
          title: 'Permission Created',
          message: `Permission "${values.name}" has been created successfully.`,
          color: 'green',
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      notifications.show({
        title: 'Save Failed',
        message:
          err instanceof Error ? err.message : 'Failed to save permission',
        color: 'red',
      });
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          label="Permission Name"
          placeholder="e.g., users.manage"
          required
          {...form.getInputProps('name')}
        />

        <Textarea
          label="Description"
          placeholder="Brief description of what this permission allows"
          {...form.getInputProps('description')}
        />

        <Grid>
          <Grid.Col span={6}>
            <TextInput
              label="Resource"
              placeholder="e.g., users, orders, inventory"
              required
              {...form.getInputProps('resource')}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <TextInput
              label="Action"
              placeholder="e.g., read, write, manage, delete"
              required
              {...form.getInputProps('action')}
            />
          </Grid.Col>
        </Grid>

        <Group justify="flex-end" gap="sm">
          <Button variant="light" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {permission ? 'Update Permission' : 'Create Permission'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

interface RoleModalProps {
  role?: Role;
  onClose: () => void;
  onSuccess: () => void;
}

function RoleModal({ role, onClose, onSuccess }: RoleModalProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm({
    initialValues: {
      name: role?.name || '',
      description: role?.description || '',
    },
    validate: {
      name: (value) => (!value ? 'Role name is required' : null),
    },
  });

  const fetchPermissions = async () => {
    try {
      const { data: allPermissions, error: permError } = await supabaseClient
        .from('permissions')
        .select('*')
        .order('resource', { ascending: true });

      if (permError) throw permError;
      setPermissions(allPermissions || []);

      if (role) {
        // Fetch current role permissions
        const { data: rolePerms, error: rolePermError } = await supabaseClient
          .from('role_permissions')
          .select('permission_id')
          .eq('role_id', role.id);

        if (rolePermError) throw rolePermError;
        setSelectedPermissions(rolePerms?.map((rp) => rp.permission_id) || []);
      }
    } catch (err) {
      notifications.show({
        title: 'Load Failed',
        message: 'Failed to load permissions',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      let roleId = role?.id;

      if (role) {
        // Update existing role
        const { error } = await supabaseClient
          .from('roles')
          .update(values)
          .eq('id', role.id);

        if (error) throw error;
      } else {
        // Create new role
        const { data, error } = await supabaseClient
          .from('roles')
          .insert(values)
          .select('id')
          .single();

        if (error) throw error;
        roleId = data.id;
      }

      if (roleId) {
        // Delete existing role permissions
        await supabaseClient
          .from('role_permissions')
          .delete()
          .eq('role_id', roleId);

        // Insert new role permissions
        if (selectedPermissions.length > 0) {
          const rolePermissions = selectedPermissions.map((permissionId) => ({
            role_id: roleId,
            permission_id: permissionId,
          }));

          const { error: permError } = await supabaseClient
            .from('role_permissions')
            .insert(rolePermissions);

          if (permError) throw permError;
        }
      }

      notifications.show({
        title: role ? 'Role Updated' : 'Role Created',
        message: `Role "${values.name}" has been ${role ? 'updated' : 'created'} successfully.`,
        color: 'green',
      });

      onSuccess();
      onClose();
    } catch (err) {
      notifications.show({
        title: 'Save Failed',
        message: err instanceof Error ? err.message : 'Failed to save role',
        color: 'red',
      });
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId],
    );
  };

  useEffect(() => {
    fetchPermissions();
  }, [role]);

  if (loading) {
    return <Loader />;
  }

  const groupedPermissions = permissions.reduce(
    (acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    },
    {} as Record<string, Permission[]>,
  );

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          label="Role Name"
          placeholder="e.g., admin, moderator"
          required
          {...form.getInputProps('name')}
        />

        <Textarea
          label="Description"
          placeholder="Brief description of this role"
          {...form.getInputProps('description')}
        />

        <Divider label="Role Permissions" labelPosition="center" />

        <Box mah={450} style={{ overflow: 'auto' }}>
          <Accordion multiple variant="contained" radius="md">
            {Object.entries(groupedPermissions).map(
              ([resource, resourcePermissions]) => (
                <Accordion.Item key={resource} value={resource}>
                  <Accordion.Control>
                    <Group justify="space-between" pr="md">
                      <Group>
                        <Text fw={600} tt="capitalize" c="blue" size="md">
                          {resource}
                        </Text>
                        <Badge size="sm" variant="light" color="gray">
                          {resourcePermissions.length} permission
                          {resourcePermissions.length !== 1 ? 's' : ''}
                        </Badge>
                      </Group>
                      <Badge
                        size="sm"
                        variant="light"
                        color={
                          resourcePermissions.every((p) =>
                            selectedPermissions.includes(p.id),
                          )
                            ? 'green'
                            : resourcePermissions.some((p) =>
                                  selectedPermissions.includes(p.id),
                                )
                              ? 'yellow'
                              : 'gray'
                        }
                      >
                        {
                          resourcePermissions.filter((p) =>
                            selectedPermissions.includes(p.id),
                          ).length
                        }{' '}
                        selected
                      </Badge>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="md" pt="sm">
                      {resourcePermissions.map((permission) => (
                        <Card key={permission.id} withBorder radius="sm" p="md">
                          <Checkbox
                            size="md"
                            label={
                              <Box ml="sm" style={{ width: '100%' }}>
                                <Stack gap="xs">
                                  <Group
                                    justify="space-between"
                                    align="flex-start"
                                  >
                                    <Text size="sm" fw={600}>
                                      {permission.name}
                                    </Text>
                                    <Badge
                                      size="xs"
                                      variant="light"
                                      color="teal"
                                    >
                                      {permission.action}
                                    </Badge>
                                  </Group>
                                  {permission.description && (
                                    <Text
                                      size="xs"
                                      c="dimmed"
                                      style={{ lineHeight: 1.4 }}
                                    >
                                      {permission.description}
                                    </Text>
                                  )}
                                </Stack>
                              </Box>
                            }
                            checked={selectedPermissions.includes(
                              permission.id,
                            )}
                            onChange={() =>
                              handlePermissionToggle(permission.id)
                            }
                            styles={{
                              body: { alignItems: 'flex-start', width: '100%' },
                              labelWrapper: { width: '100%' },
                              input: { marginTop: '4px', flexShrink: 0 },
                            }}
                          />
                        </Card>
                      ))}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              ),
            )}
          </Accordion>
        </Box>

        <Group justify="flex-end" gap="sm">
          <Button variant="light" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{role ? 'Update Role' : 'Create Role'}</Button>
        </Group>
      </Stack>
    </form>
  );
}

export function RolePermissionManagement() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [
    permissionModalOpened,
    { open: openPermissionModal, close: closePermissionModal },
  ] = useDisclosure(false);
  const [roleModalOpened, { open: openRoleModal, close: closeRoleModal }] =
    useDisclosure(false);
  const [editingPermission, setEditingPermission] = useState<
    Permission | undefined
  >();
  const [editingRole, setEditingRole] = useState<Role | undefined>();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch permissions
      const { data: permissionsData, error: permError } = await supabaseClient
        .from('permissions')
        .select('*')
        .order('resource', { ascending: true });

      if (permError) throw permError;
      setPermissions(permissionsData || []);

      // Fetch roles with permissions
      const { data: rolesData, error: rolesError } = await supabaseClient
        .from('roles')
        .select(
          `
          *,
          role_permissions (
            permission_id,
            permissions (*)
          )
        `,
        )
        .order('name', { ascending: true });

      if (rolesError) throw rolesError;

      // Transform the data to flatten permissions
      const rolesWithPermissions =
        rolesData?.map((role) => ({
          ...role,
          permissions:
            role.role_permissions
              ?.map((rp: any) => rp.permissions)
              .filter(Boolean) || [],
        })) || [];

      setRoles(rolesWithPermissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const deletePermission = async (permission: Permission) => {
    try {
      const { error } = await supabaseClient
        .from('permissions')
        .delete()
        .eq('id', permission.id);

      if (error) throw error;

      notifications.show({
        title: 'Permission Deleted',
        message: `Permission "${permission.name}" has been deleted.`,
        color: 'green',
      });

      await fetchData();
    } catch (err) {
      notifications.show({
        title: 'Delete Failed',
        message:
          err instanceof Error ? err.message : 'Failed to delete permission',
        color: 'red',
      });
    }
  };

  const deleteRole = async (role: Role) => {
    try {
      const { error } = await supabaseClient
        .from('roles')
        .delete()
        .eq('id', role.id);

      if (error) throw error;

      notifications.show({
        title: 'Role Deleted',
        message: `Role "${role.name}" has been deleted.`,
        color: 'green',
      });

      await fetchData();
    } catch (err) {
      notifications.show({
        title: 'Delete Failed',
        message: err instanceof Error ? err.message : 'Failed to delete role',
        color: 'red',
      });
    }
  };

  const confirmDeletePermission = (permission: Permission) => {
    modals.openConfirmModal({
      title: 'Delete Permission',
      children: (
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete the permission{' '}
            <Text component="span" fw={600}>
              "{permission.name}"
            </Text>
            ?
          </Text>
          <Alert color="red" title="Warning">
            This will remove the permission from all roles and cannot be undone.
          </Alert>
        </Stack>
      ),
      labels: { confirm: 'Delete Permission', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => deletePermission(permission),
    });
  };

  const confirmDeleteRole = (role: Role) => {
    modals.openConfirmModal({
      title: 'Delete Role',
      children: (
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete the role{' '}
            <Text component="span" fw={600}>
              "{role.name}"
            </Text>
            ?
          </Text>
          <Alert color="red" title="Warning">
            This will remove the role from all users and cannot be undone.
          </Alert>
        </Stack>
      ),
      labels: { confirm: 'Delete Role', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteRole(role),
    });
  };

  const handleEditPermission = (permission: Permission) => {
    setEditingPermission(permission);
    openPermissionModal();
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    openRoleModal();
  };

  const handleCreatePermission = () => {
    setEditingPermission(undefined);
    openPermissionModal();
  };

  const handleCreateRole = () => {
    setEditingRole(undefined);
    openRoleModal();
  };

  const handleModalSuccess = async () => {
    await fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <Paper withBorder shadow="sm" radius="md" p="xl">
        <Group justify="center">
          <Loader size="lg" />
        </Group>
      </Paper>
    );
  }

  return (
    <Stack gap="xl">
      {error && (
        <Alert color="red" title="Error">
          {error}
        </Alert>
      )}

      {/* Permissions Section */}
      <Paper withBorder shadow="sm" radius="md" p="xl">
        <Stack gap="md">
          <Group justify="space-between">
            <Group>
              <IconKey size={24} />
              <Title order={3}>Permissions Management</Title>
            </Group>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleCreatePermission}
            >
              New Permission
            </Button>
          </Group>

          <Text c="dimmed">
            Manage system permissions that can be assigned to roles.
          </Text>

          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Resource</Table.Th>
                <Table.Th>Action</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {permissions.map((permission) => (
                <Table.Tr key={permission.id}>
                  <Table.Td>
                    <Text fw={500}>{permission.name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="blue">
                      {permission.resource}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="green">
                      {permission.action}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {permission.description || 'No description'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="Edit permission">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => handleEditPermission(permission)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete permission">
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => confirmDeletePermission(permission)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {permissions.length === 0 && (
            <Text ta="center" c="dimmed" py="xl">
              No permissions found. Create your first permission to get started.
            </Text>
          )}
        </Stack>
      </Paper>

      {/* Roles Section */}
      <Paper withBorder shadow="sm" radius="md" p="xl">
        <Stack gap="md">
          <Group justify="space-between">
            <Group>
              <IconUsers size={24} />
              <Title order={3}>Roles Management</Title>
            </Group>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleCreateRole}
            >
              New Role
            </Button>
          </Group>

          <Text c="dimmed">
            Manage user roles and assign permissions to each role.
          </Text>

          <Stack gap="md">
            {roles.map((role) => (
              <Card key={role.id} withBorder>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <div>
                      <Group gap="sm">
                        <IconShield size={20} />
                        <Text fw={600} size="lg">
                          {role.name}
                        </Text>
                      </Group>
                      {role.description && (
                        <Text size="sm" c="dimmed" mt="xs">
                          {role.description}
                        </Text>
                      )}
                    </div>
                    <Group gap="xs">
                      <Tooltip label="Edit role">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => handleEditRole(role)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete role">
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => confirmDeleteRole(role)}
                          disabled={role.name.toLowerCase() === 'super_admin'}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>

                  {role.permissions.length > 0 ? (
                    <Group gap="xs">
                      <Text size="sm" c="dimmed">
                        Permissions:
                      </Text>
                      {role.permissions.map((permission) => (
                        <Badge
                          key={permission.id}
                          size="sm"
                          variant="light"
                          color="indigo"
                        >
                          {permission.name}
                        </Badge>
                      ))}
                    </Group>
                  ) : (
                    <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
                      No permissions assigned
                    </Text>
                  )}
                </Stack>
              </Card>
            ))}
          </Stack>

          {roles.length === 0 && (
            <Text ta="center" c="dimmed" py="xl">
              No roles found. Create your first role to get started.
            </Text>
          )}
        </Stack>
      </Paper>

      {/* Permission Modal */}
      <Modal
        opened={permissionModalOpened}
        onClose={closePermissionModal}
        title={editingPermission ? 'Edit Permission' : 'Create New Permission'}
        size="md"
      >
        <PermissionModal
          permission={editingPermission}
          onClose={closePermissionModal}
          onSuccess={handleModalSuccess}
        />
      </Modal>

      {/* Role Modal */}
      <Modal
        opened={roleModalOpened}
        onClose={closeRoleModal}
        title={editingRole ? 'Edit Role' : 'Create New Role'}
        size="xl"
      >
        <RoleModal
          role={editingRole}
          onClose={closeRoleModal}
          onSuccess={handleModalSuccess}
        />
      </Modal>
    </Stack>
  );
}
