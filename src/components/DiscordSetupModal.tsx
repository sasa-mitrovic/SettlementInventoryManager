import { useState } from 'react';
import {
  Modal,
  Stack,
  Text,
  TextInput,
  Select,
  Button,
  Group,
  Alert,
  Stepper,
  Paper,
  Title,
  List,
  Code,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconBrandDiscord,
  IconCheck,
  IconAlertCircle,
  IconTrash,
  IconPlus,
} from '@tabler/icons-react';
import { supabaseClient } from '../supabase/supabaseClient';
import { useSettlement } from '../contexts/SettlementContext_simple';
import { useOptimizedUserWithProfile } from '../supabase/loader';

interface DiscordSetupModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ChannelConfig {
  sector: string;
  channelId: string;
  channelName: string;
  webhookUrl: string;
}

const AVAILABLE_SECTORS = [
  'Forest&Wood',
  'Earth&Ore',
  'Wild&Hide',
  'Fields&Cloth',
  'Waters&Meals',
  'Lore&Trade',
  'SlayerSquad',
];

export function DiscordSetupModal({
  opened,
  onClose,
  onSuccess,
}: DiscordSetupModalProps) {
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<ChannelConfig[]>([
    { sector: 'Forest&Wood', channelId: '', channelName: '', webhookUrl: '' },
  ]);

  const { currentSettlement } = useSettlement();
  const { userProfile } = useOptimizedUserWithProfile();

  const form = useForm({
    initialValues: {
      serverId: '',
      serverName: '',
      mainWebhookUrl: '',
    },
    validate: {
      serverId: (value) => (!value ? 'Discord Server ID is required' : null),
      serverName: (value) =>
        !value ? 'Discord Server Name is required' : null,
      mainWebhookUrl: (value) =>
        !value ? 'Main webhook URL is required' : null,
    },
  });

  const addChannel = () => {
    if (channels.length < 7) {
      setChannels([
        ...channels,
        {
          sector: 'Forest&Wood',
          channelId: '',
          channelName: '',
          webhookUrl: '',
        },
      ]);
    }
  };

  const removeChannel = (index: number) => {
    if (channels.length > 1) {
      setChannels(channels.filter((_, i) => i !== index));
    }
  };

  const updateChannel = (
    index: number,
    field: keyof ChannelConfig,
    value: string,
  ) => {
    const newChannels = [...channels];
    newChannels[index] = { ...newChannels[index], [field]: value };
    setChannels(newChannels);
  };

  const validateChannels = () => {
    return channels.every(
      (channel) => channel.sector && channel.channelName && channel.webhookUrl,
    );
  };

  const testWebhook = async (webhookUrl: string, channelName: string) => {
    try {
      const testPayload = {
        content: `🧪 **Test Message**\nThis is a test message from Settlement Inventory Manager to confirm the webhook is working for #${channelName}`,
        username: 'Settlement Crafting Bot',
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        notifications.show({
          title: 'Webhook Test Successful',
          message: `Test message sent to #${channelName}`,
          color: 'green',
        });
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      notifications.show({
        title: 'Webhook Test Failed',
        message: `Failed to send test message to #${channelName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red',
      });
      return false;
    }
  };

  const saveIntegration = async () => {
    if (!currentSettlement?.entityId || !userProfile) {
      notifications.show({
        title: 'Error',
        message: 'Missing settlement or user information',
        color: 'red',
      });
      return;
    }

    if (!validateChannels()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please fill in all channel information',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      // Save Discord integration
      const { data: integrationData, error: integrationError } =
        await supabaseClient
          .from('discord_integrations')
          .insert({
            settlement_id: currentSettlement.entityId,
            server_id: form.values.serverId,
            server_name: form.values.serverName,
            webhook_url: form.values.mainWebhookUrl,
            created_by: userProfile.id,
          })
          .select()
          .single();

      if (integrationError) throw integrationError;

      // Save channel configurations
      const channelInserts = channels.map((channel) => ({
        discord_integration_id: integrationData.id,
        sector: channel.sector,
        channel_id: channel.channelId,
        channel_name: channel.channelName,
        webhook_url: channel.webhookUrl,
      }));

      const { error: channelsError } = await supabaseClient
        .from('discord_channels')
        .insert(channelInserts);

      if (channelsError) throw channelsError;

      notifications.show({
        title: 'Discord Integration Setup Complete',
        message: 'Your Discord integration has been successfully configured!',
        color: 'green',
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving Discord integration:', error);
      notifications.show({
        title: 'Setup Failed',
        message:
          error instanceof Error ? error.message : 'Failed to save integration',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () =>
    setActive((current) => (current < 3 ? current + 1 : current));
  const prevStep = () =>
    setActive((current) => (current > 0 ? current - 1 : current));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Discord Integration Setup"
      size="xl"
      centered
    >
      <Stepper active={active} onStepClick={setActive}>
        <Stepper.Step
          label="Instructions"
          description="How to set up Discord webhooks"
          icon={<IconBrandDiscord size={18} />}
        >
          <Stack gap="md">
            <Alert icon={<IconAlertCircle size={16} />} color="blue">
              You'll need administrator permissions in your Discord server to
              set up webhooks.
            </Alert>

            <Title order={4}>Step-by-step setup:</Title>
            <List type="ordered" spacing="sm">
              <List.Item>
                <Text>
                  Go to your Discord server settings → Integrations → Webhooks
                </Text>
              </List.Item>
              <List.Item>
                <Text>
                  Create a new webhook for each channel you want to use
                </Text>
              </List.Item>
              <List.Item>
                <Text>
                  Copy the webhook URL and channel information for each channel
                </Text>
              </List.Item>
              <List.Item>
                <Text>Configure the channels in the next steps</Text>
              </List.Item>
            </List>

            <Paper p="md" withBorder>
              <Text fw={500} mb="sm">
                Pro Tips:
              </Text>
              <List spacing="xs">
                <List.Item>
                  Use different channels for different sectors to organize
                  crafting orders
                </List.Item>
                <List.Item>
                  You can set up between 1-7 channels (one per sector)
                </List.Item>
                <List.Item>
                  Test webhooks before finishing setup to ensure they work
                </List.Item>
              </List>
            </Paper>

            <Group justify="flex-end">
              <Button onClick={nextStep}>Next: Server Setup</Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step
          label="Server Configuration"
          description="Configure your Discord server"
        >
          <Stack gap="md">
            <Text>
              Enter your Discord server information. You can find the server ID
              by right-clicking your server name with Developer Mode enabled.
            </Text>

            <TextInput
              label="Discord Server ID"
              placeholder="e.g., 123456789012345678"
              {...form.getInputProps('serverId')}
              required
            />

            <TextInput
              label="Discord Server Name"
              placeholder="e.g., My Settlement Discord"
              {...form.getInputProps('serverName')}
              required
            />

            <TextInput
              label="Main Webhook URL"
              placeholder="https://discord.com/api/webhooks/..."
              {...form.getInputProps('mainWebhookUrl')}
              required
              description="This will be used as a fallback webhook"
            />

            <Group justify="space-between">
              <Button variant="default" onClick={prevStep}>
                Back
              </Button>
              <Button
                onClick={nextStep}
                disabled={!form.values.serverId || !form.values.serverName}
              >
                Next: Channels
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step
          label="Channel Configuration"
          description="Set up channels for each sector"
        >
          <Stack gap="md">
            <Group justify="space-between">
              <Text>
                Configure Discord channels for each sector. Orders will be sent
                to the appropriate channel based on their sector.
              </Text>
              <Button
                size="xs"
                leftSection={<IconPlus size={14} />}
                onClick={addChannel}
                disabled={channels.length >= 7}
              >
                Add Channel
              </Button>
            </Group>

            {channels.map((channel, index) => (
              <Paper key={index} p="md" withBorder>
                <Group justify="space-between" mb="sm">
                  <Text fw={500}>Channel {index + 1}</Text>
                  {channels.length > 1 && (
                    <Tooltip label="Remove channel">
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => removeChannel(index)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>

                <Stack gap="sm">
                  <Select
                    label="Sector"
                    placeholder="Select sector"
                    data={AVAILABLE_SECTORS.filter(
                      (sector) =>
                        !channels.some(
                          (c, i) => c.sector === sector && i !== index,
                        ),
                    )}
                    value={channel.sector}
                    onChange={(value) =>
                      updateChannel(index, 'sector', value || '')
                    }
                    required
                  />

                  <TextInput
                    label="Channel ID (Optional)"
                    placeholder="e.g., 123456789012345678"
                    value={channel.channelId}
                    onChange={(event) =>
                      updateChannel(index, 'channelId', event.target.value)
                    }
                    description="Only needed for advanced integrations. The webhook URL is sufficient for basic functionality."
                  />

                  <TextInput
                    label="Channel Name"
                    placeholder="e.g., crafting-orders"
                    value={channel.channelName}
                    onChange={(event) =>
                      updateChannel(index, 'channelName', event.target.value)
                    }
                    required
                  />

                  <TextInput
                    label="Webhook URL"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={channel.webhookUrl}
                    onChange={(event) =>
                      updateChannel(index, 'webhookUrl', event.target.value)
                    }
                    required
                  />

                  <Button
                    size="xs"
                    variant="light"
                    onClick={() =>
                      testWebhook(channel.webhookUrl, channel.channelName)
                    }
                    disabled={!channel.webhookUrl || !channel.channelName}
                  >
                    Test Webhook
                  </Button>
                </Stack>
              </Paper>
            ))}

            <Group justify="space-between">
              <Button variant="default" onClick={prevStep}>
                Back
              </Button>
              <Button onClick={nextStep} disabled={!validateChannels()}>
                Next: Review
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step
          label="Review & Complete"
          description="Review and complete setup"
          icon={<IconCheck size={18} />}
        >
          <Stack gap="md">
            <Text>Review your Discord integration configuration:</Text>

            <Paper p="md" withBorder>
              <Stack gap="sm">
                <Group>
                  <Text fw={500}>Server:</Text>
                  <Text>{form.values.serverName}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Server ID:</Text>
                  <Code>{form.values.serverId}</Code>
                </Group>
              </Stack>
            </Paper>

            <Paper p="md" withBorder>
              <Text fw={500} mb="sm">
                Configured Channels:
              </Text>
              {channels.map((channel, index) => (
                <Group key={index} justify="space-between" mb="xs">
                  <Text>
                    {channel.sector} → #{channel.channelName}
                  </Text>
                  <IconCheck size={16} color="green" />
                </Group>
              ))}
            </Paper>

            <Alert icon={<IconAlertCircle size={16} />} color="yellow">
              Once you complete the setup, crafting order notifications will be
              automatically sent to your Discord channels when orders are
              created, claimed, completed, or cancelled.
            </Alert>

            <Group justify="space-between">
              <Button variant="default" onClick={prevStep}>
                Back
              </Button>
              <Button
                onClick={saveIntegration}
                loading={loading}
                leftSection={<IconBrandDiscord size={16} />}
              >
                Complete Setup
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>
      </Stepper>
    </Modal>
  );
}
