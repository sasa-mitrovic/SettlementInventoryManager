import { useState, useEffect } from 'react';
import { Alert, Button, Group, Text } from '@mantine/core';
import { IconUserCheck, IconLogout } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export function ImpersonationBanner() {
  const [isImpersonating, setIsImpersonating] = useState(
    () => localStorage.getItem('impersonation_active') === 'true',
  );

  useEffect(() => {
    const checkImpersonationStatus = () => {
      setIsImpersonating(
        localStorage.getItem('impersonation_active') === 'true',
      );
    };

    // Listen for custom events and storage events
    window.addEventListener('impersonation-changed', checkImpersonationStatus);
    window.addEventListener('storage', checkImpersonationStatus);

    return () => {
      window.removeEventListener(
        'impersonation-changed',
        checkImpersonationStatus,
      );
      window.removeEventListener('storage', checkImpersonationStatus);
    };
  }, []);

  if (!isImpersonating) return null;

  const stopImpersonation = async () => {
    try {
      // Clear impersonation data
      localStorage.removeItem('impersonation_active');
      localStorage.removeItem('impersonation_target_user');
      localStorage.removeItem('impersonation_original_admin');

      // Trigger custom event
      window.dispatchEvent(
        new CustomEvent('impersonation-changed', {
          detail: { active: false },
        }),
      );

      notifications.show({
        title: 'Impersonation Ended',
        message: 'You have returned to your admin account',
        color: 'green',
      });

      // Reload to refresh contexts
      window.location.reload();
    } catch (error) {
      console.error('Error stopping impersonation:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to stop impersonation',
        color: 'red',
      });
    }
  };

  return (
    <Alert
      color="blue"
      title="Impersonation Active"
      icon={<IconUserCheck size={18} />}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        margin: 0,
        borderRadius: 0,
      }}
      withCloseButton={false}
    >
      <Group justify="space-between">
        <Text size="sm">
          You are currently viewing the application as another user.
        </Text>
        <Button
          size="xs"
          variant="white"
          color="blue"
          leftSection={<IconLogout size={14} />}
          onClick={stopImpersonation}
        >
          Stop Impersonation
        </Button>
      </Group>
    </Alert>
  );
}
