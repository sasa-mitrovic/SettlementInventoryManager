import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Title,
  Text,
  Stack,
  Alert,
  Loader,
  Center,
  Button,
} from '@mantine/core';
import {
  IconBrandDiscord,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react';
import { supabaseClient } from '../supabase/supabaseClient';
import { User } from '@supabase/supabase-js';
import { DiscordOAuthSetup } from '../components/DiscordOAuthSetup';

export function DiscordSetupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showOAuthSetup, setShowOAuthSetup] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current session after OAuth redirect
        const {
          data: { session },
          error: sessionError,
        } = await supabaseClient.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          setUser(session.user);
          console.log('Discord OAuth successful:', session.user);

          // Show the setup page (not auto-redirect)
          setShowOAuthSetup(true);
        } else {
          throw new Error('No session found after Discord OAuth');
        }
      } catch (err) {
        console.error('Discord setup error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, []);

  const handleStartSetup = () => {
    setShowSetupModal(true);
  };

  const handleSetupComplete = () => {
    // After Discord integration is set up, go back to crafting orders
    navigate('/crafting-orders');
  };

  const handleSkipSetup = () => {
    // User wants to skip setup for now
    navigate('/crafting-orders');
  };

  if (loading) {
    return (
      <Center>
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Title order={2}>Setting up Discord integration...</Title>
          <Text c="dimmed">Please wait while we complete the setup.</Text>
        </Stack>
      </Center>
    );
  }

  if (error) {
    return (
      <Stack gap="md">
        <Title order={2}>Discord Setup Error</Title>
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Setup Failed"
          color="red"
        >
          {error}
        </Alert>
        <Button onClick={() => navigate('/crafting-orders')} variant="outline">
          Return to Crafting Orders
        </Button>
      </Stack>
    );
  }

  if (showOAuthSetup) {
    return (
      <>
        <Stack align="center" gap="md" mb="xl">
          <IconCheck size={48} color="green" />
          <Title order={2}>Discord Connected Successfully!</Title>
          <Text c="dimmed" ta="center">
            Your Discord account has been connected. Now let's set up Discord
            notifications for your settlement's crafting orders.
          </Text>

          {user && (
            <Alert
              icon={<IconBrandDiscord size={16} />}
              title="Connected Account"
              color="blue"
            >
              Connected as:{' '}
              {user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email}
            </Alert>
          )}

          <Stack gap="sm" align="center">
            <Button
              size="lg"
              leftSection={<IconBrandDiscord size={20} />}
              onClick={handleStartSetup}
            >
              Continue with Discord Setup
            </Button>

            <Button variant="subtle" onClick={handleSkipSetup}>
              Skip for now
            </Button>
          </Stack>
        </Stack>

        {/* Discord OAuth Setup Modal */}
        <DiscordOAuthSetup
          opened={showSetupModal}
          onClose={handleSetupComplete}
        />
      </>
    );
  }

  return null;
}
