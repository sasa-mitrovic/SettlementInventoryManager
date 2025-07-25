import React from 'react';
import {
  Select,
  Group,
  Text,
  Avatar,
  Badge,
  Stack,
  Loader,
  Alert,
} from '@mantine/core';
import {
  IconUser,
  IconCrown,
  IconAlertCircle,
  IconUserCheck,
  IconUserX,
} from '@tabler/icons-react';
import { usePlayerSearch } from '../hooks/usePlayerSearch';
import { useUsernameValidation } from '../hooks/useUsernameValidation';
import { BitjitaPlayer } from '../services/bitjitaPlayerService';

interface PlayerSearchSelectProps {
  value?: string;
  onChange?: (
    entityId: string | null,
    playerName: string | null,
    empireName: string | null,
    userId: string | null,
    empireId: string | null,
  ) => void;
  onValidationResult?: (
    result: { available: boolean; message: string } | null,
  ) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  validateUsername?: boolean;
}

export function PlayerSearchSelect({
  value,
  onChange,
  onValidationResult,
  placeholder = 'Search for your in-game username...',
  label = 'In-Game Username',
  error,
  required = false,
  disabled = false,
  validateUsername = false,
}: PlayerSearchSelectProps) {
  const {
    players,
    loading,
    error: searchError,
    searchValue,
    setSearchValue,
    selectedPlayer,
    selectPlayerById,
  } = usePlayerSearch();

  const {
    validationResult,
    validateUsername: checkUsername,
    clearValidation,
  } = useUsernameValidation();

  const handlePlayerSelect = async (entityId: string) => {
    try {
      // Clear any previous validation result when selecting a new player
      if (validateUsername) {
        clearValidation();
        // Immediately notify parent that validation is cleared
        if (onValidationResult) {
          onValidationResult(null);
        }
      }

      await selectPlayerById(entityId);

      // Find the selected player in the search results
      const player = players.find((p) => p.entityId === entityId);
      if (player && validateUsername) {
        // Check if username is already taken
        await checkUsername(player.username);
      }

      if (player) {
        setSearchValue(player.username);
      }
    } catch (err) {
      console.error('Error selecting player:', err);
    }
  };

  // Notify parent component when player details are loaded
  React.useEffect(() => {
    if (selectedPlayer && onChange) {
      const empireName =
        selectedPlayer.empireMemberships &&
        selectedPlayer.empireMemberships.length > 0
          ? selectedPlayer.empireMemberships[0].empireName
          : null;

      const empireId =
        selectedPlayer.empireMemberships &&
        selectedPlayer.empireMemberships.length > 0
          ? selectedPlayer.empireMemberships[0].empireId ||
            selectedPlayer.empireMemberships[0].empireEntityId
          : null;

      const userId = selectedPlayer.userId || null;

      onChange(
        selectedPlayer.entityId,
        selectedPlayer.username,
        empireName,
        userId,
        empireId,
      );
    }
  }, [selectedPlayer]); // Remove onChange from dependencies to prevent infinite loop

  // Notify parent component when validation results change
  React.useEffect(() => {
    if (onValidationResult && validateUsername) {
      if (validationResult) {
        onValidationResult({
          available: validationResult.available,
          message: validationResult.message,
        });
      } else {
        onValidationResult(null);
      }
    }
  }, [validationResult, onValidationResult, validateUsername]);

  // Clear validation when search value changes (user starts typing new search)
  React.useEffect(() => {
    if (validateUsername) {
      if (searchValue.length === 0) {
        clearValidation();
        // Immediately notify parent that validation is cleared
        if (onValidationResult) {
          onValidationResult(null);
        }
      }
    }
  }, [searchValue, validateUsername, clearValidation, onValidationResult]);

  const selectData = players.map((player) => ({
    value: player.entityId,
    label: player.username,
    player: player,
  }));

  return (
    <Stack gap="xs">
      <Select
        label={label}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        searchable
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        data={selectData}
        value={value}
        onChange={(entityId) => {
          if (entityId) {
            handlePlayerSelect(entityId);
          }
        }}
        error={error || searchError}
        rightSection={loading ? <Loader size="xs" /> : undefined}
        renderOption={({ option }) => {
          const player = (option as any).player as BitjitaPlayer;
          return (
            <Group gap="sm">
              <Avatar size="sm" radius="xl">
                <IconUser size={16} />
              </Avatar>
              <div style={{ flex: 1 }}>
                <Group gap="xs" justify="space-between">
                  <Text size="sm" fw={500}>
                    {player.username}
                  </Text>
                  {player.signedIn && (
                    <Badge color="green" size="xs" variant="light">
                      Online
                    </Badge>
                  )}
                </Group>
                <Text size="xs" c="dimmed">
                  ID: {player.entityId}
                </Text>
              </div>
            </Group>
          );
        }}
        nothingFoundMessage={
          searchValue.length === 0
            ? 'Start typing to search for players...'
            : searchValue.length < 3
              ? 'Type at least 3 characters to search...'
              : searchValue.length > 0 && !loading
                ? 'No players found with that username'
                : 'Searching...'
        }
      />

      {/* Display selected player info */}
      {selectedPlayer && (
        <Alert
          icon={<IconCrown size={16} />}
          title="Player Found"
          color="blue"
          variant="light"
        >
          <Group gap="sm">
            <Avatar size="sm" radius="xl">
              <IconUser size={16} />
            </Avatar>
            <div>
              <Text size="sm" fw={500}>
                {selectedPlayer.username}
              </Text>
              <Text size="xs" c="dimmed">
                {selectedPlayer.empireMemberships &&
                selectedPlayer.empireMemberships.length > 0 ? (
                  <>Empire: {selectedPlayer.empireMemberships[0].empireName}</>
                ) : (
                  'No empire membership'
                )}
              </Text>
            </div>
          </Group>
        </Alert>
      )}

      {/* Display username validation result */}
      {validateUsername && validationResult && !validationResult.available && (
        <Alert
          icon={<IconUserX size={16} />}
          title="Username Already Taken"
          color="red"
          variant="light"
        >
          <Text size="sm">{validationResult.message}</Text>
        </Alert>
      )}

      {/* Display username validation success */}
      {validateUsername && validationResult && validationResult.available && (
        <Alert
          icon={<IconUserCheck size={16} />}
          title="Username Available"
          color="green"
          variant="light"
        >
          <Text size="sm">This username is available for registration.</Text>
        </Alert>
      )}

      {/* Display search error */}
      {searchError && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Search Error"
          color="red"
          variant="light"
        >
          {searchError}
        </Alert>
      )}
    </Stack>
  );
}
