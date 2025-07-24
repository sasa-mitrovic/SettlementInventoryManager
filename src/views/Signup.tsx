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
  Alert,
  Anchor,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCheck, IconMail } from '@tabler/icons-react';
import { supabaseClient } from '../supabase/supabaseClient';
import { useUser } from '../supabase/loader';
import { Navigate, Link } from 'react-router-dom';

export function Signup() {
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
      inGameName: '',
    },

    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) =>
        value.length < 6 ? 'Password must be at least 6 characters long' : null,
      confirmPassword: (value, values) =>
        value !== values.password ? 'Passwords do not match' : null,
      inGameName: (value) =>
        value.trim().length < 2
          ? 'In Game Name must be at least 2 characters long'
          : null,
    },
  }); // redirect if logged in
  const { user } = useUser();
  if (user) {
    return <Navigate to="/" />;
  }

  const handleSignup = async (values: typeof form.values) => {
    setSignupError(null);
    setIsLoading(true);

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            in_game_name: values.inGameName,
          },
        },
      });

      if (error) {
        setSignupError(error.message);
      } else if (data.user) {
        console.log('User signed up successfully:', data.user.id);
        console.log('Metadata sent:', { in_game_name: values.inGameName });

        // Wait a moment and then ensure the profile has the in_game_name
        // This is a fallback in case the trigger doesn't work
        setTimeout(async () => {
          try {
            if (data.user?.id) {
              const { data: profileData, error: profileError } =
                await supabaseClient.rpc('complete_user_signup', {
                  user_id: data.user.id,
                  user_email: values.email,
                  user_in_game_name: values.inGameName,
                });

              if (profileError) {
                console.error('Error completing profile:', profileError);
              } else if (profileData && !profileData.success) {
                console.error('Profile completion failed:', profileData.error);
              } else {
                console.log('Profile completed successfully');
              }
            }
          } catch (err) {
            console.error('Error calling complete_user_signup:', err);
          }
        }, 1000); // Wait 1 second for the trigger to complete

        setSignupSuccess(true);
        form.reset();
      }
    } catch (err) {
      console.error('Signup error:', err);
      setSignupError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  if (signupSuccess) {
    return (
      <Box h="100vh" w="100vw">
        <Center h="100vh" w="100%">
          <Container size={620} miw={440}>
            <Alert
              icon={<IconCheck size="1rem" />}
              title="Check your email!"
              color="green"
              radius="md"
            >
              <Text>
                We've sent you a verification email. Please check your inbox and
                click the verification link to complete your account setup.
              </Text>
              <Text mt="md">
                After verifying your email, you can{' '}
                <Anchor component={Link} to="/auth">
                  sign in here
                </Anchor>
                .
              </Text>
            </Alert>
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
            <Title>Sign Up</Title>
          </Group>

          <Paper withBorder shadow="md" p={30} mt={30} radius="md">
            <form onSubmit={form.onSubmit(handleSignup)}>
              <TextInput
                label="Email"
                placeholder="you@example.com"
                required
                {...form.getInputProps('email')}
              />
              <TextInput
                label="In Game Name"
                placeholder="Your in-game name"
                required
                mt="md"
                {...form.getInputProps('inGameName')}
              />
              <PasswordInput
                label="Password"
                placeholder="Your password"
                required
                mt="md"
                {...form.getInputProps('password')}
              />
              <PasswordInput
                label="Confirm Password"
                placeholder="Confirm your password"
                required
                mt="md"
                {...form.getInputProps('confirmPassword')}
              />{' '}
              {signupError && (
                <Text c="red" size="sm" mt="xs">
                  {signupError}
                </Text>
              )}
              <Button
                fullWidth
                mt="xl"
                type="submit"
                loading={isLoading}
                disabled={isLoading}
              >
                Sign Up
              </Button>
              <Text c="dimmed" size="sm" ta="center" mt="md">
                Already have an account?{' '}
                <Anchor component={Link} to="/auth" size="sm">
                  Sign in
                </Anchor>
              </Text>
            </form>
          </Paper>
        </Container>
      </Center>
    </Box>
  );
}
