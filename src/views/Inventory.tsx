import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Table,
  Switch,
  Stack,
  Text,
  Badge,
  Group,
  Button,
  Alert,
  Loader,
  Center,
  NumberInput,
  Image,
  Accordion,
  TextInput,
  UnstyledButton,
  useComputedColorScheme,
  Tooltip,
} from '@mantine/core';
import {
  IconPackage,
  IconArrowLeft,
  IconRefresh,
  IconSearch,
  IconChevronUp,
  IconChevronDown,
  IconSelector,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { supabaseClient } from '../supabase/supabaseClient';
import { PermissionGate } from '../components/PermissionGate';
import { useHasAnyPermission } from '../supabase/optimizedRoleHooks';
import { useOptimizedUser } from '../supabase/loader';
import { useDebouncedValue } from '@mantine/hooks';

interface InventoryItem {
  id: string;
  item_name: string;
  tier: number | null;
  rarity: string | null;
  quantity: number;
  location: string; // Updated from container_name to location
  icon: string | null; // Updated from icon_url to icon
  building_id: string;
  building_name: string;
  building_nickname: string | null;
  building_type: number;
  item_id: number;
  item_type: string;
  slot_index: number;
  updated_at: string;
}

interface InventoryTarget {
  id: string;
  item_name: string;
  target_quantity: number;
  created_by: string | null;
}

interface CombinedInventoryItem {
  item_name: string;
  tier: number | null;
  rarity: string | null;
  total_quantity: number;
  icon: string | null; // Updated from icon_url to icon
  target_quantity?: number;
  target_id?: string;
  package_breakdown?: {
    base_quantity: number;
    package_items: Array<{
      name: string;
      quantity: number;
      multiplier: number;
      contribution: number;
    }>;
  };
}

type SortField =
  | 'item_name'
  | 'tier'
  | 'rarity'
  | 'quantity'
  | 'total_quantity'
  | 'target_quantity';
type SortDirection = 'asc' | 'desc';

interface SortState {
  field: SortField | null;
  direction: SortDirection;
}

export function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [targets, setTargets] = useState<InventoryTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCombined, setShowCombined] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchQuery, 300);
  const [sortState, setSortState] = useState<SortState>({
    field: null,
    direction: 'asc',
  });
  const [targetInputs, setTargetInputs] = useState<Record<string, number>>({});

  const computedColorScheme = useComputedColorScheme('light');
  const { user } = useOptimizedUser();
  const { hasAnyPermission: canEditTargets } = useHasAnyPermission([
    'inventory.bulk_update',
    'users.manage_roles',
  ]);

  // Theme-aware color function for target highlighting
  const getTargetColors = () => {
    if (computedColorScheme === 'dark') {
      return {
        success: 'var(--mantine-color-green-9)', // Darker, more muted green for dark mode
        danger: 'var(--mantine-color-red-9)', // Darker, more muted red for dark mode
      };
    } else {
      return {
        success: 'var(--mantine-color-green-1)', // Light green for light mode
        danger: 'var(--mantine-color-red-1)', // Light red for light mode
      };
    }
  };

  const handleSort = (field: SortField) => {
    setSortState((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortIcon = (field: SortField) => {
    if (sortState.field !== field) {
      return <IconSelector size={14} />;
    }
    return sortState.direction === 'asc' ? (
      <IconChevronUp size={14} />
    ) : (
      <IconChevronDown size={14} />
    );
  };

  const sortItems = <T extends InventoryItem | CombinedInventoryItem>(
    items: T[],
  ): T[] => {
    if (!sortState.field) return items;

    return [...items].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortState.field) {
        case 'item_name':
          aValue = a.item_name;
          bValue = b.item_name;
          break;
        case 'tier':
          aValue = a.tier ?? 0;
          bValue = b.tier ?? 0;
          break;
        case 'rarity':
          aValue = a.rarity ?? '';
          bValue = b.rarity ?? '';
          break;
        case 'quantity':
          aValue = 'quantity' in a ? a.quantity : 0;
          bValue = 'quantity' in b ? b.quantity : 0;
          break;
        case 'total_quantity':
          aValue = 'total_quantity' in a ? a.total_quantity : 0;
          bValue = 'total_quantity' in b ? b.total_quantity : 0;
          break;
        case 'target_quantity':
          aValue = 'target_quantity' in a ? (a.target_quantity ?? 0) : 0;
          bValue = 'target_quantity' in b ? (b.target_quantity ?? 0) : 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const result = aValue.localeCompare(bValue);
        return sortState.direction === 'asc' ? result : -result;
      }

      const result = aValue - bValue;
      return sortState.direction === 'asc' ? result : -result;
    });
  };

  const fetchInventory = async () => {
    try {
      const { data: inventoryData, error: inventoryError } =
        await supabaseClient
          .from('settlement_inventory')
          .select('*')
          .order('location', { ascending: true })
          .order('item_name', { ascending: true });

      if (inventoryError) throw inventoryError;
      setInventory(inventoryData || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch inventory',
      );
    }
  };

  const fetchTargets = async () => {
    try {
      const { data: targetsData, error: targetsError } = await supabaseClient
        .from('inventory_targets')
        .select('*');

      if (targetsError) throw targetsError;
      setTargets(targetsData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch targets');
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchInventory(), fetchTargets()]);
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchInventory(), fetchTargets()]);
      setLoading(false);
    };
    loadData();

    // Use polling for updates since real-time is disabled
    const pollInterval = setInterval(() => {
      fetchInventory();
      fetchTargets();
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  const updateTarget = async (
    itemName: string,
    targetQuantity: number,
    targetId?: string,
  ) => {
    if (!user || !canEditTargets) return;

    try {
      if (targetId) {
        // Update existing target
        const { error } = await supabaseClient
          .from('inventory_targets')
          .update({ target_quantity: targetQuantity })
          .eq('id', targetId);

        if (error) throw error;
      } else {
        // Create new target
        const { error } = await supabaseClient
          .from('inventory_targets')
          .insert({
            item_name: itemName,
            target_quantity: targetQuantity,
            created_by: user.id,
          });

        if (error) throw error;
      }

      await fetchTargets();
    } catch (err) {
      console.error('Failed to update target:', err);
    }
  };

  const handleTargetInputChange = (
    itemName: string,
    value: number | string,
  ) => {
    const numValue =
      typeof value === 'string' ? parseInt(value) || 0 : value || 0;
    setTargetInputs((prev) => ({
      ...prev,
      [itemName]: numValue,
    }));
  };

  const handleTargetSubmit = async (itemName: string, targetId?: string) => {
    const inputValue = targetInputs[itemName];
    if (inputValue !== undefined) {
      await updateTarget(itemName, inputValue, targetId);
      // Remove from local input state after successful update
      setTargetInputs((prev) => {
        const newState = { ...prev };
        delete newState[itemName];
        return newState;
      });
    }
  };

  const getTargetInputValue = (itemName: string, currentTarget?: number) => {
    // Return local input value if it exists, otherwise return the current target
    return targetInputs[itemName] !== undefined
      ? targetInputs[itemName]
      : currentTarget || 0;
  };

  const getRarityColor = (rarity: string | null) => {
    switch (rarity?.toLowerCase()) {
      case 'common':
        return 'gray';
      case 'uncommon':
        return 'green';
      case 'rare':
        return 'blue';
      case 'epic':
        return 'purple';
      case 'legendary':
        return 'orange';
      default:
        return 'gray';
    }
  };

  // Package calculation utilities
  const getPackageInfo = (itemName: string) => {
    // Define package patterns and their multipliers
    // Order matters - more specific patterns first
    const packagePatterns = [{ suffix: ' Package', multiplier: 100 }];

    for (const pattern of packagePatterns) {
      if (itemName.endsWith(pattern.suffix)) {
        const baseItemName = itemName.slice(0, -pattern.suffix.length);
        return {
          isPackage: true,
          baseItemName,
          multiplier: pattern.multiplier,
        };
      }
    }

    return {
      isPackage: false,
      baseItemName: itemName,
      multiplier: 1,
    };
  };

  const getCombinedInventory = (): CombinedInventoryItem[] => {
    const combined: { [key: string]: CombinedInventoryItem } = {};
    let packageDetectionCount = 0; // Debug counter

    // First pass: process all items and handle packages
    inventory.forEach((item) => {
      const packageInfo = getPackageInfo(item.item_name);
      const key = packageInfo.baseItemName; // Use base item name as key
      const effectiveQuantity = item.quantity * packageInfo.multiplier;

      if (packageInfo.isPackage) {
        packageDetectionCount++;
        console.log(
          `📦 Package detected: "${item.item_name}" -> "${packageInfo.baseItemName}" (${item.quantity} × ${packageInfo.multiplier} = ${effectiveQuantity})`,
        );
      }

      if (combined[key]) {
        combined[key].total_quantity += effectiveQuantity;

        // Update package breakdown
        if (!combined[key].package_breakdown) {
          combined[key].package_breakdown = {
            base_quantity: 0,
            package_items: [],
          };
        }

        if (packageInfo.isPackage) {
          // Add to package items
          const existingPackage = combined[
            key
          ].package_breakdown!.package_items.find(
            (p) => p.name === item.item_name,
          );
          if (existingPackage) {
            existingPackage.quantity += item.quantity;
            existingPackage.contribution += effectiveQuantity;
          } else {
            combined[key].package_breakdown!.package_items.push({
              name: item.item_name,
              quantity: item.quantity,
              multiplier: packageInfo.multiplier,
              contribution: effectiveQuantity,
            });
          }
        } else {
          // Add to base quantity
          combined[key].package_breakdown!.base_quantity += item.quantity;
        }
      } else {
        // Initialize new combined item
        const newItem: CombinedInventoryItem = {
          item_name: packageInfo.baseItemName, // Use base item name
          tier: item.tier,
          rarity: item.rarity,
          total_quantity: effectiveQuantity,
          icon: item.icon,
        };

        // Initialize package breakdown
        if (packageInfo.isPackage) {
          newItem.package_breakdown = {
            base_quantity: 0,
            package_items: [
              {
                name: item.item_name,
                quantity: item.quantity,
                multiplier: packageInfo.multiplier,
                contribution: effectiveQuantity,
              },
            ],
          };
        } else {
          newItem.package_breakdown = {
            base_quantity: item.quantity,
            package_items: [],
          };
        }

        combined[key] = newItem;
      }
    });

    if (packageDetectionCount > 0) {
      console.log(
        `🎯 Package system processed ${packageDetectionCount} packaged items`,
      );
    }

    // Add target information
    targets.forEach((target) => {
      const targetPackageInfo = getPackageInfo(target.item_name);
      const targetKey = targetPackageInfo.baseItemName;

      if (combined[targetKey]) {
        combined[targetKey].target_quantity = target.target_quantity;
        combined[targetKey].target_id = target.id;
      }
    });

    return Object.values(combined).sort((a, b) =>
      a.item_name.localeCompare(b.item_name),
    );
  };

  const getContainerGroups = () => {
    const groups: { [key: string]: InventoryItem[] } = {};
    inventory.forEach((item) => {
      if (!groups[item.location]) {
        groups[item.location] = [];
      }
      groups[item.location].push(item);
    });
    return groups;
  };

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <Table.Th>
      <UnstyledButton
        onClick={() => handleSort(field)}
        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <Text fw={600}>{children}</Text>
        {getSortIcon(field)}
      </UnstyledButton>
    </Table.Th>
  );

  const filterItems = <T extends { item_name: string }>(items: T[]): T[] => {
    if (!debouncedSearch) return items;
    return items.filter((item) =>
      item.item_name.toLowerCase().includes(debouncedSearch.toLowerCase()),
    );
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <PermissionGate permission="inventory.read">
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
                <IconPackage size={28} style={{ marginRight: 8 }} />
                Settlement Inventory
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

          <Group>
            <Switch
              label="Show Combined Totals"
              checked={showCombined}
              onChange={(event) => setShowCombined(event.currentTarget.checked)}
            />
            <Text size="sm" c="dimmed">
              {showCombined
                ? 'Showing combined inventory totals'
                : 'Showing inventory by container'}
            </Text>
          </Group>

          <TextInput
            placeholder="Search items..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
          />

          {!showCombined ? (
            // Container-based view
            <Accordion variant="separated">
              {Object.entries(getContainerGroups())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([containerName, items]) => (
                  <Accordion.Item key={containerName} value={containerName}>
                    <Accordion.Control>
                      <Group>
                        <Text fw={600}>{containerName}</Text>
                        <Badge size="sm" variant="light">
                          {filterItems(items).length} items
                        </Badge>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <SortableHeader field="item_name">
                              Item
                            </SortableHeader>
                            <SortableHeader field="tier">Tier</SortableHeader>
                            <SortableHeader field="rarity">
                              Rarity
                            </SortableHeader>
                            <SortableHeader field="quantity">
                              Quantity
                            </SortableHeader>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {sortItems(filterItems(items)).map((item) => (
                            <Table.Tr key={item.id}>
                              <Table.Td>
                                <Group gap="sm">
                                  {item.icon && (
                                    <Image
                                      src={`https://bitjita.com/${
                                        item.icon.startsWith(
                                          'GeneratedIcons/Other',
                                        )
                                          ? item.icon.slice(20)
                                          : item.icon.startsWith(
                                                'GeneratedIcons/Items',
                                              ) ||
                                              item.icon.startsWith(
                                                'GeneratedIcons/Cargo',
                                              )
                                            ? item.icon
                                            : 'GeneratedIcons/' + item.icon
                                      }.webp`}
                                      alt={item.item_name}
                                      w={24}
                                      h={24}
                                      fit="contain"
                                    />
                                  )}
                                  <Text fw={500}>{item.item_name}</Text>
                                </Group>
                              </Table.Td>
                              <Table.Td>
                                <Text>{item.tier || 'N/A'}</Text>
                              </Table.Td>
                              <Table.Td>
                                <Badge
                                  color={getRarityColor(item.rarity)}
                                  size="sm"
                                  variant="light"
                                >
                                  {item.rarity || 'Unknown'}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Text fw={600}>
                                  {item.quantity.toLocaleString()}
                                </Text>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
            </Accordion>
          ) : (
            // Combined totals view
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <SortableHeader field="item_name">Item</SortableHeader>
                  <SortableHeader field="tier">Tier</SortableHeader>
                  <SortableHeader field="rarity">Rarity</SortableHeader>
                  <SortableHeader field="total_quantity">
                    Total Quantity
                  </SortableHeader>
                  <SortableHeader field="target_quantity">
                    Target
                  </SortableHeader>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sortItems(filterItems(getCombinedInventory())).map((item) => {
                  const hasTarget =
                    item.target_quantity && item.target_quantity > 0;
                  const isAboveTarget =
                    hasTarget && item.total_quantity >= item.target_quantity!;
                  const isBelowTarget =
                    hasTarget && item.total_quantity < item.target_quantity!;

                  return (
                    <Table.Tr key={item.item_name}>
                      <Table.Td>
                        <Group gap="sm">
                          {item.icon && (
                            <Image
                              src={`https://bitjita.com/${
                                item.icon.startsWith('GeneratedIcons/Other')
                                  ? item.icon.slice(20)
                                  : item.icon.startsWith(
                                        'GeneratedIcons/Items',
                                      ) ||
                                      item.icon.startsWith(
                                        'GeneratedIcons/Cargo',
                                      )
                                    ? item.icon
                                    : 'GeneratedIcons/' + item.icon
                              }.webp`}
                              alt={item.item_name}
                              w={24}
                              h={24}
                              fit="contain"
                            />
                          )}
                          <Text fw={500}>{item.item_name}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text>{item.tier || 'N/A'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={getRarityColor(item.rarity)}
                          size="sm"
                          variant="light"
                        >
                          {item.rarity || 'Unknown'}
                        </Badge>
                      </Table.Td>
                      <Table.Td
                        style={{
                          backgroundColor: isAboveTarget
                            ? getTargetColors().success
                            : isBelowTarget
                              ? getTargetColors().danger
                              : undefined,
                        }}
                      >
                        {item.package_breakdown &&
                        (item.package_breakdown.package_items.length > 0 ||
                          item.package_breakdown.base_quantity > 0) ? (
                          <Tooltip
                            label={
                              <Stack gap="xs">
                                <Text size="sm" fw={600}>
                                  Breakdown:
                                </Text>
                                {item.package_breakdown.base_quantity > 0 && (
                                  <Text size="xs">
                                    Base:{' '}
                                    {item.package_breakdown.base_quantity.toLocaleString()}
                                  </Text>
                                )}
                                {item.package_breakdown.package_items.map(
                                  (pkg, index) => (
                                    <Text key={index} size="xs">
                                      {pkg.name}:{' '}
                                      {pkg.quantity.toLocaleString()} ×{' '}
                                      {pkg.multiplier} ={' '}
                                      {pkg.contribution.toLocaleString()}
                                    </Text>
                                  ),
                                )}
                                <Text size="xs" fw={600} c="blue">
                                  Total: {item.total_quantity.toLocaleString()}
                                </Text>
                              </Stack>
                            }
                            multiline
                            w={300}
                          >
                            <Group gap="xs">
                              <Text fw={600}>
                                {item.total_quantity.toLocaleString()}
                              </Text>
                              {item.package_breakdown.package_items.length >
                                0 && (
                                <Badge size="xs" color="blue" variant="light">
                                  📦
                                </Badge>
                              )}
                            </Group>
                          </Tooltip>
                        ) : (
                          <Text fw={600}>
                            {item.total_quantity.toLocaleString()}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td
                        style={{
                          backgroundColor: isAboveTarget
                            ? getTargetColors().success
                            : isBelowTarget
                              ? getTargetColors().danger
                              : undefined,
                        }}
                      >
                        {canEditTargets ? (
                          <NumberInput
                            value={getTargetInputValue(
                              item.item_name,
                              item.target_quantity,
                            )}
                            onChange={(value) =>
                              handleTargetInputChange(item.item_name, value)
                            }
                            onBlur={() =>
                              handleTargetSubmit(item.item_name, item.target_id)
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                handleTargetSubmit(
                                  item.item_name,
                                  item.target_id,
                                );
                              }
                            }}
                            min={0}
                            size="sm"
                            w={100}
                            placeholder="0"
                          />
                        ) : (
                          <Text>
                            {item.target_quantity?.toLocaleString() || '-'}
                          </Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}

          {inventory.length === 0 && (
            <Center h={200}>
              <Stack align="center">
                <Text size="lg" c="dimmed">
                  No inventory data available
                </Text>
                <Text size="sm" c="dimmed">
                  Data will be automatically updated from the settlement
                </Text>
              </Stack>
            </Center>
          )}
        </Stack>
      </Container>
    </PermissionGate>
  );
}
