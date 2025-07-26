import { useState, useEffect, useCallback, useRef } from 'react';
import BitjitaPlayerService, {
  BitjitaPlayer,
  BitjitaPlayerDetails,
} from '../services/bitjitaPlayerService';

interface UsePlayerSearchOptions {
  debounceMs?: number;
  maxResults?: number;
  minSearchLength?: number;
  errorGracePeriodMs?: number;
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
  errorGracePeriodMs = 2000, // Show errors only after 2 seconds
}: UsePlayerSearchOptions = {}): UsePlayerSearchReturn {
  const [players, setPlayers] = useState<BitjitaPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [selectedPlayer, setSelectedPlayer] =
    useState<BitjitaPlayerDetails | null>(null);

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerService = BitjitaPlayerService.getInstance();

  // Helper function to set error with grace period
  const setErrorWithGracePeriod = useCallback(
    (errorMessage: string) => {
      // Clear any existing error timeout
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }

      // Set error after grace period
      errorTimeoutRef.current = setTimeout(() => {
        setError(errorMessage);
      }, errorGracePeriodMs);
    },
    [errorGracePeriodMs],
  );

  // Helper function to clear error immediately
  const clearErrorImmediate = useCallback(() => {
    // Clear timeout if it exists
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    setError(null);
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setPlayers([]);
        clearErrorImmediate();
        return;
      }

      // Check minimum search length
      if (query.trim().length < minSearchLength) {
        setPlayers([]);
        clearErrorImmediate();
        return;
      }

      setLoading(true);
      clearErrorImmediate();

      try {
        const results = await playerService.searchPlayers(query, maxResults);
        setPlayers(results.players);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to search players';
        setErrorWithGracePeriod(errorMessage);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    },
    [
      maxResults,
      playerService,
      minSearchLength,
      setErrorWithGracePeriod,
      clearErrorImmediate,
    ],
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
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [searchValue, debouncedSearch, debounceMs]);

  // Function to select a player and get their detailed information
  const selectPlayerById = useCallback(
    async (entityId: string) => {
      setLoading(true);
      clearErrorImmediate();

      try {
        const playerDetails = await playerService.getPlayerDetails(entityId);
        setSelectedPlayer(playerDetails);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch player details';
        setErrorWithGracePeriod(errorMessage);
        setSelectedPlayer(null);
      } finally {
        setLoading(false);
      }
    },
    [playerService, setErrorWithGracePeriod, clearErrorImmediate],
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
