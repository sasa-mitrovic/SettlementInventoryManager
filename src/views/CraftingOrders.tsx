import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  IconX,
  IconUserMinus,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { supabaseClient } from '../supabase/supabaseClient';
import { useOptimizedUserWithProfile } from '../supabase/loader';
import { useUnifiedItems, UnifiedItem } from '../services/unifiedItemService';
import { useSettlement } from '../contexts/SettlementContext_simple';
import {
  useSettlementCraftingOrders,
  SettlementCraftingOrder,
} from '../hooks/useSettlementCraftingOrders';

// Use the SettlementCraftingOrder interface from the hook
type CraftingOrder = SettlementCraftingOrder;

export function CraftingOrders() {
  const { currentSettlement } = useSettlement();
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

  // Use the unified items service
  const {
    items: allItems,
    loading: itemsLoading,
    isCacheValid,
  } = useUnifiedItems();

  const [filteredItems, setFilteredItems] = useState<UnifiedItem[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const filterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize filtered items when allItems changes
  useEffect(() => {
    if (allItems && allItems.length > 0) {
      console.log('🔍 [CraftingOrders] Total items loaded:', allItems.length);
      const itemsByType = allItems.reduce(
        (acc, item) => {
          acc[item.type] = (acc[item.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
      console.log('📊 [CraftingOrders] Items by type:', itemsByType);
      console.log('📦 [CraftingOrders] Sample items:', allItems.slice(0, 5));
      setFilteredItems(allItems.slice(0, 50));
    }
  }, [allItems]);

  // Handle search with debouncing and cancellation
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);

      // Clear any pending filter operation
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }

      // Only proceed if items are available
      if (!allItems || allItems.length === 0 || itemsLoading) return;

      // Debounce the filtering with a very short delay
      filterTimeoutRef.current = setTimeout(() => {
        if (!value.trim()) {
          console.log('🔍 [CraftingOrders] Showing all items (first 50)');
          setFilteredItems(allItems.slice(0, 50));
        } else {
          const searchLower = value.toLowerCase();
          console.log('🔍 [CraftingOrders] Searching for:', searchLower);
          const filtered = allItems.filter(
            (item: UnifiedItem) =>
              item.name.toLowerCase().includes(searchLower) &&
              !item.name.endsWith('Output'),
          );
          console.log(
            '📝 [CraftingOrders] Search results:',
            filtered.length,
            'items found',
          );
          console.log(
            '📦 [CraftingOrders] Sample search results:',
            filtered.slice(0, 3),
          );
          setFilteredItems(filtered);
        }
      }, 50); // Very short 50ms debounce
    },
    [allItems, itemsLoading],
  );

  // Handle modal close
  const handleCloseModal = () => {
    // Clear any pending filter operation
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }
    closeModal();
  };

  const { userProfile } = useOptimizedUserWithProfile();

  const sectorOptions = [
    { value: 'Forest&Wood', label: 'Forest & Wood' },
    { value: 'Earth&Ore', label: 'Earth & Ore' },
    { value: 'Wild&Hide', label: 'Wild & Hide' },
    { value: 'Fields&Cloth', label: 'Fields & Cloth' },
    { value: 'Waters&Meals', label: 'Waters & Meals' },
    { value: 'Lore&Trade', label: 'Lore & Trade' },
    { value: 'SlayerSquad', label: 'Slayer Squad' },
  ];

  const form = useForm({
    initialValues: {
      item_id: '',
      quantity: 1,
      sector: '',
    },
    validate: {
      item_id: (value) => (!value ? 'Please select an item' : null),
      quantity: (value) =>
        value < 1
          ? 'Quantity must be at least 1'
          : value > 1000
            ? 'Quantity cannot exceed 1000'
            : null,
      sector: (value) => (!value ? 'Please select a sector' : null),
    },
  });

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

  const submitOrder = async (values: typeof form.values) => {
    if (!userProfile) return;

    // Find the selected item using the new unique value format
    const selectedOption = itemSelectData.find(
      (option) => option.value === values.item_id,
    );
    const selectedItem = selectedOption?.item;

    if (!selectedItem) {
      notifications.show({
        title: 'Error',
        message:
          'Selected item could not be found. Please try selecting the item again.',
        color: 'red',
      });
      return;
    }

    try {
      const { error } = await supabaseClient.from('crafting_orders').insert({
        item_id: parseInt(selectedItem.id), // Convert string back to number for database
        item_name: selectedItem.name,
        item_icon: selectedItem.iconAssetName,
        item_tier: selectedItem.tier,
        quantity: values.quantity,
        sector: values.sector,
        placed_by: userProfile.id,
        settlement_id: currentSettlement?.entityId,
        status: 'unassigned',
      });

      if (error) throw error;

      notifications.show({
        title: 'Order Created',
        message: `Successfully created order for ${selectedItem.name} (x${values.quantity})`,
        color: 'green',
      });

      form.reset();
      handleCloseModal();
      await refetchOrders();
    } catch (err) {
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

  const canCancelOrder = (order: CraftingOrder) => {
    if (!userProfile) return false;
    // Only the person who placed the order can cancel it
    return order.placed_by === userProfile.id;
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

  const itemSelectData = useMemo(() => {
    let selectItems = filteredItems;

    // If we have a selected item that's not in the current items list, add it
    const selectedItemId = form.values.item_id;
    if (
      selectedItemId &&
      !filteredItems.find((item) => item.id === selectedItemId)
    ) {
      const selectedItem = allItems.find((item) => item.id === selectedItemId);
      if (selectedItem) {
        selectItems = [selectedItem, ...filteredItems];
      }
    }

    // Remove duplicates by ID to avoid Mantine Select error
    const uniqueItems = selectItems.reduce(
      (acc: UnifiedItem[], current: UnifiedItem) => {
        const existingItem = acc.find((item) => item.id === current.id);
        if (!existingItem) {
          acc.push(current);
        }
        return acc;
      },
      [],
    );

    return uniqueItems.map((item: UnifiedItem, index: number) => ({
      value: `${item.id}_${item.type}_${index}`, // Make value unique by combining id, type, and index
      label: `${item.name} (${item.tier || 'Unknown'})`,
      item: item, // Store full item for rendering
      originalId: item.id, // Store original ID for form submission
    }));
  }, [filteredItems, allItems, form.values.item_id]);

  // Remove the problematic useEffect that was causing infinite API calls
  // The hook already handles fetching orders when currentSettlement changes

  // Display any item loading errors
  // Remove error handling as unified service handles errors internally

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
                            T{order.item_tier}
                          </Text>
                        )}
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500}>{order.quantity}</Text>
                  </Table.Td>
                  <Table.Td>
                    {formatUserName(order.placed_by_profile || undefined)}
                  </Table.Td>
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
                      <Group gap="xs">
                        <Text>
                          {formatUserName(
                            order.claimed_by_profile || undefined,
                          )}
                        </Text>
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
                  <Table.Td>
                    <Badge color={getStatusBadgeColor(order.status)} size="sm">
                      {order.status.charAt(0).toUpperCase() +
                        order.status.slice(1)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
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
        onClose={handleCloseModal}
        title="Create New Crafting Order"
        size="md"
      >
        <form onSubmit={form.onSubmit(submitOrder)}>
          <Stack gap="md">
            <div>
              <Group justify="space-between" mb="xs">
                <Text fw={500} size="sm">
                  Select Item
                </Text>
                {isCacheValid ? (
                  <Badge size="xs" color="green" variant="light">
                    Items & Cargos Cached
                  </Badge>
                ) : (
                  <Badge size="xs" color="gray" variant="light">
                    Loading...
                  </Badge>
                )}
              </Group>
              <Select
                placeholder="Choose an item to craft"
                data={itemSelectData}
                searchable
                searchValue={searchValue}
                onSearchChange={handleSearchChange}
                disabled={itemsLoading}
                nothingFoundMessage={
                  itemsLoading ? 'Loading...' : 'No items found'
                }
                renderOption={({ option }) => {
                  const item = (option as any).item;
                  return (
                    <Group gap="xs">
                      <div>
                        <Text>{item?.name || 'Unknown Item'}</Text>
                        <Text size="xs" c="dimmed">
                          T{item?.tier || 'Unknown'}
                        </Text>
                      </div>
                    </Group>
                  );
                }}
                {...form.getInputProps('item_id')}
              />
            </div>

            <Select
              label="Sector"
              placeholder="Choose a sector"
              data={sectorOptions}
              {...form.getInputProps('sector')}
            />

            <NumberInput
              label="Quantity"
              placeholder="Enter quantity"
              min={1}
              max={1000}
              {...form.getInputProps('quantity')}
            />

            <Group justify="flex-end" gap="sm">
              <Button variant="light" onClick={handleCloseModal}>
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
