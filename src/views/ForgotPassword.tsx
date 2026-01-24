import { useState } from 'react';
import {
  Box,
  Button,
  Center,
  Container,
  Group,
  Paper,
  Text,
  TextInput,
  Title,
  Alert,
  Anchor,
  Stack,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconMail, IconCheck, IconArrowLeft } from '@tabler/icons-react';
import { supabaseClient } from '../supabase/supabaseClient';
import { useUser } from '../supabase/loader';
import { Navigate, Link } from 'react-router-dom';

export function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm({
    initialValues: {
      email: '',
    },
    validate: {
      email: (value) =>
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)
          ? null
          : 'Please enter a valid email address',
    },
  });

  // Redirect if logged in
  const { user } = useUser();
  if (user) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (values: typeof form.values) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(
        values.email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setEmailSent(true);
    } catch (err) {
      console.error('Error sending password reset email:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <Box h="100vh" w="100vw">
        <Center h="100vh" w="100%">
          <Container size={620} miw={440}>
            <Paper withBorder shadow="md" p={30} radius="md">
              <Stack align="center" gap="md">
                <IconCheck size={48} color="var(--mantine-color-green-6)" />
                <Title order={3}>Check Your Email</Title>
                <Text c="dimmed" ta="center">
                  We've sent a password reset link to <strong>{form.values.email}</strong>.
                  Please check your inbox and click the link to reset your password.
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Didn't receive the email? Check your spam folder or try again.
                </Text>
                <Group mt="md">
                  <Button
                    variant="light"
                    onClick={() => {
                      setEmailSent(false);
                      form.reset();
                    }}
                  >
                    Try Again
                  </Button>
                  <Button component={Link} to="/auth">
                    Back to Login
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </Container>
        </Center>
      </Box>
    );
  }

  return (
    <Box h="100vh" w="100vw">
      <Center h="100vh" w="100%">
        <Container size={620} miw={440}>
          <Group align="baseline">
            <Text c="dimmed">
              <IconMail />
            </Text>
            <Title>Forgot Password</Title>
          </Group>

          <Paper withBorder shadow="md" p={30} mt={30} radius="md">
            <Text c="dimmed" size="sm" mb="lg">
              Enter your email address and we'll send you a link to reset your password.
            </Text>

            <form onSubmit={form.onSubmit(handleSubmit)}>
              <TextInput
                label="Email"
                placeholder="you@example.com"
                required
                {...form.getInputProps('email')}
              />

              {error && (
                <Alert color="red" mt="md">
                  {error}
                </Alert>
              )}

              <Button fullWidth mt="xl" type="submit" loading={isLoading}>
                Send Reset Link
              </Button>

              <Anchor
                component={Link}
                to="/auth"
                size="sm"
                mt="md"
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <IconArrowLeft size={14} />
                Back to Login
              </Anchor>
            </form>
          </Paper>
        </Container>
      </Center>
    </Box>
  );
}
