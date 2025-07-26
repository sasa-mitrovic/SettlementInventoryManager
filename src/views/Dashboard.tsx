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
  Badge,
  Alert,
} from '@mantine/core';
import {
  IconUsers,
  IconPackage,
  IconHammer,
  IconSettings,
  IconMapPin,
  IconInfoCircle,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useOptimizedUserWithProfile } from '../supabase/loader';
import { useSettlement } from '../contexts/SettlementContext';
import { getPermissionLevel, getPermissionColor } from '../types/settlement';
import { PermissionGate } from '../components/PermissionGate';
import { useSettlementCraftingOrderCounts } from '../hooks/useSettlementCraftingOrderCounts';

export function Dashboard() {
  const { userProfile, loading } = useOptimizedUserWithProfile();
  const { currentSettlement, isLoading: settlementLoading } = useSettlement();
  const { counts, loading: countsLoading } = useSettlementCraftingOrderCounts();

  if (loading || settlementLoading) {
    return (
      <Container size="lg" py="xl">
        <Text>Loading...</Text>
      </Container>
    );
  }

  if (!currentSettlement) {
    return (
      <Container size="lg" py="xl">
        <Alert
          icon={<IconInfoCircle size={16} />}
          color="yellow"
          variant="light"
        >
          <Title order={3}>No Settlement Selected</Title>
          <Text mt="sm">
            You don't have access to any settlements or no settlement is
            currently selected. Please check your settlement permissions or
            contact an administrator.
          </Text>
        </Alert>
      </Container>
    );
  }

  const permissionLevel = getPermissionLevel(currentSettlement);
  const permissionColor = getPermissionColor(permissionLevel);

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Box>
          <Group justify="space-between" align="flex-start" mb="md">
            <Box>
              <Group gap="sm" mb="xs">
                <IconMapPin size={24} />
                <Title order={1}>{currentSettlement.name} Dashboard</Title>
                <Badge color={permissionColor} variant="light">
                  {permissionLevel}
                </Badge>
              </Group>
              <Text c="dimmed" size="lg">
                Welcome back, {userProfile?.in_game_name || userProfile?.email}
              </Text>
              <Text c="dimmed" size="sm">
                Role: {userProfile?.role?.name || 'No role assigned'}
              </Text>
            </Box>
          </Group>

          {/* Settlement Info */}
          <Paper withBorder shadow="sm" radius="md" p="md" mb="xl">
            <Group justify="space-between">
              <Group>
                <Box>
                  <Text size="sm" c="dimmed">
                    Settlement
                  </Text>
                  <Text fw={500}>{currentSettlement.name}</Text>
                </Box>
                <Box>
                  <Text size="sm" c="dimmed">
                    Region
                  </Text>
                  <Text fw={500}>{currentSettlement.regionName}</Text>
                </Box>
                <Box>
                  <Text size="sm" c="dimmed">
                    Supplies
                  </Text>
                  <Text fw={500}>
                    {currentSettlement.supplies.toLocaleString()}
                  </Text>
                </Box>
                <Box>
                  <Text size="sm" c="dimmed">
                    Treasury
                  </Text>
                  <Text fw={500}>
                    {parseInt(currentSettlement.treasury).toLocaleString()} HC
                  </Text>
                </Box>
              </Group>
              <Text size="sm" c="dimmed">
                Settlement ID: {currentSettlement.entityId}
              </Text>
            </Group>
          </Paper>
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
                <IconHammer size={48} color="var(--mantine-color-orange-6)" />
                <Title order={3} ta="center">
                  Crafting Orders
                </Title>
                <Text ta="center" c="dimmed">
                  Manage crafting orders and track completion status
                </Text>
                {!countsLoading && (
                  <Group gap="md">
                    <Text size="sm" c="dimmed">
                      <Text component="span" fw={600} c="orange">
                        {counts.open}
                      </Text>{' '}
                      Open
                    </Text>
                    <Text size="sm" c="dimmed">
                      <Text component="span" fw={600} c="blue">
                        {counts.in_progress}
                      </Text>{' '}
                      In Progress
                    </Text>
                    <Text size="sm" c="dimmed">
                      <Text component="span" fw={600} c="green">
                        {counts.completed}
                      </Text>{' '}
                      Completed
                    </Text>
                  </Group>
                )}
                <PermissionGate
                  permission="crafting_orders.read"
                  fallback={
                    <Text c="red" size="sm" ta="center">
                      You need 'crafting_orders.read' permission to access this
                      page
                    </Text>
                  }
                >
                  <Button
                    component={Link}
                    to="/crafting-orders"
                    leftSection={<IconHammer size={16} />}
                    variant="light"
                    size="md"
                    fullWidth
                  >
                    View Crafting Orders
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
      </Stack>
    </Container>
  );
}
