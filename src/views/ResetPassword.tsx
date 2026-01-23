import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Center,
  Container,
  Group,
  Paper,
  PasswordInput,
  Text,
  Title,
  Alert,
  Stack,
  Loader,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconLock, IconCheck } from '@tabler/icons-react';
import { supabaseClient } from '../supabase/supabaseClient';
import { useNavigate } from 'react-router-dom';

export function ResetPassword() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  const form = useForm({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validate: {
      password: (value) =>
        value.length < 6 ? 'Password must be at least 6 characters' : null,
      confirmPassword: (value, values) =>
        value !== values.password ? 'Passwords do not match' : null,
    },
  });

  // Check if user has a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();

      // User should have a session from the recovery link
      if (session) {
        setIsValidSession(true);
      } else {
        // Listen for auth state changes (recovery link sets session)
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
          (event, session) => {
            if (event === 'PASSWORD_RECOVERY' && session) {
              setIsValidSession(true);
            }
          }
        );

        // Give it a moment to process the recovery token from URL
        setTimeout(() => {
          if (isValidSession === null) {
            setIsValidSession(false);
          }
        }, 2000);

        return () => subscription.unsubscribe();
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (values: typeof form.values) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabaseClient.auth.updateUser({
        password: values.password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      // Sign out after password reset so user can log in with new password
      await supabaseClient.auth.signOut();
      setSuccess(true);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Still checking session
  if (isValidSession === null) {
    return (
      <Box h="100vh" w="100vw">
        <Center h="100vh" w="100%">
          <Container size={620} miw={440}>
            <Paper withBorder shadow="md" p={30} radius="md">
              <Stack align="center" gap="md">
                <Loader size="lg" />
                <Text c="dimmed">Validating reset link...</Text>
              </Stack>
            </Paper>
          </Container>
        </Center>
      </Box>
    );
  }

  // Invalid or expired session
  if (isValidSession === false) {
    return (
      <Box h="100vh" w="100vw">
        <Center h="100vh" w="100%">
          <Container size={620} miw={440}>
            <Paper withBorder shadow="md" p={30} radius="md">
              <Stack align="center" gap="md">
                <Alert color="red" title="Invalid or Expired Link">
                  This password reset link is invalid or has expired. Please request a new
                  one.
                </Alert>
                <Button onClick={() => navigate('/forgot-password')}>
                  Request New Reset Link
                </Button>
              </Stack>
            </Paper>
          </Container>
        </Center>
      </Box>
    );
  }

  // Success state
  if (success) {
    return (
      <Box h="100vh" w="100vw">
        <Center h="100vh" w="100%">
          <Container size={620} miw={440}>
            <Paper withBorder shadow="md" p={30} radius="md">
              <Stack align="center" gap="md">
                <IconCheck size={48} color="var(--mantine-color-green-6)" />
                <Title order={3}>Password Updated</Title>
                <Text c="dimmed" ta="center">
                  Your password has been successfully updated. You can now sign in with your
                  new password.
                </Text>
                <Button onClick={() => navigate('/auth')} mt="md">
                  Go to Login
                </Button>
              </Stack>
            </Paper>
          </Container>
        </Center>
      </Box>
    );
  }

  // Reset password form
  return (
    <Box h="100vh" w="100vw">
      <Center h="100vh" w="100%">
        <Container size={620} miw={440}>
          <Group align="baseline">
            <Text c="dimmed">
              <IconLock />
            </Text>
            <Title>Reset Password</Title>
          </Group>

          <Paper withBorder shadow="md" p={30} mt={30} radius="md">
            <Text c="dimmed" size="sm" mb="lg">
              Enter your new password below.
            </Text>

            <form onSubmit={form.onSubmit(handleSubmit)}>
              <PasswordInput
                label="New Password"
                placeholder="Enter new password"
                required
                {...form.getInputProps('password')}
              />
              <PasswordInput
                label="Confirm Password"
                placeholder="Confirm new password"
                required
                mt="md"
                {...form.getInputProps('confirmPassword')}
              />

              {error && (
                <Alert color="red" mt="md">
                  {error}
                </Alert>
              )}

              <Button fullWidth mt="xl" type="submit" loading={isLoading}>
                Update Password
              </Button>
            </form>
          </Paper>
        </Container>
      </Center>
    </Box>
  );
}
