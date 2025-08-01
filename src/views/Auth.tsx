import { useState } from 'react';
import {
  Box,
  Button,
  Center,
  Container,
  Group,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
  Anchor,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCircleKey } from '@tabler/icons-react';
import { supabaseClient } from '../supabase/supabaseClient';
import { useUser } from '../supabase/loader';
import { Navigate, Link } from 'react-router-dom';

export function Authentication() {
  const [loginError, setLoginError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },

    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
    },
  });

  // redirect if logged in
  const { user } = useUser();
  if (user) {
    return <Navigate to="/"></Navigate>;
  }

  return (
    <Box h="100vh" w="100vw">
      <Center h="100vh" w="100%">
        <Container size={620} miw={440}>
          <Group align="baseline">
            <Text c="dimmed">
              <IconCircleKey></IconCircleKey>
            </Text>
            <Title>Login</Title>
          </Group>

          <Paper withBorder shadow="md" p={30} mt={30} radius="md">
            <form
              onSubmit={form.onSubmit(async (values) => {
                setLoginError(null); // Clear any previous errors
                try {
                  const { error } =
                    await supabaseClient.auth.signInWithPassword({
                      email: values.email,
                      password: values.password,
                    });
                  if (error) {
                    setLoginError(error.message);
                  }
                } catch (err) {
                  setLoginError(
                    'An unexpected error occurred. Please try again.',
                  );
                }
              })}
            >
              <TextInput
                label="Email"
                placeholder="you@mantine.dev"
                required
                {...form.getInputProps('email')}
              />
              <PasswordInput
                label="Password"
                placeholder="Your password"
                required
                mt="md"
                {...form.getInputProps('password')}
              />

              {loginError && (
                <Text c="red" size="sm" mt="xs">
                  {loginError}
                </Text>
              )}

              <Button fullWidth mt="xl" type="submit">
                Sign in
              </Button>

              <Text c="dimmed" size="sm" ta="center" mt="md">
                Don't have an account?{' '}
                <Anchor component={Link} to="/signup" size="sm">
                  Sign up
                </Anchor>
              </Text>
            </form>
          </Paper>
        </Container>
      </Center>
    </Box>
  );
}
