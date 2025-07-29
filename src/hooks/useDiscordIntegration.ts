import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '../supabase/supabaseClient';
import { useSettlement } from '../contexts/SettlementContext_simple';

interface DiscordIntegrationStatus {
  hasIntegration: boolean;
  serverName: string | null;
  channelCount: number;
  isActive: boolean;
}

interface UseDiscordIntegrationResult {
  status: DiscordIntegrationStatus | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to get Discord integration status for the current settlement
 */
export function useDiscordIntegration(): UseDiscordIntegrationResult {
  const [status, setStatus] = useState<DiscordIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { currentSettlement } = useSettlement();

  const fetchDiscordStatus = useCallback(async () => {
    if (!currentSettlement?.entityId) {
      setStatus(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(
        '🔍 [DiscordIntegration] Fetching status for settlement:',
        currentSettlement.entityId,
      );

      const { data, error: rpcError } = await supabaseClient.rpc(
        'get_discord_integration_status',
        {
          settlement_id_param: currentSettlement.entityId,
        },
      );

      if (rpcError) {
        console.error('Error fetching Discord integration status:', rpcError);
        setError(rpcError.message);
        setStatus(null);
      } else {
        // The function returns a table, get the first result
        const result = data && data.length > 0 ? data[0] : null;
        if (result) {
          setStatus({
            hasIntegration: result.has_integration,
            serverName: result.server_name,
            channelCount: result.channel_count,
            isActive: result.is_active,
          });
        } else {
          setStatus({
            hasIntegration: false,
            serverName: null,
            channelCount: 0,
            isActive: false,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch Discord integration status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [currentSettlement?.entityId]);

  useEffect(() => {
    fetchDiscordStatus();
  }, [fetchDiscordStatus]);

  return { status, loading, error, refetch: fetchDiscordStatus };
}
