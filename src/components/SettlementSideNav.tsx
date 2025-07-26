import { useState } from 'react';
import {
  Group,
  Stack,
  Text,
  Badge,
  ActionIcon,
  Collapse,
  Box,
  NavLink,
  Loader,
  Alert,
  Tooltip,
} from '@mantine/core';
import {
  IconChevronDown,
  IconChevronRight,
  IconMapPin,
  IconAlertCircle,
  IconCrown,
  IconShield,
  IconUserCheck,
  IconUser,
} from '@tabler/icons-react';
import { useSettlement } from '../contexts/SettlementContext_simple';
import {
  Settlement,
  getPermissionLevel,
  getPermissionColor,
} from '../types/settlement';

interface SettlementSideNavProps {
  collapsed?: boolean;
}

export function SettlementSideNav({
  collapsed = false,
}: SettlementSideNavProps) {
  const {
    settlements,
    currentSettlement,
    setCurrentSettlement,
    isLoading,
    error,
  } = useSettlement();
  const [isExpanded, setIsExpanded] = useState(true);

  const getPermissionIcon = (settlement: Settlement) => {
    const level = getPermissionLevel(settlement);
    switch (level) {
      case 'owner':
        return <IconCrown size={16} />;
      case 'co-owner':
        return <IconShield size={16} />;
      case 'officer':
        return <IconUserCheck size={16} />;
      default:
        return <IconUser size={16} />;
    }
  };

  const handleSettlementClick = (settlement: Settlement) => {
    setCurrentSettlement(settlement);
  };

  if (collapsed) {
    if (isLoading) {
      return (
        <Box p="xs" style={{ display: 'flex', justifyContent: 'center' }}>
          <Loader size="sm" />
        </Box>
      );
    }

    if (error || settlements.length === 0) {
      return (
        <Box p="xs" style={{ display: 'flex', justifyContent: 'center' }}>
          <Tooltip 
            label={error || 'No settlements available'} 
            position="right"
            offset={10}
          >
            <ActionIcon variant="subtle" size="lg" color="red">
              <IconAlertCircle size={20} />
            </ActionIcon>
          </Tooltip>
        </Box>
      );
    }

    return (
      <Stack gap="xs" p="xs" style={{ alignItems: 'center' }}>
        {settlements.map((settlement) => {
          const isActive = currentSettlement?.entityId === settlement.entityId;
          const permissionLevel = getPermissionLevel(settlement);
          const permissionColor = getPermissionColor(permissionLevel);

          return (
            <Tooltip
              key={settlement.entityId}
              label={
                <Box>
                  <Text size="sm" fw={500}>
                    {settlement.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {settlement.regionName}
                  </Text>
                  <Text size="xs" c={permissionColor}>
                    {permissionLevel}
                  </Text>
                </Box>
              }
              position="right"
              offset={10}
            >
              <ActionIcon
                variant={isActive ? 'filled' : 'subtle'}
                size="lg"
                color={isActive ? permissionColor : 'gray'}
                onClick={() => handleSettlementClick(settlement)}
                style={{ 
                  borderRadius: 8,
                  transition: 'all 0.2s ease'
                }}
              >
                {getPermissionIcon(settlement)}
              </ActionIcon>
            </Tooltip>
          );
        })}
      </Stack>
    );
  }

  if (isLoading) {
    return (
      <Box p="md">
        <Group>
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Loading settlements...
          </Text>
        </Group>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p="md">
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
          <Text size="sm">Failed to load settlements</Text>
        </Alert>
      </Box>
    );
  }

  if (settlements.length === 0) {
    return (
      <Box p="md">
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="yellow"
          variant="light"
        >
          <Text size="sm">No settlement access found</Text>
        </Alert>
      </Box>
    );
  }

  return (
    <Box p="md">
      <Group
        justify="space-between"
        style={{ cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
        mb="sm"
      >
        <Group gap="sm">
          <IconMapPin size={20} />
          <Text fw={500} size="sm">
            Settlements ({settlements.length})
          </Text>
        </Group>
        {isExpanded ? (
          <IconChevronDown size={16} />
        ) : (
          <IconChevronRight size={16} />
        )}
      </Group>

      <Collapse in={isExpanded}>
        <Stack gap="xs">
          {settlements.map((settlement) => {
            const isActive =
              currentSettlement?.entityId === settlement.entityId;
            const permissionLevel = getPermissionLevel(settlement);
            const permissionColor = getPermissionColor(permissionLevel);

            return (
              <NavLink
                key={settlement.entityId}
                label={
                  <Group justify="space-between" wrap="nowrap">
                    <Box style={{ minWidth: 0, flex: 1 }}>
                      <Text size="sm" truncate>
                        {settlement.name}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {settlement.regionName}
                      </Text>
                    </Box>
                    <Group gap="xs" wrap="nowrap">
                      <Badge
                        size="xs"
                        color={permissionColor}
                        variant="light"
                        leftSection={getPermissionIcon(settlement)}
                      >
                        {permissionLevel}
                      </Badge>
                    </Group>
                  </Group>
                }
                active={isActive}
                onClick={() => handleSettlementClick(settlement)}
                style={{
                  borderRadius: 8,
                  padding: '8px 12px',
                }}
              />
            );
          })}
        </Stack>
      </Collapse>
    </Box>
  );
}
