import { useState, useCallback } from 'react';
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
  Loader,
  Stack,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCheck, IconMail } from '@tabler/icons-react';
import { supabaseClient } from '../supabase/supabaseClient';
import { useUser } from '../supabase/loader';
import { Navigate, Link } from 'react-router-dom';
import { PlayerSearchSelect } from '../components/PlayerSearchSelect';
import { CharacterVerificationStep } from '../components/CharacterVerificationStep';

type SignupStep = 'form' | 'verification' | 'creating_account' | 'success';

export function Signup() {
  const [signupStep, setSignupStep] = useState<SignupStep>('form');
  const [signupError, setSignupError] = useState<string | null>(null);
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
  });

  // Redirect if logged in
  const { user } = useUser();
  if (user) {
    return <Navigate to="/" />;
  }

  const handleFormSubmit = async (values: typeof form.values) => {
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
        'Email availability check failed, proceeding:',
        emailCheckErr,
      );
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

    // Move to verification step (don't create account yet)
    setSignupStep('verification');
  };

  const handleVerificationComplete = useCallback(
    async (sessionToken: string, bitjitaEntityId: string) => {
      // Now create the account
      setSignupStep('creating_account');
      setIsLoading(true);

      try {
        const values = form.values;

        const { data, error } = await supabaseClient.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: {
              in_game_name: selectedPlayerData.playerName,
              empire: selectedPlayerData.empireName || null,
              bitjita_empire_id: selectedPlayerData.empireId,
            },
          },
        });

        if (error) {
          console.error('Signup error details:', error);
          if (error.message?.includes('Database error saving new user')) {
            setSignupError(
              'There was an issue creating your account. Please try again or contact support.',
            );
          } else if (error.message?.includes('User already registered')) {
            setSignupError(
              'An account with this email already exists. Please try signing in instead.',
            );
          } else {
            setSignupError(error.message);
          }
          setSignupStep('form');
          return;
        }

        if (data.user) {
          // Link verification to user and complete profile
          setTimeout(async () => {
            try {
              if (data.user?.id) {
                // Link the verification session to the new user
                const { error: linkError } = await supabaseClient.rpc(
                  'link_verification_to_user',
                  {
                    p_session_token: sessionToken,
                    p_user_id: data.user.id,
                  },
                );

                if (linkError) {
                  console.error('Error linking verification:', linkError);
                }

                // Also call complete_user_signup as backup
                const { data: profileData, error: profileError } =
                  await supabaseClient.rpc('complete_user_signup', {
                    user_id: data.user.id,
                    user_email: values.email,
                    user_in_game_name: selectedPlayerData.playerName,
                    user_empire: selectedPlayerData.empireName || null,
                    user_bitjita_user_id: bitjitaEntityId,
                    user_bitjita_empire_id: selectedPlayerData.empireId || null,
                  });

                if (profileError) {
                  console.error('Error completing profile:', profileError);
                } else if (profileData?.success) {
                  console.log('Profile completion successful');
                }
              }
            } catch (err) {
              console.error('Error in post-signup:', err);
            }
          }, 1000);

          setSignupStep('success');
        }
      } catch (err) {
        console.error('Signup error:', err);
        setSignupError('An unexpected error occurred. Please try again.');
        setSignupStep('form');
      } finally {
        setIsLoading(false);
      }
    },
    [form.values, selectedPlayerData],
  );

  const handleVerificationCancel = useCallback(() => {
    setSignupStep('form');
    setSignupError(null);
  }, []);

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
    },
    [form],
  );

  // Creating account step
  if (signupStep === 'creating_account') {
    return (
      <Box h="100vh" w="100vw">
        <Center h="100vh" w="100%">
          <Container size={620} miw={440}>
            <Paper withBorder shadow="md" p={30} radius="md">
              <Stack align="center" gap="md">
                <Loader size="lg" />
                <Title order={3}>Creating Your Account</Title>
                <Text c="dimmed">
                  Please wait while we set up your account...
                </Text>
              </Stack>
            </Paper>
          </Container>
        </Center>
      </Box>
    );
  }

  // Verification step
  if (signupStep === 'verification') {
    return (
      <Box h="100vh" w="100vw">
        <Center h="100vh" w="100%">
          <Container size={620} miw={440}>
            <CharacterVerificationStep
              expectedUsername={selectedPlayerData.playerName || ''}
              bitjitaEntityId={selectedPlayerData.entityId || ''}
              onVerified={handleVerificationComplete}
              onCancel={handleVerificationCancel}
            />
          </Container>
        </Center>
      </Box>
    );
  }

  // Success step
  if (signupStep === 'success') {
    return (
      <Box h="100vh" w="100vw">
        <Center h="100vh" w="100%">
          <Container size={620} miw={440}>
            <Alert
              icon={<IconCheck size="1rem" />}
              title="Account Created Successfully!"
              color="green"
              radius="md"
            >
              <Text>
                Your character <strong>{selectedPlayerData.playerName}</strong>{' '}
                has been verified and your account is ready.
              </Text>
              <Text mt="md">
                Please check your email for a verification link, then{' '}
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

  // Form step (default)
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
            <form onSubmit={form.onSubmit(handleFormSubmit)}>
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
                Continue to Verification
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
