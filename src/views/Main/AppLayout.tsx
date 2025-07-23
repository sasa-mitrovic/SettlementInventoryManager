import { Box, Group, Stack, Title } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { DarkModeToggle } from '../../components/DarkModeToggle';

export const AppLayout = () => {
  return (
    <Stack>
      <Group justify="flex-end" p="md">
        <DarkModeToggle />
      </Group>
      <Box flex={1}>
        <Outlet />
      </Box>
    </Stack>
  );
};
