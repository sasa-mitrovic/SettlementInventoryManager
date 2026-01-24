import { useState } from 'react';
import {
  Modal,
  Stack,
  Text,
  PasswordInput,
  Button,
  Group,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconLock } from '@tabler/icons-react';
import { supabaseClient } from '../supabase/supabaseClient';

interface ChangePasswordModalProps {
  opened: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ opened, onClose }: ChangePasswordModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      newPassword: '',
      confirmPassword: '',
    },
    validate: {
      newPassword: (value) =>
        value.length < 8 ? 'Password must be at least 8 characters' : null,
      confirmPassword: (value, values) =>
        value !== values.newPassword ? 'Passwords do not match' : null,
    },
  });

  const handleClose = () => {
    form.reset();
    setError(null);
    onClose();
  };

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabaseClient.auth.updateUser({
        password: values.newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      notifications.show({
        title: 'Password Updated',
        message: 'Your password has been successfully changed.',
        color: 'green',
      });

      handleClose();
    } catch (err) {
      console.error('Error changing password:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <IconLock size={24} />
          <Text fw={600}>Change Password</Text>
        </Group>
      }
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Enter your new password below. Make sure it's at least 8 characters long.
          </Text>

          <PasswordInput
            label="New Password"
            placeholder="Enter new password"
            required
            {...form.getInputProps('newPassword')}
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm new password"
            required
            {...form.getInputProps('confirmPassword')}
          />

          {error && (
            <Alert color="red">
              {error}
            </Alert>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Update Password
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
