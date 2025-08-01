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
import { useCallback } from 'react';
import { IconCheck, IconMail } from '@tabler/icons-react';
import { supabaseClient } from '../supabase/supabaseClient';
import { useUser } from '../supabase/loader';
import { Navigate, Link } from 'react-router-dom';
import { PlayerSearchSelect } from '../components/PlayerSearchSelect';
import { settlementPopulationService } from '../services/settlementPopulationService';

export function Signup() {
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [usernameValidationResult, setUsernameValidationResult] = useState<{
    available: boolean;
    message: string;
  } | null>(null);
  const [selectedPlayerData, setSelectedPlayerData] = useState<{
    entityId: string | null;
    playerName: string | null;
    empireName: string | null;
    empireId: string | null;
  }>({
    entityId: null,
    playerName: null,
    empireName: null,
    empireId: null,
  });

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
          ? 'You must select your in-game username from the search results'
          : null,
    },
  }); // redirect if logged in
  const { user } = useUser();
  if (user) {
    return <Navigate to="/" />;
  }

  const handleSignup = async (values: typeof form.values) => {
    setSignupError(null);

    // Check if username validation shows username is taken
    if (usernameValidationResult && !usernameValidationResult.available) {
      setSignupError(
        'Cannot create account: Username is already taken. Please select a different username.',
      );
      return;
    }

    // Check email availability before attempting signup
    try {
      const { data: emailCheck, error: emailCheckError } =
        await supabaseClient.rpc('check_email_availability', {
          email_to_check: values.email,
        });

      if (!emailCheckError && emailCheck && !emailCheck.available) {
        setSignupError(
          'This email address is already in use. Please use a different email or sign in instead.',
        );
        return;
      }
    } catch (emailCheckErr) {
      console.warn(
        'Email availability check failed, proceeding with signup:',
        emailCheckErr,
      );
      // Continue with signup even if check fails
    }

    // Require that a player was actually selected from the search results
    if (!selectedPlayerData.entityId || !selectedPlayerData.playerName) {
      setSignupError(
        'Please select your in-game username from the search results. Manual entry is not allowed.',
      );
      return;
    }

    // Ensure the selected player name matches the form input
    if (selectedPlayerData.playerName !== values.inGameName) {
      setSignupError(
        'The selected username does not match the form input. Please select again from the search results.',
      );
      return;
    }

    setIsLoading(true);

    try {
      // Note: Empire data can be null for independent players (players without empire membership)
      // The system supports both empire members and independent players
      const { data, error } = await supabaseClient.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            in_game_name: values.inGameName,
            empire: selectedPlayerData.empireName || null, // null for independent players
            bitjita_empire_id: selectedPlayerData.empireId, // null for independent players
          },
        },
      });

      if (error) {
        console.error('Signup error details:', error);
        // Provide more specific error messages based on the error type
        if (error.message?.includes('Database error saving new user')) {
          setSignupError(
            'There was an issue creating your account. This might be due to a configuration problem. Please try again or contact support if the issue persists.',
          );
        } else if (error.message?.includes('User already registered')) {
          setSignupError(
            'An account with this email already exists. Please try signing in instead.',
          );
        } else {
          setSignupError(error.message);
        }
      } else if (data.user) {
        // Wait a moment and then ensure the profile has the in_game_name
        // This is a fallback in case the trigger doesn't work
        // Note: Supports both empire members and independent players (null empire values)
        setTimeout(async () => {
          try {
            if (data.user?.id) {
              console.log('🔧 Current selectedPlayerData:', selectedPlayerData);
              console.log('🔧 Completing user signup with data:', {
                user_id: data.user.id,
                user_email: values.email,
                user_in_game_name: values.inGameName,
                user_empire: selectedPlayerData.empireName || null,
                user_bitjita_user_id: selectedPlayerData.entityId || null,
                user_bitjita_empire_id: selectedPlayerData.empireId || null,
              });

              console.log(
                '🔧 About to call complete_user_signup RPC function...',
              );
              const { data: profileData, error: profileError } =
                await supabaseClient.rpc('complete_user_signup', {
                  user_id: data.user.id,
                  user_email: values.email,
                  user_in_game_name: values.inGameName,
                  user_empire: selectedPlayerData.empireName || null, // null for independent players
                  user_bitjita_user_id: selectedPlayerData.entityId || null,
                  user_bitjita_empire_id: selectedPlayerData.empireId || null, // null for independent players
                });
              console.log('🔧 RPC call completed. Result:', {
                profileData,
                profileError,
              });

              if (profileError) {
                console.error('❌ Error completing profile:', profileError);
                console.error('❌ Profile error details:', {
                  message: profileError.message,
                  details: profileError.details,
                  hint: profileError.hint,
                  code: profileError.code,
                });
                // Don't show this error to user since signup was successful
                // This is just a fallback mechanism
              } else if (profileData) {
                if (profileData.success) {
                  console.log(
                    '✅ Profile completion successful:',
                    profileData.message,
                  );
                  settlementPopulationService.onUserSignup();
                } else {
                  console.error(
                    '❌ Profile completion failed:',
                    profileData.error,
                  );
                  // Log additional details if available
                  if (profileData.error_detail) {
                    console.error('❌ SQL State:', profileData.error_detail);
                  }
                }
              } else {
                console.error(
                  '❌ No profile data returned from complete_user_signup',
                );
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

  const handlePlayerSelect = useCallback(
    (
      entityId: string | null,
      playerName: string | null,
      empireName: string | null,
      empireId: string | null,
    ) => {
      setSelectedPlayerData({
        entityId,
        playerName,
        empireName,
        empireId,
      });

      if (playerName) {
        form.setFieldValue('inGameName', playerName);
      }
      console.log('🔧 Player selected:', selectedPlayerData);
    },
    [form],
  );
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
              <PlayerSearchSelect
                label="In-Game Username"
                placeholder="Search for your in-game username..."
                onChange={handlePlayerSelect}
                onValidationResult={setUsernameValidationResult}
                required
                validateUsername={true}
              />
              <TextInput
                label="In Game Name"
                placeholder="Select your in-game username from search above"
                required
                mt="md"
                disabled={true}
                description={
                  selectedPlayerData.playerName
                    ? `Selected: ${selectedPlayerData.playerName}${selectedPlayerData.empireName ? ` (Empire: ${selectedPlayerData.empireName})` : ' (No Empire - Independent Player)'}`
                    : 'You must select your username from the search results above'
                }
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
                disabled={
                  isLoading ||
                  !selectedPlayerData.entityId ||
                  !selectedPlayerData.playerName ||
                  (usernameValidationResult !== null &&
                    !usernameValidationResult.available)
                }
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
