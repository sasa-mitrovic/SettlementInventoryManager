import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Modal,
  Stack,
  Text,
  Group,
  Button,
  Badge,
  Select,
  NumberInput,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { supabaseClient } from '../supabase/supabaseClient';
import { useOptimizedUserWithProfile } from '../supabase/loader';
import { useUnifiedItems, UnifiedItem } from '../services/unifiedItemService';
import { useSettlement } from '../contexts/SettlementContext_simple';

interface CraftingOrderModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedItem?: string; // Item name to preselect
  meetTarget?: {
    currentQuantity: number;
    targetQuantity: number;
  };
}

export function CraftingOrderModal({
  opened,
  onClose,
  onSuccess,
  preselectedItem,
  meetTarget,
}: CraftingOrderModalProps) {
  const { userProfile } = useOptimizedUserWithProfile();
  const { currentSettlement } = useSettlement();

  // Use the unified items service
  const {
    items: allItems,
    loading: itemsLoading,
    isCacheValid,
  } = useUnifiedItems();

  const [filteredItems, setFilteredItems] = useState<UnifiedItem[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const filterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      hexcoin: 0,
      notes: '',
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

  // Set initial quantity based on meetTarget when modal opens
  useEffect(() => {
    if (opened && meetTarget) {
      const neededQuantity = Math.max(
        1,
        meetTarget.targetQuantity - meetTarget.currentQuantity,
      );
      form.setFieldValue('quantity', neededQuantity);
    }
  }, [opened, meetTarget]);

  // Initialize filtered items when allItems changes
  useEffect(() => {
    if (allItems && allItems.length > 0) {
      setFilteredItems(allItems.slice(0, 50));
    }
  }, [allItems]);

  // Handle preselected item - trigger when modal opens, preselected item changes, or items are loaded
  useEffect(() => {
    if (opened && preselectedItem && allItems && allItems.length > 0) {
      const matchingItem = allItems.find(
        (item) => item.name === preselectedItem,
      );

      if (matchingItem) {
        form.setFieldValue('item_id', String(matchingItem.id));
      }
    }
  }, [opened, preselectedItem, allItems]);

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
          setFilteredItems(allItems.slice(0, 50));
        } else {
          const searchLower = value.toLowerCase();
          const filtered = allItems.filter(
            (item: UnifiedItem) =>
              item.name.toLowerCase().includes(searchLower) &&
              !item.name.endsWith('Output'),
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
    form.reset();
    setSearchValue('');
    onClose();
  };

  // Reset form when modal is closed
  useEffect(() => {
    if (!opened) {
      form.reset();
      setSearchValue('');
      // Clear any pending filter operation
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    }
  }, [opened]);

  const submitOrder = async (values: typeof form.values) => {
    if (!userProfile) return;

    // Look for the selected item in allItems
    const selectedItem = allItems.find((item) => item.id === values.item_id);
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
        status: 'unassigned',
        hexcoin: values.hexcoin || 0,
        notes: values.notes || '',
        settlement_id: currentSettlement?.entityId, // Ensure settlement_id is set
      });

      if (error) throw error;

      notifications.show({
        title: 'Order Created',
        message: `Successfully created order for ${selectedItem.name} (x${values.quantity})`,
        color: 'green',
      });

      form.reset();
      handleCloseModal();
      onSuccess?.();
    } catch (err) {
      notifications.show({
        title: 'Create Failed',
        message: err instanceof Error ? err.message : 'Failed to create order',
        color: 'red',
      });
    }
  };

  const itemSelectData = useMemo(() => {
    if (!allItems || allItems.length === 0) return [];

    let selectItems = filteredItems;

    // Always include the currently selected item, even if it's not in the filtered list
    const selectedItemId = form.values.item_id;
    if (selectedItemId) {
      const isSelectedInFiltered = filteredItems.find(
        (item) => item.id === selectedItemId,
      );
      if (!isSelectedInFiltered) {
        const selectedItem = allItems.find(
          (item) => item.id === selectedItemId,
        );
        if (selectedItem) {
          selectItems = [selectedItem, ...filteredItems];
        }
      }
    }

    // Remove duplicates by creating a Map with item.id as key
    const uniqueItems = new Map();
    selectItems.forEach((item: UnifiedItem) => {
      if (!uniqueItems.has(item.id)) {
        uniqueItems.set(item.id, item);
      }
    });

    const result = Array.from(uniqueItems.values()).map(
      (item: UnifiedItem) => ({
        value: String(item.id),
        label: `${item.name} (${item.tier || 'Unknown'})`,
        item: item, // Store full item for rendering
      }),
    );

    // Debug logging to catch duplicates
    const values = result.map((r) => r.value);
    const duplicateValues = values.filter(
      (value, index) => values.indexOf(value) !== index,
    );
    if (duplicateValues.length > 0) {
      console.error(
        '[CraftingOrderModal] Duplicate values detected:',
        duplicateValues,
      );
      console.error('[CraftingOrderModal] Full result:', result);
    }

    return result;
  }, [filteredItems, allItems, form.values.item_id]);

  // Handle "Meet Target" functionality
  const handleMeetTarget = () => {
    if (meetTarget) {
      const neededQuantity = Math.max(
        1,
        meetTarget.targetQuantity - meetTarget.currentQuantity,
      );
      form.setFieldValue('quantity', neededQuantity);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleCloseModal}
      title="Create New Crafting Order"
      size="lg"
      centered
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
              disabled={itemsLoading || preselectedItem ? true : false}
              nothingFoundMessage={
                itemsLoading ? 'Loading...' : 'No items found'
              }
              renderOption={({ option }) => {
                const item = allItems.find(
                  (item) => String(item.id) === option.value,
                );
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

          <div>
            <Group justify="space-between" align="flex-end" mb="xs">
              <div style={{ flex: 1 }}>
                <NumberInput
                  label="Quantity"
                  placeholder="Enter quantity"
                  min={1}
                  max={1000}
                  {...form.getInputProps('quantity')}
                />
              </div>
              {meetTarget &&
                meetTarget.currentQuantity < meetTarget.targetQuantity && (
                  <Button
                    size="xs"
                    variant="light"
                    color="blue"
                    onClick={handleMeetTarget}
                    style={{ marginBottom: 2 }}
                  >
                    Meet Target (
                    {meetTarget.targetQuantity - meetTarget.currentQuantity})
                  </Button>
                )}
            </Group>
            {meetTarget && (
              <Text size="xs" c="dimmed">
                Current: {meetTarget.currentQuantity.toLocaleString()} | Target:{' '}
                {meetTarget.targetQuantity.toLocaleString()} | Needed:{' '}
                {Math.max(
                  0,
                  meetTarget.targetQuantity - meetTarget.currentQuantity,
                ).toLocaleString()}
              </Text>
            )}
          </div>

          <NumberInput
            label="Hexcoin Cost"
            placeholder="Enter hexcoin cost"
            min={0}
            {...form.getInputProps('hexcoin')}
          />

          <TextInput
            label="Notes"
            placeholder="Enter any additional notes"
            {...form.getInputProps('notes')}
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
  );
}
