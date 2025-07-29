import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Text,
  Button,
  Paper,
  Group,
  Avatar,
  Badge,
  Select,
  Alert,
  LoadingOverlay,
  Stepper,
  TextInput,
  ActionIcon,
  Code,
} from '@mantine/core';
import {
  IconBrandDiscord,
  IconServer,
  IconSettings,
  IconCheck,
  IconAlertCircle,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { supabaseClient } from '../supabase/supabaseClient';
import { useSettlement } from '../contexts/SettlementContext_simple';
import { useOptimizedUserWithProfile } from '../supabase/loader';

interface DiscordOAuthSetupProps {
  opened: boolean;
  onClose: () => void;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
}

interface ChannelConfig {
  sector: string;
  channelId: string;
  channelName: string;
  webhookUrl: string;
}

const SPACETIME_SECTORS = [
  'Forest&Wood',
  'Earth&Ore',
  'Wild&Hide',
  'Fields&Cloth',
  'Waters&Meals',
  'Lore&Trade',
  'SlayerSquad',
];

export function DiscordOAuthSetup({ opened, onClose }: DiscordOAuthSetupProps) {
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(null);
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);
  const [manualServerId, setManualServerId] = useState<string>('');
  const [manualServerName, setManualServerName] = useState<string>('');
  const [channels, setChannels] = useState<ChannelConfig[]>([
    { sector: 'Forest&Wood', channelId: '', channelName: '', webhookUrl: '' },
  ]);
  const [error, setError] = useState<string | null>(null);

  const { currentSettlement } = useSettlement();
  const { userProfile } = useOptimizedUserWithProfile();

  // Function to fetch user's Discord guilds
  const fetchUserGuilds = async (accessToken: string) => {
    try {
      const response = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status}`);
      }

      const guildsData = await response.json();
      const formattedGuilds: DiscordGuild[] = guildsData.map(
        (guild: {
          id: string;
          name: string;
          icon: string | null;
          owner: boolean;
          permissions: string;
          features?: string[];
        }) => ({
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          owner: guild.owner,
          permissions: guild.permissions,
          features: guild.features || [],
        }),
      );

      setGuilds(formattedGuilds);
    } catch (err) {
      console.error('Failed to fetch Discord guilds:', err);
      // Set empty guilds array so user can fall back to manual input
      setGuilds([]);
    }
  };

  // Reset state when modal opens, but check for existing Discord auth
  useEffect(() => {
    if (opened) {
      setError(null);
      setManualServerId('');
      setManualServerName('');
      setChannels([
        {
          sector: 'Forest&Wood',
          channelId: '',
          channelName: '',
          webhookUrl: '',
        },
      ]);

      // Check if user is already authenticated with Discord
      const checkAuth = async () => {
        try {
          setLoading(true);

          const {
            data: { session },
            error: sessionError,
          } = await supabaseClient.auth.getSession();

          if (sessionError || !session?.user) {
            setActive(0);
            return;
          }

          const discordIdentity = session.user.identities?.find(
            (identity) => identity.provider === 'discord',
          );

          if (discordIdentity && discordIdentity.identity_data) {
            // User is already authenticated with Discord
            setDiscordUser({
              id: discordIdentity.identity_data.sub || discordIdentity.user_id,
              username:
                discordIdentity.identity_data.custom_claims?.global_name ||
                discordIdentity.identity_data.name ||
                discordIdentity.identity_data.username,
              discriminator: discordIdentity.identity_data.discriminator || '0',
              avatar: discordIdentity.identity_data.avatar,
            });

            // Fetch user's Discord guilds
            const providerToken = session.provider_token;
            if (providerToken) {
              await fetchUserGuilds(providerToken);
            }
            setActive(1); // Skip to server selection
          } else {
            setActive(0);
            setDiscordUser(null);
            setGuilds([]);
            setSelectedGuild(null);
          }
        } catch (err) {
          console.error('Error checking Discord auth:', err);
          setActive(0);
        } finally {
          setLoading(false);
        }
      };

      checkAuth();
    }
  }, [opened]);

  const signInWithDiscord = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          scopes: 'identify guilds',
          redirectTo: `${window.location.origin}/discord-setup`,
        },
      });

      if (error) throw error;

      // The redirect will handle the rest
    } catch (err) {
      console.error('Discord OAuth error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to sign in with Discord',
      );
    } finally {
      setLoading(false);
    }
  };

  const selectGuild = (guild: DiscordGuild) => {
    setSelectedGuild(guild);
    setActive(2);
  };

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
    const updated = [...channels];
    updated[index] = { ...updated[index], [field]: value };
    setChannels(updated);
  };

  const completeSetup = async () => {
    if (!selectedGuild || !currentSettlement || !userProfile) {
      setError('Missing required information');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Save Discord integration
      const { data: integrationData, error: integrationError } =
        await supabaseClient
          .from('discord_integrations')
          .insert({
            settlement_id: currentSettlement.entityId,
            server_id: selectedGuild.id,
            server_name: selectedGuild.name,
            webhook_url: channels[0].webhookUrl, // Use first channel as fallback
            created_by: userProfile.id,
          })
          .select()
          .single();

      if (integrationError) throw integrationError;

      // Save channel configurations
      const channelInserts = channels
        .filter((channel) => channel.webhookUrl) // Only save channels with webhook URLs
        .map((channel) => ({
          discord_integration_id: integrationData.id,
          sector: channel.sector,
          channel_id: channel.channelId,
          channel_name: channel.channelName,
          webhook_url: channel.webhookUrl,
        }));

      if (channelInserts.length > 0) {
        const { error: channelsError } = await supabaseClient
          .from('discord_channels')
          .insert(channelInserts);

        if (channelsError) throw channelsError;
      }

      setActive(3);
    } catch (err) {
      console.error('Failed to save Discord integration:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to save integration',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state
    setTimeout(() => {
      setActive(0);
      setDiscordUser(null);
      setGuilds([]);
      setSelectedGuild(null);
      setChannels([
        {
          sector: 'Forest&Wood',
          channelId: '',
          channelName: '',
          webhookUrl: '',
        },
      ]);
      setError(null);
    }, 300);
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group>
          <IconBrandDiscord size={24} />
          <Text fw={500}>Discord Integration Setup</Text>
        </Group>
      }
      size="lg"
      centered
    >
      <LoadingOverlay visible={loading} />

      <Stepper active={active}>
        {/* Step 1: Discord OAuth */}
        <Stepper.Step
          label="Connect Discord"
          description="Sign in with your Discord account"
          icon={<IconBrandDiscord size={18} />}
        >
          <Stack gap="md">
            <Text>
              Connect your Discord account to automatically configure your
              server integration. We'll fetch your servers and help you set up
              webhooks.
            </Text>

            {!discordUser ? (
              <Button
                leftSection={<IconBrandDiscord size={20} />}
                onClick={signInWithDiscord}
                size="lg"
                color="indigo"
                disabled={loading}
              >
                Sign in with Discord
              </Button>
            ) : (
              <Paper p="md" withBorder>
                <Group>
                  <Avatar
                    src={`https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`}
                    alt={discordUser.username}
                  />
                  <div>
                    <Text fw={500}>{discordUser.username}</Text>
                    <Text size="sm" c="dimmed">
                      Connected to Discord
                    </Text>
                  </div>
                </Group>
              </Paper>
            )}
          </Stack>
        </Stepper.Step>

        {/* Step 2: Select Server */}
        <Stepper.Step
          label="Select Server"
          description="Choose your Discord server"
          icon={<IconServer size={18} />}
        >
          <Stack gap="md">
            <Text>
              Select the Discord server where you want to send crafting order
              notifications:
            </Text>

            {guilds.length === 0 ? (
              <Stack gap="md">
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  title="Manual Server Setup"
                  color="blue"
                >
                  We'll need you to enter your Discord server information
                  manually. You can find your server ID by right-clicking your
                  server name in Discord with Developer Mode enabled.
                </Alert>

                <Stack gap="sm">
                  <TextInput
                    label="Discord Server ID"
                    placeholder="e.g., 123456789012345678"
                    value={manualServerId}
                    onChange={(e) => setManualServerId(e.target.value)}
                    required
                  />

                  <TextInput
                    label="Discord Server Name"
                    placeholder="e.g., My Settlement Discord"
                    value={manualServerName}
                    onChange={(e) => setManualServerName(e.target.value)}
                    required
                  />

                  {manualServerId && manualServerName && (
                    <Button
                      onClick={() => {
                        setSelectedGuild({
                          id: manualServerId,
                          name: manualServerName,
                          icon: null,
                          owner: false,
                          permissions: '0',
                          features: [],
                        });
                        setActive(2);
                      }}
                    >
                      Continue with This Server
                    </Button>
                  )}
                </Stack>
              </Stack>
            ) : (
              <Stack gap="sm">
                {guilds.map((guild) => (
                  <Paper
                    key={guild.id}
                    p="md"
                    withBorder
                    style={{ cursor: 'pointer' }}
                    onClick={() => selectGuild(guild)}
                    bg={selectedGuild?.id === guild.id ? 'blue.0' : undefined}
                  >
                    <Group justify="space-between">
                      <Group>
                        <Avatar
                          src={
                            guild.icon
                              ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
                              : null
                          }
                          alt={guild.name}
                        >
                          <IconServer size={20} />
                        </Avatar>
                        <div>
                          <Text fw={500}>{guild.name}</Text>
                          <Group gap="xs">
                            <Badge size="xs" color="green">
                              Admin
                            </Badge>
                            {guild.owner && (
                              <Badge size="xs" color="gold">
                                Owner
                              </Badge>
                            )}
                          </Group>
                        </div>
                      </Group>
                      <Code>{guild.id}</Code>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Stack>
        </Stepper.Step>

        {/* Step 3: Configure Channels */}
        <Stepper.Step
          label="Configure Channels"
          description="Set up webhook URLs for each sector"
          icon={<IconSettings size={18} />}
        >
          <Stack gap="md">
            <Text>
              Configure webhook URLs for different crafting order sectors. Each
              sector can have its own Discord channel.
            </Text>

            <Alert
              icon={<IconAlertCircle size={16} />}
              title="How to get webhook URLs"
              color="blue"
            >
              In Discord: Go to Server Settings → Integrations → Webhooks → New
              Webhook. Copy the webhook URL and paste it below.
            </Alert>

            {channels.map((channel, index) => (
              <Paper key={index} p="md" withBorder>
                <Group align="flex-end" mb="sm">
                  <Select
                    label="Sector"
                    value={channel.sector}
                    onChange={(value) =>
                      updateChannel(index, 'sector', value || 'Forest&Wood')
                    }
                    data={SPACETIME_SECTORS}
                    style={{ flex: 1 }}
                  />
                  {channels.length > 1 && (
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => removeChannel(index)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  )}
                </Group>

                <TextInput
                  label="Channel Name (optional)"
                  placeholder="e.g., #general-crafting"
                  value={channel.channelName}
                  onChange={(e) =>
                    updateChannel(index, 'channelName', e.target.value)
                  }
                  mb="sm"
                />

                <TextInput
                  label="Webhook URL"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={channel.webhookUrl}
                  onChange={(e) =>
                    updateChannel(index, 'webhookUrl', e.target.value)
                  }
                  required={index === 0}
                />
              </Paper>
            ))}

            {channels.length < 7 && (
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={addChannel}
                variant="light"
              >
                Add Another Channel
              </Button>
            )}
          </Stack>
        </Stepper.Step>

        {/* Step 4: Complete */}
        <Stepper.Step
          label="Complete"
          description="Integration ready"
          icon={<IconCheck size={18} />}
        >
          <Stack gap="md" align="center">
            <IconCheck size={48} color="green" />
            <Text fw={500} size="lg">
              Discord Integration Complete!
            </Text>
            <Text ta="center">
              Your Discord integration has been set up successfully. Crafting
              order notifications will now be sent to your Discord server based
              on the configured sectors.
            </Text>
          </Stack>
        </Stepper.Step>
      </Stepper>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
          mt="md"
        >
          {error}
        </Alert>
      )}

      <Group justify="space-between" mt="xl">
        <Button
          variant="subtle"
          onClick={active === 3 ? handleClose : () => setActive(active - 1)}
          disabled={active === 0 || loading}
        >
          {active === 3 ? 'Close' : 'Back'}
        </Button>

        {active < 3 && (
          <Button
            onClick={
              active === 0
                ? signInWithDiscord
                : active === 1
                  ? () => {} // Guild selection happens on click
                  : active === 2
                    ? completeSetup
                    : handleClose
            }
            disabled={
              loading ||
              (active === 1 && !selectedGuild) ||
              (active === 2 && !channels[0].webhookUrl)
            }
          >
            {active === 0
              ? 'Connect Discord'
              : active === 1
                ? 'Select Server'
                : active === 2
                  ? 'Complete Setup'
                  : 'Close'}
          </Button>
        )}
      </Group>
    </Modal>
  );
}
