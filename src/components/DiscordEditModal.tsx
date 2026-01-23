import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Text,
  TextInput,
  Button,
  Group,
  Alert,
  Paper,
  Title,
  ActionIcon,
  Tooltip,
  Loader,
  Center,
  Badge,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconBrandDiscord,
  IconAlertCircle,
  IconTrash,
  IconPlus,
  IconDeviceFloppy,
} from '@tabler/icons-react';
import { supabaseClient } from '../supabase/supabaseClient';
import { useSettlement } from '../contexts/SettlementContext_simple';

interface DiscordEditModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ChannelData {
  id?: string;
  sector: string;
  channelId: string;
  channelName: string;
  webhookUrl: string;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface IntegrationData {
  id: string;
  serverId: string;
  serverName: string;
  webhookUrl: string;
  isActive: boolean;
}

export function DiscordEditModal({
  opened,
  onClose,
  onSuccess,
}: DiscordEditModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [integration, setIntegration] = useState<IntegrationData | null>(null);
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { currentSettlement } = useSettlement();

  const form = useForm({
    initialValues: {
      serverId: '',
      serverName: '',
      mainWebhookUrl: '',
    },
  });

  // Load existing integration data
  useEffect(() => {
    if (opened && currentSettlement?.entityId) {
      loadIntegrationData();
    }
  }, [opened, currentSettlement?.entityId]);

  const loadIntegrationData = async () => {
    if (!currentSettlement?.entityId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch integration
      const { data: integrationData, error: integrationError } = await supabaseClient
        .from('discord_integrations')
        .select('*')
        .eq('settlement_id', currentSettlement.entityId)
        .single();

      if (integrationError) {
        if (integrationError.code === 'PGRST116') {
          setError('No Discord integration found for this settlement.');
        } else {
          throw integrationError;
        }
        return;
      }

      setIntegration({
        id: integrationData.id,
        serverId: integrationData.server_id || '',
        serverName: integrationData.server_name || '',
        webhookUrl: integrationData.webhook_url || '',
        isActive: integrationData.is_active,
      });

      form.setValues({
        serverId: integrationData.server_id || '',
        serverName: integrationData.server_name || '',
        mainWebhookUrl: integrationData.webhook_url || '',
      });

      // Fetch channels
      const { data: channelsData, error: channelsError } = await supabaseClient
        .from('discord_channels')
        .select('*')
        .eq('discord_integration_id', integrationData.id);

      if (channelsError) throw channelsError;

      setChannels(
        (channelsData || []).map((ch) => ({
          id: ch.id,
          sector: ch.sector || '',
          channelId: ch.channel_id || '',
          channelName: ch.channel_name || '',
          webhookUrl: ch.webhook_url || '',
        }))
      );
    } catch (err) {
      console.error('Error loading Discord integration:', err);
      setError(err instanceof Error ? err.message : 'Failed to load integration data');
    } finally {
      setLoading(false);
    }
  };

  const addChannel = () => {
    setChannels([
      ...channels,
      {
        sector: '',
        channelId: '',
        channelName: '',
        webhookUrl: '',
        isNew: true,
      },
    ]);
  };

  const removeChannel = (index: number) => {
    const channel = channels[index];
    if (channel.id) {
      // Mark existing channel for deletion
      const newChannels = [...channels];
      newChannels[index] = { ...channel, isDeleted: true };
      setChannels(newChannels);
    } else {
      // Remove new channel entirely
      setChannels(channels.filter((_, i) => i !== index));
    }
  };

  const updateChannel = (index: number, field: keyof ChannelData, value: string) => {
    const newChannels = [...channels];
    newChannels[index] = { ...newChannels[index], [field]: value };
    setChannels(newChannels);
  };

  const testWebhook = async (webhookUrl: string, channelName: string) => {
    try {
      const testPayload = {
        content: `🧪 **Test Message**\nThis is a test message from Settlement Inventory Manager to confirm the webhook is working for #${channelName}`,
        username: 'Settlement Crafting Bot',
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        notifications.show({
          title: 'Webhook Test Successful',
          message: `Test message sent to #${channelName}`,
          color: 'green',
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      notifications.show({
        title: 'Webhook Test Failed',
        message: `Failed to send test message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red',
      });
    }
  };

  const saveChanges = async () => {
    if (!integration) return;

    setSaving(true);
    try {
      // Update integration
      const { error: updateError } = await supabaseClient
        .from('discord_integrations')
        .update({
          server_id: form.values.serverId,
          server_name: form.values.serverName,
          webhook_url: form.values.mainWebhookUrl,
        })
        .eq('id', integration.id);

      if (updateError) throw updateError;

      // Handle channel changes
      for (const channel of channels) {
        if (channel.isDeleted && channel.id) {
          // Delete channel
          const { error: deleteError } = await supabaseClient
            .from('discord_channels')
            .delete()
            .eq('id', channel.id);
          if (deleteError) throw deleteError;
        } else if (channel.isNew && !channel.isDeleted) {
          // Insert new channel
          const { error: insertError } = await supabaseClient
            .from('discord_channels')
            .insert({
              discord_integration_id: integration.id,
              sector: channel.sector,
              channel_id: channel.channelId,
              channel_name: channel.channelName,
              webhook_url: channel.webhookUrl,
            });
          if (insertError) throw insertError;
        } else if (channel.id && !channel.isDeleted) {
          // Update existing channel
          const { error: updateChError } = await supabaseClient
            .from('discord_channels')
            .update({
              sector: channel.sector,
              channel_id: channel.channelId,
              channel_name: channel.channelName,
              webhook_url: channel.webhookUrl,
            })
            .eq('id', channel.id);
          if (updateChError) throw updateChError;
        }
      }

      notifications.show({
        title: 'Changes Saved',
        message: 'Discord integration settings have been updated.',
        color: 'green',
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error saving Discord integration:', err);
      notifications.show({
        title: 'Save Failed',
        message: err instanceof Error ? err.message : 'Failed to save changes',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const activeChannels = channels.filter((ch) => !ch.isDeleted);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <IconBrandDiscord size={24} />
          <Text fw={600}>Edit Discord Integration</Text>
        </Group>
      }
      size="xl"
      centered
    >
      {loading ? (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      ) : error ? (
        <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
          {error}
        </Alert>
      ) : (
        <Stack gap="md">
          <Paper p="md" withBorder>
            <Title order={5} mb="sm">Server Configuration</Title>
            <Stack gap="sm">
              <TextInput
                label="Discord Server ID"
                placeholder="e.g., 123456789012345678"
                {...form.getInputProps('serverId')}
              />
              <TextInput
                label="Discord Server Name"
                placeholder="e.g., My Settlement Discord"
                {...form.getInputProps('serverName')}
              />
              <TextInput
                label="Main Webhook URL"
                placeholder="https://discord.com/api/webhooks/..."
                {...form.getInputProps('mainWebhookUrl')}
                description="Fallback webhook for notifications"
              />
            </Stack>
          </Paper>

          <Paper p="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={5}>Channel Webhooks</Title>
              <Button
                size="xs"
                leftSection={<IconPlus size={14} />}
                onClick={addChannel}
                variant="light"
              >
                Add Channel
              </Button>
            </Group>

            {activeChannels.length === 0 ? (
              <Text c="dimmed" ta="center" py="md">
                No channels configured. Add a channel to send notifications.
              </Text>
            ) : (
              <Stack gap="sm">
                {channels.map((channel, index) => {
                  if (channel.isDeleted) return null;
                  return (
                    <Paper key={channel.id || `new-${index}`} p="sm" withBorder>
                      <Group justify="space-between" mb="xs">
                        <Group gap="xs">
                          <Text fw={500} size="sm">
                            {channel.sector || 'New Channel'}
                          </Text>
                          {channel.isNew && (
                            <Badge size="xs" color="blue">New</Badge>
                          )}
                        </Group>
                        <Tooltip label="Remove channel">
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            size="sm"
                            onClick={() => removeChannel(index)}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>

                      <Stack gap="xs">
                        <TextInput
                          label="Sector"
                          placeholder="e.g., Forest&Wood"
                          size="xs"
                          value={channel.sector}
                          onChange={(e) => updateChannel(index, 'sector', e.target.value)}
                        />
                        <TextInput
                          label="Channel Name"
                          placeholder="e.g., crafting-orders"
                          size="xs"
                          value={channel.channelName}
                          onChange={(e) => updateChannel(index, 'channelName', e.target.value)}
                        />
                        <TextInput
                          label="Webhook URL"
                          placeholder="https://discord.com/api/webhooks/..."
                          size="xs"
                          value={channel.webhookUrl}
                          onChange={(e) => updateChannel(index, 'webhookUrl', e.target.value)}
                        />
                        <Button
                          size="xs"
                          variant="subtle"
                          onClick={() => testWebhook(channel.webhookUrl, channel.channelName)}
                          disabled={!channel.webhookUrl}
                        >
                          Test Webhook
                        </Button>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Paper>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={saveChanges}
              loading={saving}
            >
              Save Changes
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
