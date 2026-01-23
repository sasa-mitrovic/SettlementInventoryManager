import { useState } from 'react';
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
  Paper,
  Badge,
  Switch,
  Avatar,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconArrowLeft,
  IconCheck,
  IconX,
  IconUserMinus,
  IconFileText,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { supabaseClient } from '../supabase/supabaseClient';
import { useOptimizedUserWithProfile } from '../supabase/loader';
import {
  useSettlementCraftingOrders,
  SettlementCraftingOrder,
} from '../hooks/useSettlementCraftingOrders';
import { CraftingOrderModal } from '../components/CraftingOrderModal';
import { DiscordIntegrationButton } from '../components/DiscordIntegrationButton';
import { DiscordSetupModal } from '../components/DiscordSetupModal';
import { DiscordOAuthSetup } from '../components/DiscordOAuthSetup';
import { DiscordEditModal } from '../components/DiscordEditModal';

// Use the SettlementCraftingOrder interface from the hook
type CraftingOrder = SettlementCraftingOrder;

export function CraftingOrders() {
  const {
    data: orders,
    loading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useSettlementCraftingOrders();
  const [showCompleted, setShowCompleted] = useState(false);
  const [claimingOrder, setClaimingOrder] = useState<string | null>(null);
  const [completingOrder, setCompletingOrder] = useState<string | null>(null);

  // Modal states
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [
    discordModalOpened,
    { open: openDiscordModal, close: closeDiscordModal },
  ] = useDisclosure(false);
  const [oauthModalOpened, { open: openOAuthModal, close: closeOAuthModal }] =
    useDisclosure(false);
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);

  // Key to force refresh of Discord button after edits
  const [discordRefreshKey, setDiscordRefreshKey] = useState(0);

  const { userProfile } = useOptimizedUserWithProfile();

  const claimOrder = async (orderId: string) => {
    if (!userProfile) return;

    setClaimingOrder(orderId);
    try {
      const { error } = await supabaseClient
        .from('crafting_orders')
        .update({
          status: 'assigned',
          claimed_by: userProfile.id,
        })
        .eq('id', orderId)
        .eq('status', 'unassigned');

      if (error) throw error;

      notifications.show({
        title: 'Order Claimed',
        message: 'You have successfully claimed this crafting order.',
        color: 'green',
      });

      await refetchOrders();
    } catch (err) {
      notifications.show({
        title: 'Claim Failed',
        message: err instanceof Error ? err.message : 'Failed to claim order',
        color: 'red',
      });
    } finally {
      setClaimingOrder(null);
    }
  };

  const completeOrder = async (orderId: string) => {
    if (!userProfile) return;

    setCompletingOrder(orderId);
    try {
      const { error } = await supabaseClient
        .from('crafting_orders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: userProfile.id,
        })
        .eq('id', orderId)
        .in('status', ['assigned', 'unassigned']);

      if (error) throw error;

      notifications.show({
        title: 'Order Completed',
        message: 'The crafting order has been marked as completed.',
        color: 'green',
      });

      await refetchOrders();
    } catch (err) {
      notifications.show({
        title: 'Complete Failed',
        message:
          err instanceof Error ? err.message : 'Failed to complete order',
        color: 'red',
      });
    } finally {
      setCompletingOrder(null);
    }
  };

  const confirmCompleteOrder = (order: CraftingOrder) => {
    modals.openConfirmModal({
      title: 'Complete Order',
      children: (
        <Text size="sm">
          Are you sure you want to mark this order as completed?
          <br />
          <strong>
            {order.item_name} (x{order.quantity})
          </strong>
        </Text>
      ),
      labels: { confirm: 'Complete Order', cancel: 'Cancel' },
      confirmProps: { color: 'green' },
      onConfirm: () => completeOrder(order.id),
    });
  };

  const cancelOrder = async (orderId: string) => {
    try {
      // Use the database function to handle cancellation with proper permissions
      const { data, error } = await supabaseClient.rpc(
        'cancel_crafting_order',
        {
          order_id: orderId,
        },
      );

      if (error) {
        throw error;
      }

      // Check the response from our database function
      if (!data.success) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      notifications.show({
        title: 'Order Cancelled',
        message: 'The crafting order has been cancelled and removed.',
        color: 'blue',
      });

      await refetchOrders();
    } catch (err) {
      notifications.show({
        title: 'Cancel Failed',
        message: err instanceof Error ? err.message : 'Failed to cancel order',
        color: 'red',
      });
    }
  };

  const confirmCancelOrder = (order: CraftingOrder) => {
    modals.openConfirmModal({
      title: 'Cancel Order',
      children: (
        <Text size="sm">
          Are you sure you want to cancel this order? This action cannot be
          undone.
          <br />
          <strong>
            {order.item_name} (x{order.quantity})
          </strong>
        </Text>
      ),
      labels: { confirm: 'Cancel Order', cancel: 'Keep Order' },
      confirmProps: { color: 'red' },
      onConfirm: () => cancelOrder(order.id),
    });
  };

  const unclaimOrder = async (orderId: string) => {
    try {
      const { error } = await supabaseClient
        .from('crafting_orders')
        .update({
          status: 'unassigned',
          claimed_by: null,
        })
        .eq('id', orderId);

      if (error) throw error;

      notifications.show({
        title: 'Order Unclaimed',
        message:
          'You have unclaimed this order. It is now available for others to claim.',
        color: 'blue',
      });

      await refetchOrders();
    } catch (err) {
      notifications.show({
        title: 'Unclaim Failed',
        message: err instanceof Error ? err.message : 'Failed to unclaim order',
        color: 'red',
      });
    }
  };

  const confirmUnclaimOrder = (order: CraftingOrder) => {
    modals.openConfirmModal({
      title: 'Unclaim Order',
      children: (
        <Text size="sm">
          Are you sure you want to unclaim this order? It will be returned to
          unassigned status and available for others to claim.
          <br />
          <strong>
            {order.item_name} (x{order.quantity})
          </strong>
        </Text>
      ),
      labels: { confirm: 'Unclaim Order', cancel: 'Keep Claimed' },
      confirmProps: { color: 'blue' },
      onConfirm: () => unclaimOrder(order.id),
    });
  };

  const canCompleteOrder = (order: CraftingOrder) => {
    if (!userProfile) return false;
    return (
      order.placed_by === userProfile.id || order.claimed_by === userProfile.id
    );
  };

  const canCancelOrder = (order: CraftingOrder) => {
    if (!userProfile) return false;
    // Only the person who placed the order can cancel it
    return order.placed_by === userProfile.id;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'unassigned':
        return 'red';
      case 'assigned':
        return 'yellow';
      case 'completed':
        return 'green';
      default:
        return 'gray';
    }
  };

  const filteredOrders = orders.filter((order) =>
    showCompleted ? order.status === 'completed' : order.status !== 'completed',
  );

  if (ordersLoading) {
    return (
      <Container size="xl" py="xl">
        <Center h={400}>
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Group>
            <Button
              component={Link}
              to="/"
              leftSection={<IconArrowLeft size={16} />}
              variant="light"
            >
              Back to Dashboard
            </Button>
            <Title order={1}>Crafting Orders</Title>
          </Group>

          <Group>
            <DiscordIntegrationButton
              key={discordRefreshKey}
              onManualSetupClick={openDiscordModal}
              onOAuthSetupClick={openOAuthModal}
              onEditClick={openEditModal}
            />
            <Switch
              label="Show Completed Orders"
              checked={showCompleted}
              onChange={(event) =>
                setShowCompleted(event.currentTarget.checked)
              }
            />
            <Button leftSection={<IconPlus size={16} />} onClick={openModal}>
              New Crafting Order
            </Button>
          </Group>
        </Group>

        {ordersError && (
          <Alert color="red" title="Error">
            {ordersError}
          </Alert>
        )}

        <Paper withBorder shadow="sm" radius="md" p="xl">
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th ta="center">Reward</Table.Th>
                <Table.Th ta="center">Order Date</Table.Th>
                <Table.Th ta="center">Sector</Table.Th>
                <Table.Th ta="center">Item</Table.Th>
                <Table.Th ta="center">Quantity</Table.Th>
                <Table.Th ta="center">Placed By</Table.Th>
                <Table.Th ta="center">Claimed By</Table.Th>
                <Table.Th ta="center">Status</Table.Th>
                <Table.Th ta="center">Actions</Table.Th>
                <Table.Th ta="center">Notes</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredOrders.map((order) => (
                <Table.Tr key={order.id}>
                  <Table.Td ta="center">{order.hexcoin}</Table.Td>
                  <Table.Td ta="center">
                    {new Date(order.created_at).toLocaleDateString()}
                  </Table.Td>
                  <Table.Td ta="center">{order.sector || 'N/A'}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      {order.item_icon && (
                        <Avatar src={order.item_icon} size="sm" />
                      )}
                      <div>
                        <Text fw={500}>{order.item_name}</Text>
                        {order.item_tier && (
                          <Text size="xs" c="dimmed">
                            T{order.item_tier}
                          </Text>
                        )}
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td ta="center">
                    <Text fw={500}>{order.quantity}</Text>
                  </Table.Td>
                  <Table.Td ta="center">
                    {order.placed_by_name || 'Unknown User'}
                  </Table.Td>
                  <Table.Td ta="center">
                    {order.status === 'unassigned' ? (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => claimOrder(order.id)}
                        loading={claimingOrder === order.id}
                        disabled={claimingOrder === order.id}
                      >
                        Claim Order
                      </Button>
                    ) : order.claimed_by ? (
                      <Group gap="xs" justify="center">
                        <Text>{order.claimed_by_name}</Text>
                        {userProfile &&
                          order.claimed_by === userProfile.id &&
                          order.status !== 'completed' && (
                            <Button
                              size="xs"
                              variant="subtle"
                              color="blue"
                              leftSection={<IconUserMinus size={12} />}
                              onClick={() => confirmUnclaimOrder(order)}
                            >
                              Unclaim
                            </Button>
                          )}
                      </Group>
                    ) : (
                      'N/A'
                    )}
                  </Table.Td>
                  <Table.Td ta="center">
                    <Badge color={getStatusBadgeColor(order.status)} size="sm">
                      {order.status.charAt(0).toUpperCase() +
                        order.status.slice(1)}
                    </Badge>
                  </Table.Td>
                  <Table.Td ta="center">
                    <Group gap="xs" justify="center">
                      {order.status !== 'completed' &&
                        canCompleteOrder(order) && (
                          <Button
                            size="xs"
                            color="green"
                            variant="light"
                            leftSection={<IconCheck size={14} />}
                            onClick={() => confirmCompleteOrder(order)}
                            loading={completingOrder === order.id}
                            disabled={completingOrder === order.id}
                          >
                            Complete
                          </Button>
                        )}
                      {order.status !== 'completed' &&
                        canCancelOrder(order) && (
                          <Button
                            size="xs"
                            color="red"
                            variant="light"
                            leftSection={<IconX size={14} />}
                            onClick={() => confirmCancelOrder(order)}
                          >
                            Cancel
                          </Button>
                        )}
                    </Group>
                  </Table.Td>
                  <Table.Td ta="center">
                    {order.notes ? (
                      <Tooltip label={order.notes} multiline maw={300}>
                        <IconFileText
                          size={16}
                          style={{
                            cursor: 'pointer',
                            color: 'var(--mantine-color-blue-6)',
                          }}
                        />
                      </Tooltip>
                    ) : (
                      <Text size="sm" c="dimmed">
                        -
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {filteredOrders.length === 0 && (
            <Center h={200}>
              <Stack align="center">
                <Text size="lg" c="dimmed">
                  {showCompleted
                    ? 'No completed orders found'
                    : 'No active orders found'}
                </Text>
                <Text size="sm" c="dimmed">
                  {showCompleted
                    ? 'Completed orders will appear here'
                    : 'Create a new crafting order to get started'}
                </Text>
              </Stack>
            </Center>
          )}
        </Paper>
      </Stack>

      {/* New Order Modal */}
      <CraftingOrderModal
        opened={modalOpened}
        onClose={closeModal}
        onSuccess={refetchOrders}
      />

      {/* Discord Setup Modal */}
      <DiscordSetupModal
        opened={discordModalOpened}
        onClose={closeDiscordModal}
        onSuccess={() => {
          setDiscordRefreshKey((k) => k + 1);
          closeDiscordModal();
        }}
      />

      {/* Discord OAuth Setup Modal */}
      <DiscordOAuthSetup
        opened={oauthModalOpened}
        onClose={() => {
          setDiscordRefreshKey((k) => k + 1);
          closeOAuthModal();
        }}
      />

      {/* Discord Edit Modal */}
      <DiscordEditModal
        opened={editModalOpened}
        onClose={closeEditModal}
        onSuccess={() => {
          setDiscordRefreshKey((k) => k + 1);
          closeEditModal();
        }}
      />
    </Container>
  );
}
