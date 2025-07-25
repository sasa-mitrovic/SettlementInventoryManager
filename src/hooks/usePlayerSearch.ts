import { useState, useEffect, useCallback, useRef } from 'react';
import BitjitaPlayerService, {
  BitjitaPlayer,
  BitjitaPlayerDetails,
} from '../services/bitjitaPlayerService';

interface UsePlayerSearchOptions {
  debounceMs?: number;
  maxResults?: number;
  minSearchLength?: number;
}

interface UsePlayerSearchReturn {
  players: BitjitaPlayer[];
  loading: boolean;
  error: string | null;
  searchValue: string;
  setSearchValue: (value: string) => void;
  selectedPlayer: BitjitaPlayerDetails | null;
  setSelectedPlayer: (player: BitjitaPlayerDetails | null) => void;
  selectPlayerById: (entityId: string) => Promise<void>;
}

export function usePlayerSearch({
  debounceMs = 300,
  maxResults = 5,
  minSearchLength = 3,
}: UsePlayerSearchOptions = {}): UsePlayerSearchReturn {
  const [players, setPlayers] = useState<BitjitaPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [selectedPlayer, setSelectedPlayer] =
    useState<BitjitaPlayerDetails | null>(null);

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerService = BitjitaPlayerService.getInstance();

  // Debounced search function
  const debouncedSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setPlayers([]);
        setError(null);
        return;
      }

      // Check minimum search length
      if (query.trim().length < minSearchLength) {
        setPlayers([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const results = await playerService.searchPlayers(query, maxResults);
        setPlayers(results.players);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to search players',
        );
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    },
    [maxResults, playerService, minSearchLength],
  );

  // Handle search value changes with debouncing
  useEffect(() => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      debouncedSearch(searchValue);
    }, debounceMs);

    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchValue, debouncedSearch, debounceMs]);

  // Function to select a player and get their detailed information
  const selectPlayerById = useCallback(
    async (entityId: string) => {
      setLoading(true);
      setError(null);

      try {
        const playerDetails = await playerService.getPlayerDetails(entityId);
        setSelectedPlayer(playerDetails);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch player details',
        );
        setSelectedPlayer(null);
      } finally {
        setLoading(false);
      }
    },
    [playerService],
  );

  return {
    players,
    loading,
    error,
    searchValue,
    setSearchValue,
    selectedPlayer,
    setSelectedPlayer,
    selectPlayerById,
  };
}
