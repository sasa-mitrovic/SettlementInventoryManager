import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { mantineModals } from './mantine/modals/modals.tsx';
import { mantineTheme } from './mantine/theme.ts';
import { router } from './router/router.tsx';
import { PermissionProvider } from './supabase/optimizedRoleHooks.tsx';
import { AuthProvider } from './components/AuthProvider.tsx';
import { discordPollingService } from './services/discordPollingService.ts';
import { settlementPopulationService } from './services/settlementPopulationService.ts';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/spotlight/styles.css';
import { CustomSpotlight } from './mantine/spotlight.tsx';

// Start the Discord polling service instead of realtime service
discordPollingService.start();
settlementPopulationService.start();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <MantineProvider theme={mantineTheme} defaultColorScheme="auto">
    <Notifications />
    <CustomSpotlight />
    <AuthProvider>
      <ModalsProvider modals={mantineModals}>
        <PermissionProvider>
          <RouterProvider router={router} />
        </PermissionProvider>
      </ModalsProvider>
    </AuthProvider>
  </MantineProvider>,
);
