import { Box, Group, Stack } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { DarkModeToggle } from '../../components/DarkModeToggle';
import { ImpersonationBanner } from '../../components/ImpersonationBanner';

export const AppLayout = () => {
  return (
    <Stack gap={0}>
      <ImpersonationBanner />
      <Group justify="flex-end" p="md">
        <DarkModeToggle />
      </Group>
      <Box flex={1}>
        <Outlet />
      </Box>
    </Stack>
  );
};
