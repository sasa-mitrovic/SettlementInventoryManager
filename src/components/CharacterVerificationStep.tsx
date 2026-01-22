import { useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Text,
  Title,
  Alert,
  Group,
  Stack,
  CopyButton,
  ActionIcon,
  Tooltip,
  Progress,
  Code,
  Loader,
  ThemeIcon,
} from '@mantine/core';
import {
  IconCheck,
  IconCopy,
  IconRefresh,
  IconAlertTriangle,
  IconX,
  IconPlayerPlay,
  IconMessageCircle,
} from '@tabler/icons-react';
import { useCharacterVerification } from '../hooks/useCharacterVerification';

interface CharacterVerificationStepProps {
  expectedUsername: string;
  bitjitaEntityId: string;
  onVerified: (sessionToken: string, bitjitaEntityId: string) => void;
  onCancel: () => void;
}

export function CharacterVerificationStep({
  expectedUsername,
  bitjitaEntityId,
  onVerified,
  onCancel,
}: CharacterVerificationStepProps) {
  const {
    state,
    startVerification,
    cancelVerification,
    retryPolling,
    retryVerification,
    timeRemaining,
  } = useCharacterVerification();

  // Start verification on mount
  useEffect(() => {
    startVerification(expectedUsername, bitjitaEntityId);
  }, [expectedUsername, bitjitaEntityId, startVerification]);

  // Call onVerified when verification succeeds
  useEffect(() => {
    if (state.status === 'verified' && state.sessionToken && state.bitjitaEntityId) {
      // Capture values to avoid TypeScript narrowing issues in setTimeout
      const sessionToken = state.sessionToken;
      const bitjitaEntityId = state.bitjitaEntityId;
      const timer = setTimeout(() => {
        onVerified(sessionToken, bitjitaEntityId);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.status, state.sessionToken, state.bitjitaEntityId, onVerified]);

  const handleCancel = async () => {
    await cancelVerification();
    onCancel();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressValue = (): number => {
    // 5 minutes = 300 seconds
    return (timeRemaining / 300) * 100;
  };

  const renderCodeDisplay = () => (
    <Box ta="center">
      <Text size="sm" c="dimmed" mb="xs">
        Your verification code:
      </Text>
      <Group justify="center" gap="xs">
        <Code
          style={{
            fontSize: '2.5rem',
            padding: '1rem 2rem',
            letterSpacing: '0.5rem',
            fontWeight: 700,
          }}
        >
          {state.code}
        </Code>
        <CopyButton value={state.code || ''} timeout={2000}>
          {({ copied, copy }) => (
            <Tooltip
              label={copied ? 'Copied!' : 'Copy code'}
              withArrow
              position="right"
            >
              <ActionIcon
                color={copied ? 'teal' : 'gray'}
                variant="subtle"
                size="xl"
                onClick={copy}
              >
                {copied ? <IconCheck size={24} /> : <IconCopy size={24} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      </Group>
    </Box>
  );

  const renderStatusContent = () => {
    switch (state.status) {
      case 'pending':
        return (
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text>Generating verification code...</Text>
          </Stack>
        );

      case 'polling':
        return (
          <Stack gap="lg">
            {renderCodeDisplay()}

            <Alert
              icon={<IconMessageCircle size={16} />}
              title="Paste this code in Bitcraft global chat"
              color="blue"
            >
              <Text size="sm">
                Log into Bitcraft as <strong>{expectedUsername}</strong> and
                paste the code above into the global chat. We'll automatically
                detect it.
              </Text>
            </Alert>

            <Box>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Code expires in
                </Text>
                <Text size="sm" fw={500}>
                  {formatTime(timeRemaining)}
                </Text>
              </Group>
              <Progress
                value={getProgressValue()}
                color={timeRemaining < 60 ? 'orange' : 'blue'}
                size="sm"
                animated
              />
            </Box>

            <Group justify="center" align="center" gap="sm">
              <Loader size="sm" type="oval" />
              <Text size="sm" c="dimmed">
                Waiting for your code in chat...
              </Text>
            </Group>
          </Stack>
        );

      case 'polling_stopped':
        return (
          <Stack gap="lg">
            {renderCodeDisplay()}

            <Alert
              icon={<IconMessageCircle size={16} />}
              title="Paste this code in Bitcraft global chat"
              color="blue"
            >
              <Text size="sm">
                Log into Bitcraft as <strong>{expectedUsername}</strong> and
                paste the code above into the global chat.
              </Text>
            </Alert>

            <Box>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Code expires in
                </Text>
                <Text size="sm" fw={500}>
                  {formatTime(timeRemaining)}
                </Text>
              </Group>
              <Progress
                value={getProgressValue()}
                color={timeRemaining < 60 ? 'orange' : 'blue'}
                size="sm"
              />
            </Box>

            <Alert color="yellow" variant="light" title="Polling paused">
              <Text size="sm">
                We stopped checking for your code. Click the button below to
                resume checking once you've posted the code in chat.
              </Text>
            </Alert>

            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={retryPolling}
              variant="light"
            >
              Resume Checking
            </Button>
          </Stack>
        );

      case 'verified':
        return (
          <Stack align="center" gap="md">
            <ThemeIcon size={80} radius="xl" color="green">
              <IconCheck size={48} />
            </ThemeIcon>
            <Title order={3} c="green">
              Character Verified!
            </Title>
            <Text c="dimmed">
              Welcome, <strong>{state.foundUsername || expectedUsername}</strong>
              ! Your account is now ready.
            </Text>
          </Stack>
        );

      case 'expired':
        return (
          <Stack align="center" gap="md">
            <ThemeIcon size={80} radius="xl" color="orange">
              <IconAlertTriangle size={48} />
            </ThemeIcon>
            <Title order={3}>Code Expired</Title>
            <Text c="dimmed" ta="center">
              The verification code has expired. Please generate a new one.
            </Text>
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={retryVerification}
            >
              Generate New Code
            </Button>
          </Stack>
        );

      case 'username_mismatch':
        return (
          <Stack gap="lg">
            {renderCodeDisplay()}

            <Alert color="yellow" title="Wrong Character" icon={<IconAlertTriangle size={16} />}>
              <Text size="sm">
                The code was posted by <strong>{state.foundUsername}</strong>{' '}
                instead of <strong>{expectedUsername}</strong>. Please post the
                code from the correct character.
              </Text>
            </Alert>

            <Box>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Code expires in
                </Text>
                <Text size="sm" fw={500}>
                  {formatTime(timeRemaining)}
                </Text>
              </Group>
              <Progress
                value={getProgressValue()}
                color="orange"
                size="sm"
                animated
              />
            </Box>

            <Group justify="center" align="center" gap="sm">
              <Loader size="sm" type="oval" />
              <Text size="sm" c="dimmed">
                Still waiting for the correct character...
              </Text>
            </Group>
          </Stack>
        );

      case 'failed':
        return (
          <Stack align="center" gap="md">
            <ThemeIcon size={80} radius="xl" color="red">
              <IconX size={48} />
            </ThemeIcon>
            <Title order={3}>Verification Failed</Title>
            <Text c="dimmed" ta="center">
              {state.error || 'An error occurred during verification.'}
            </Text>
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={retryVerification}
            >
              Try Again
            </Button>
          </Stack>
        );

      default:
        return (
          <Stack align="center" gap="md">
            <IconPlayerPlay size={48} />
            <Text>Ready to start verification</Text>
            <Button
              onClick={() =>
                startVerification(expectedUsername, bitjitaEntityId)
              }
            >
              Start Verification
            </Button>
          </Stack>
        );
    }
  };

  const canCancel = [
    'pending',
    'polling',
    'polling_stopped',
    'username_mismatch',
  ].includes(state.status);

  return (
    <Paper withBorder shadow="md" p={30} radius="md">
      <Stack gap="xl">
        <Box ta="center">
          <Title order={2} mb="xs">
            Verify Your Character
          </Title>
          <Text c="dimmed">
            Prove you own <strong>{expectedUsername}</strong> by posting a code
            in Bitcraft chat
          </Text>
        </Box>

        {renderStatusContent()}

        {canCancel && (
          <Button
            variant="subtle"
            color="gray"
            onClick={handleCancel}
            fullWidth
          >
            Cancel and Go Back
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
