import { Button, Menu } from '@mantine/core';
import {
  IconBrandDiscord,
  IconChevronDown,
  IconWand,
  IconSettings,
} from '@tabler/icons-react';
import { useDiscordIntegration } from '../hooks/useDiscordIntegration';

interface DiscordIntegrationButtonProps {
  onManualSetupClick: () => void;
  onOAuthSetupClick: () => void;
}

export function DiscordIntegrationButton({
  onManualSetupClick,
  onOAuthSetupClick,
}: DiscordIntegrationButtonProps) {
  const { status, loading } = useDiscordIntegration();

  // Don't show the button if Discord is already integrated
  if (loading || (status && status.hasIntegration)) {
    return null;
  }

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
