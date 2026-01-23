import { Button, Menu, Badge, Group, Text } from '@mantine/core';
import {
  IconBrandDiscord,
  IconChevronDown,
  IconWand,
  IconSettings,
  IconEdit,
  IconCheck,
} from '@tabler/icons-react';
import { useDiscordIntegration } from '../hooks/useDiscordIntegration';

interface DiscordIntegrationButtonProps {
  onManualSetupClick: () => void;
  onOAuthSetupClick: () => void;
  onEditClick?: () => void;
}

export function DiscordIntegrationButton({
  onManualSetupClick,
  onOAuthSetupClick,
  onEditClick,
}: DiscordIntegrationButtonProps) {
  const { status, loading } = useDiscordIntegration();

  if (loading) {
    return null;
  }

  // Show edit button if Discord is already integrated
  if (status && status.hasIntegration) {
    return (
      <Menu shadow="md" width={220}>
        <Menu.Target>
          <Button
            color="green"
            variant="light"
            leftSection={<IconBrandDiscord size={16} />}
            rightSection={<IconChevronDown size={14} />}
            size="sm"
          >
            <Group gap="xs">
              <IconCheck size={14} />
              <Text size="sm">Discord Connected</Text>
            </Group>
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>
            {status.serverName || 'Discord Server'}
            <Badge size="xs" ml="xs" color="green">{status.channelCount} channels</Badge>
          </Menu.Label>
          <Menu.Item
            leftSection={<IconEdit size={14} />}
            onClick={onEditClick}
          >
            Edit Webhooks
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    );
  }

  // Show setup button if no integration
  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <Button
          color="red"
          variant="filled"
          leftSection={<IconBrandDiscord size={16} />}
          rightSection={<IconChevronDown size={14} />}
          size="sm"
        >
          Discord Integration
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Setup Method</Menu.Label>
        <Menu.Item
          leftSection={<IconWand size={14} />}
          onClick={onOAuthSetupClick}
        >
          Quick Setup with OAuth
        </Menu.Item>
        <Menu.Item
          leftSection={<IconSettings size={14} />}
          onClick={onManualSetupClick}
        >
          Manual Setup
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
