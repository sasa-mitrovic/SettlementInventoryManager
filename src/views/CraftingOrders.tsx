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
  Paper,
  Badge,
  Switch,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Avatar,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconArrowLeft,
  IconCheck,
  IconSearch,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { supabaseClient } from '../supabase/supabaseClient';
import { useOptimizedUserWithProfile } from '../supabase/loader';

interface CraftingOrder {
  id: string;
  created_at: string;
  item_id: string;
  item_name: string;
  item_icon?: string;
  item_tier?: string;
  quantity: number;
  sector?: string;
  status: 'unassigned' | 'assigned' | 'completed';
  placed_by: string;
  claimed_by?: string;
  completed_at?: string;
  completed_by?: string;
  placed_by_profile?: {
    in_game_name?: string;
    email: string;
  };
  claimed_by_profile?: {
    in_game_name?: string;
    email: string;
  };
  completed_by_profile?: {
    in_game_name?: string;
    email: string;
  };
}

interface BitjitaItem {
  id: string;
  name: string;
  icon: string;
  tier: string;
}

export function CraftingOrders() {
  const [orders, setOrders] = useState<CraftingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [claimingOrder, setClaimingOrder] = useState<string | null>(null);
  const [completingOrder, setCompletingOrder] = useState<string | null>(null);

  // Modal states
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [items, setItems] = useState<BitjitaItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const { userProfile } = useOptimizedUserWithProfile();

  const form = useForm({
    initialValues: {
      item_id: '',
      quantity: 1,
    },
    validate: {
      item_id: (value) => (!value ? 'Please select an item' : null),
      quantity: (value) =>
        value < 1
          ? 'Quantity must be at least 1'
          : value > 1000
            ? 'Quantity cannot exceed 1000'
            : null,
    },
  });

  const fetchItems = async (search = '') => {
    try {
      setItemsLoading(true);
      const response = await fetch('https://bitjita.com/api/items');
      const data = await response.json();

      let filteredItems = data;
      if (search) {
        filteredItems = data.filter((item: BitjitaItem) =>
          item.name.toLowerCase().includes(search.toLowerCase()),
        );
      }

      setItems(filteredItems.slice(0, 50)); // Limit to 50 items for performance
    } catch (err) {
      console.error('Failed to fetch items:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to load items from API',
        color: 'red',
      });
    } finally {
      setItemsLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabaseClient
        .from('crafting_orders')
        .select(
          `
          *,
          placed_by_profile:user_profiles!placed_by(in_game_name, email),
          claimed_by_profile:user_profiles!claimed_by(in_game_name, email),
          completed_by_profile:user_profiles!completed_by(in_game_name, email)
        `,
        )
        .order('status', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

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

      await fetchOrders();
    } catch (err) {
      console.error('Failed to claim order:', err);
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

      await fetchOrders();
    } catch (err) {
      console.error('Failed to complete order:', err);
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

  const submitOrder = async (values: typeof form.values) => {
    if (!userProfile) return;

    const selectedItem = items.find((item) => item.id === values.item_id);
    if (!selectedItem) return;

    try {
      const { error } = await supabaseClient.from('crafting_orders').insert({
        item_id: selectedItem.id,
        item_name: selectedItem.name,
        item_icon: selectedItem.icon,
        item_tier: selectedItem.tier,
        quantity: values.quantity,
        placed_by: userProfile.id,
        status: 'unassigned',
      });

      if (error) throw error;

      notifications.show({
        title: 'Order Created',
        message: `Successfully created order for ${selectedItem.name} (x${values.quantity})`,
        color: 'green',
      });

      form.reset();
      closeModal();
      await fetchOrders();
    } catch (err) {
      console.error('Failed to create order:', err);
      notifications.show({
        title: 'Create Failed',
        message: err instanceof Error ? err.message : 'Failed to create order',
        color: 'red',
      });
    }
  };

  const canCompleteOrder = (order: CraftingOrder) => {
    if (!userProfile) return false;
    return (
      order.placed_by === userProfile.id || order.claimed_by === userProfile.id
    );
  };

  const formatUserName = (profile?: {
    in_game_name?: string;
    email: string;
  }) => {
    if (!profile) return 'Unknown User';
    return profile.in_game_name || profile.email;
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

  const itemSelectData = items.map((item) => ({
    value: item.id,
    label: `${item.name} (${item.tier})`,
    item: item, // Store full item for rendering
  }));

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (modalOpened) {
      fetchItems();
    }
  }, [modalOpened]);

  useEffect(() => {
    if (searchValue && modalOpened) {
      const timeoutId = setTimeout(() => {
        fetchItems(searchValue);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchValue, modalOpened]);

  if (loading) {
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
              to="/dashboard"
              leftSection={<IconArrowLeft size={16} />}
              variant="light"
            >
              Back to Dashboard
            </Button>
            <Title order={1}>Crafting Orders</Title>
          </Group>

          <Group>
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

        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        <Paper withBorder shadow="sm" radius="md" p="xl">
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Order Date</Table.Th>
                <Table.Th>Sector</Table.Th>
                <Table.Th>Item</Table.Th>
                <Table.Th>Quantity</Table.Th>
                <Table.Th>Placed By</Table.Th>
                <Table.Th>Claimed By</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredOrders.map((order) => (
                <Table.Tr key={order.id}>
                  <Table.Td>
                    {new Date(order.created_at).toLocaleDateString()}
                  </Table.Td>
                  <Table.Td>{order.sector || 'N/A'}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      {order.item_icon && (
                        <Avatar src={order.item_icon} size="sm" />
                      )}
                      <div>
                        <Text fw={500}>{order.item_name}</Text>
                        {order.item_tier && (
                          <Text size="xs" c="dimmed">
                            {order.item_tier}
                          </Text>
                        )}
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500}>{order.quantity}</Text>
                  </Table.Td>
                  <Table.Td>{formatUserName(order.placed_by_profile)}</Table.Td>
                  <Table.Td>
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
                    ) : order.claimed_by_profile ? (
                      formatUserName(order.claimed_by_profile)
                    ) : (
                      'N/A'
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={getStatusBadgeColor(order.status)} size="sm">
                      {order.status.charAt(0).toUpperCase() +
                        order.status.slice(1)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
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
      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title="Create New Crafting Order"
        size="md"
      >
        <form onSubmit={form.onSubmit(submitOrder)}>
          <Stack gap="md">
            <TextInput
              label="Search Items"
              placeholder="Type to search for items..."
              leftSection={<IconSearch size={16} />}
              value={searchValue}
              onChange={(event) => setSearchValue(event.currentTarget.value)}
            />

            <Select
              label="Select Item"
              placeholder="Choose an item to craft"
              data={itemSelectData}
              searchable
              nothingFoundMessage={
                itemsLoading ? 'Loading...' : 'No items found'
              }
              renderOption={({ option }) => {
                const item = (option as any).item;
                return (
                  <Group gap="xs">
                    <Avatar src={item.icon} size="sm" />
                    <div>
                      <Text>{item.name}</Text>
                      <Text size="xs" c="dimmed">
                        {item.tier}
                      </Text>
                    </div>
                  </Group>
                );
              }}
              {...form.getInputProps('item_id')}
            />

            <NumberInput
              label="Quantity"
              placeholder="Enter quantity"
              min={1}
              max={1000}
              {...form.getInputProps('quantity')}
            />

            <Group justify="flex-end" gap="sm">
              <Button variant="light" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit">Create Order</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
