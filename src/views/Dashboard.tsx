import {
  Box,
  Container,
  Grid,
  Paper,
  Stack,
  Text,
  Title,
  Button,
  Group,
} from '@mantine/core';
import {
  IconUsers,
  IconPackage,
  IconChartBar,
  IconSettings,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useOptimizedUserWithProfile } from '../supabase/loader';
import { PermissionGate } from '../components/PermissionGate';

export function Dashboard() {
  const { userProfile, loading } = useOptimizedUserWithProfile();

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <Text>Loading...</Text>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Box>
          <Title order={1} mb="md">
            Gloomhaven Dashboard
          </Title>
          <Text c="dimmed" size="lg">
            Welcome back, {userProfile?.in_game_name || userProfile?.email}
          </Text>
          <Text c="dimmed" size="sm">
            Role: {userProfile?.role?.name || 'No role assigned'}
          </Text>
        </Box>

        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper withBorder shadow="sm" radius="md" p="xl" h="100%">
              <Stack gap="md" align="center">
                <IconUsers size={48} color="var(--mantine-color-blue-6)" />
                <Title order={3} ta="center">
                  Settlement Members
                </Title>
                <Text ta="center" c="dimmed">
                  View all settlement members, their permissions, and activity
                  status
                </Text>
                <PermissionGate
                  permission="users.read"
                  fallback={
                    <Text c="red" size="sm" ta="center">
                      You need 'users.read' permission to access this page
                    </Text>
                  }
                >
                  <Button
                    component={Link}
                    to="/members"
                    leftSection={<IconUsers size={16} />}
                    variant="light"
                    size="md"
                    fullWidth
                  >
                    View Members
                  </Button>
                </PermissionGate>
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper withBorder shadow="sm" radius="md" p="xl" h="100%">
              <Stack gap="md" align="center">
                <IconPackage size={48} color="var(--mantine-color-green-6)" />
                <Title order={3} ta="center">
                  Settlement Inventory
                </Title>
                <Text ta="center" c="dimmed">
                  Browse all inventory items across storage containers and set
                  targets
                </Text>
                <PermissionGate
                  permission="inventory.read"
                  fallback={
                    <Text c="red" size="sm" ta="center">
                      You need 'inventory.read' permission to access this page
                    </Text>
                  }
                >
                  <Button
                    component={Link}
                    to="/inventory"
                    leftSection={<IconPackage size={16} />}
                    variant="light"
                    size="md"
                    fullWidth
                  >
                    View Inventory
                  </Button>
                </PermissionGate>
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper withBorder shadow="sm" radius="md" p="xl" h="100%">
              <Stack gap="md" align="center">
                <IconChartBar size={48} color="var(--mantine-color-orange-6)" />
                <Title order={3} ta="center">
                  Reports & Analytics
                </Title>
                <Text ta="center" c="dimmed">
                  View settlement reports and performance analytics
                </Text>
                <PermissionGate
                  permission="reports.read"
                  fallback={
                    <Text c="red" size="sm" ta="center">
                      You need 'reports.read' permission to access this page
                    </Text>
                  }
                >
                  <Button
                    leftSection={<IconChartBar size={16} />}
                    variant="light"
                    size="md"
                    fullWidth
                    disabled
                  >
                    Coming Soon
                  </Button>
                </PermissionGate>
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper withBorder shadow="sm" radius="md" p="xl" h="100%">
              <Stack gap="md" align="center">
                <IconSettings size={48} color="var(--mantine-color-gray-6)" />
                <Title order={3} ta="center">
                  Settings
                </Title>
                <Text ta="center" c="dimmed">
                  Manage settlement settings and configurations
                </Text>
                <PermissionGate
                  permission="settings.read"
                  fallback={
                    <Text c="red" size="sm" ta="center">
                      You need 'settings.read' permission to access this page
                    </Text>
                  }
                >
                  <Button
                    component={Link}
                    to="/settings"
                    leftSection={<IconSettings size={16} />}
                    variant="light"
                    size="md"
                    fullWidth
                  >
                    View Settings
                  </Button>
                </PermissionGate>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        <Paper withBorder shadow="sm" radius="md" p="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Settlement ID: 144115188105096768
            </Text>
            <Text size="sm" c="dimmed">
              Last updated: {new Date().toLocaleString()}
            </Text>
          </Group>
        </Paper>
      </Stack>
    </Container>
  );
}
