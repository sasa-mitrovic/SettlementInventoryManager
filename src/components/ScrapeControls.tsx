import { useState, useEffect } from 'react';
import { Button, Group, Text, Alert, Progress } from '@mantine/core';
import { IconRefresh, IconAlertTriangle, IconCheck } from '@tabler/icons-react';
import { useSettlement } from '../contexts/SettlementContext_simple';
import { useUser } from '../supabase/loader';
import { settlementInventoryService } from '../services/settlementInventoryService';

interface ScrapeControlsProps {
  onScrapeComplete?: () => void;
}

export function ScrapeControls({ onScrapeComplete }: ScrapeControlsProps) {
  const { currentSettlement } = useSettlement();
  const { user } = useUser();
  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<{
    lastScrape: string | null;
    canScrape: boolean;
    cooldownRemaining: number;
  } | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    itemCount?: number;
  } | null>(null);

  // Load scrape status on component mount and settlement change
  useEffect(() => {
    if (currentSettlement?.entityId && user?.id) {
      loadScrapeStatus();
    }
  }, [currentSettlement?.entityId, user?.id]);

  // Update cooldown timer
  useEffect(() => {
    if (scrapeStatus && scrapeStatus.cooldownRemaining > 0) {
      const timer = setInterval(() => {
        setScrapeStatus((prev) => {
          if (!prev || prev.cooldownRemaining <= 1000) {
            // Cooldown finished, reload status
            loadScrapeStatus();
            return prev;
          }
          return {
            ...prev,
            cooldownRemaining: prev.cooldownRemaining - 1000,
          };
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [scrapeStatus?.cooldownRemaining]);

  const loadScrapeStatus = async () => {
    if (!currentSettlement?.entityId || !user?.id) return;

    try {
      const status = await settlementInventoryService.getScrapeStatus(
        currentSettlement.entityId,
        user.id,
      );
      setScrapeStatus(status);
    } catch (error) {
      console.error('Error loading scrape status:', error);
    }
  };

  const handleScrape = async (force: boolean = false) => {
    if (!currentSettlement?.entityId || !user?.id) {
      setResult({
        success: false,
        message: 'No settlement selected or user not logged in',
      });
      return;
    }

    setScraping(true);
    setResult(null);

    try {
      const scrapeResult = await settlementInventoryService.triggerScrape(
        currentSettlement.entityId,
        user.id,
        force,
      );

      setResult(scrapeResult);

      if (scrapeResult.success) {
        // Reload scrape status
        await loadScrapeStatus();
        // Notify parent component
        onScrapeComplete?.();
      }
    } catch (error) {
      setResult({
        success: false,
        message:
          'Failed to scrape: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      });
    } finally {
      setScraping(false);
    }
  };

  const formatTimeRemaining = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  if (!currentSettlement?.entityId) {
    return (
      <Alert icon={<IconAlertTriangle size={16} />} color="yellow">
        No settlement selected. Please select a settlement to scrape inventory
        data.
      </Alert>
    );
  }

  return (
    <div>
      <Group align="center" mb="sm">
        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={() => handleScrape(false)}
          loading={scraping}
          disabled={!!(scrapeStatus && !scrapeStatus.canScrape)}
          variant="light"
        >
          {scraping ? 'Scraping...' : 'Refresh from Bitjita'}
        </Button>

        {scrapeStatus && !scrapeStatus.canScrape && (
          <Text size="sm" c="dimmed">
            Cooldown: {formatTimeRemaining(scrapeStatus.cooldownRemaining)}
          </Text>
        )}

        {scrapeStatus && !scrapeStatus.canScrape && (
          <Button
            size="xs"
            variant="subtle"
            onClick={() => handleScrape(true)}
            loading={scraping}
          >
            Force Refresh
          </Button>
        )}
      </Group>

      {scrapeStatus && scrapeStatus.lastScrape && (
        <Text size="xs" c="dimmed" mb="sm">
          Last scraped: {new Date(scrapeStatus.lastScrape).toLocaleString()}
        </Text>
      )}

      {scraping && (
        <div>
          <Progress value={100} animated size="sm" mb="sm" />
          <Text size="sm" c="dimmed" ta="center">
            Fetching latest inventory data from Bitjita...
          </Text>
        </div>
      )}

      {result && (
        <Alert
          icon={
            result.success ? (
              <IconCheck size={16} />
            ) : (
              <IconAlertTriangle size={16} />
            )
          }
          color={result.success ? 'green' : 'red'}
          mb="sm"
        >
          {result.message}
          {result.success && result.itemCount && (
            <Text size="sm" mt={4}>
              Retrieved {result.itemCount} inventory items
            </Text>
          )}
        </Alert>
      )}

      <Text size="xs" c="dimmed">
        Settlement: {currentSettlement.name} ({currentSettlement.entityId})
      </Text>
    </div>
  );
}
