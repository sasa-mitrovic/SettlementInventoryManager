import { Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { useAuth } from './AuthProvider';
import { supabaseClient } from '../supabase/supabaseClient';

export function AuthStatus() {
  const { user, loading, initialized } = useAuth();

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
  };

  if (!initialized) {
    return (
      <Card>
        <Text>Initializing authentication...</Text>
      </Card>
    );
  }

  return (
    <Card>
      <Stack gap="md">
        <Title order={4}>Authentication Status</Title>

        {loading ? (
          <Text>Loading user data...</Text>
        ) : user ? (
          <Stack gap="sm">
            <Text>
              <strong>Logged in as:</strong> {user.email}
            </Text>
            <Text size="xs" c="dimmed">
              User ID: {user.id}
            </Text>
            <Group>
              <Button onClick={handleSignOut} variant="outline" color="red">
                Sign Out
              </Button>
            </Group>
          </Stack>
        ) : (
          <Text>Not authenticated</Text>
        )}
      </Stack>
    </Card>
  );
}
