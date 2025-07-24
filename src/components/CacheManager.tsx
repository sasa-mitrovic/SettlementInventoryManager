import { useState, useEffect } from 'react';
import {
  Paper,
  Title,
  Stack,
  Group,
  Button,
  Text,
  Badge,
  Alert,
  Code,
  Divider,
} from '@mantine/core';
import {
  IconRefresh,
  IconTrash,
  IconInfoCircle,
  IconDatabase,
  IconClock,
} from '@tabler/icons-react';
import { bitjitaItemsCache } from '../services/bitjitaItemsCache';
import { notifications } from '@mantine/notifications';

export function CacheManager() {
  const [cacheInfo, setCacheInfo] = useState({
    isValid: false,
    itemCount: 0,
    age: null as number | null,
    loading: false,
  });
  const [refreshing, setRefreshing] = useState(false);

  const updateCacheInfo = () => {
    setCacheInfo({
      isValid: bitjitaItemsCache.isCacheValid(),
      itemCount: bitjitaItemsCache.getCachedItems()?.length || 0,
      age: bitjitaItemsCache.getCacheAge(),
      loading: bitjitaItemsCache.isLoading(),
    });
  };

  useEffect(() => {
    updateCacheInfo();

    // Update cache info every 5 seconds
    const interval = setInterval(updateCacheInfo, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRefreshCache = async () => {
    try {
      setRefreshing(true);
      await bitjitaItemsCache.getItems(true);
      updateCacheInfo();
      notifications.show({
        title: 'Cache Refreshed',
        message: 'Successfully refreshed the Bitjita items cache',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Refresh Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'red',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearCache = () => {
    bitjitaItemsCache.invalidateCache();
    updateCacheInfo();
    notifications.show({
      title: 'Cache Cleared',
      message: 'Cache has been cleared and will be refreshed on next use',
      color: 'blue',
    });
  };

  const formatAge = (age: number | null): string => {
    if (!age) return 'No cache';

    const minutes = Math.floor(age / (1000 * 60));
    const seconds = Math.floor((age % (1000 * 60)) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s ago`;
    }
    return `${seconds}s ago`;
  };

  const formatSize = (count: number): string => {
    if (count === 0) return '0 items';
    if (count === 1) return '1 item';
    return `${count.toLocaleString()} items`;
  };

  return (
    <Paper withBorder shadow="sm" radius="md" p="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={4}>
            <Group gap="xs">
              <IconDatabase size={20} />
              Bitjita Items Cache
            </Group>
          </Title>
          <Badge
            color={
              cacheInfo.isValid
                ? 'green'
                : cacheInfo.loading
                  ? 'yellow'
                  : 'gray'
            }
            variant="light"
          >
            {cacheInfo.loading
              ? 'Loading'
              : cacheInfo.isValid
                ? 'Valid'
                : 'Invalid'}
          </Badge>
        </Group>

        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          The cache stores Bitjita API items for 5 minutes to improve
          performance and reduce API calls. All users share the same cached
          data.
        </Alert>

        <Group gap="lg">
          <Group gap="xs">
            <IconDatabase size={16} color="var(--mantine-color-blue-6)" />
            <Text size="sm" fw={500}>
              Items:
            </Text>
            <Text size="sm">{formatSize(cacheInfo.itemCount)}</Text>
          </Group>

          <Group gap="xs">
            <IconClock size={16} color="var(--mantine-color-gray-6)" />
            <Text size="sm" fw={500}>
              Age:
            </Text>
            <Text size="sm">{formatAge(cacheInfo.age)}</Text>
          </Group>
        </Group>

        <Divider />

        <Group gap="md">
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={handleRefreshCache}
            loading={refreshing || cacheInfo.loading}
            variant="light"
            color="blue"
          >
            Refresh Cache
          </Button>

          <Button
            leftSection={<IconTrash size={16} />}
            onClick={handleClearCache}
            variant="light"
            color="red"
            disabled={cacheInfo.loading}
          >
            Clear Cache
          </Button>
        </Group>

        {process.env.NODE_ENV === 'development' && (
          <>
            <Divider />
            <Stack gap="xs">
              <Text size="sm" fw={500} c="dimmed">
                Debug Info:
              </Text>
              <Code block>
                {JSON.stringify(
                  {
                    isValid: cacheInfo.isValid,
                    itemCount: cacheInfo.itemCount,
                    age: cacheInfo.age,
                    loading: cacheInfo.loading,
                    storageKey: 'bitjita_items_cache',
                  },
                  null,
                  2,
                )}
              </Code>
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
}
