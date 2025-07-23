import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { mantineModals } from './mantine/modals/modals.tsx';
import { mantineTheme } from './mantine/theme.ts';
import { router } from './router/router.tsx';
import { PermissionProvider } from './supabase/optimizedRoleHooks.tsx';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/spotlight/styles.css';
import { CustomSpotlight } from './mantine/spotlight.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={mantineTheme} defaultColorScheme="auto">
      <Notifications />
      <CustomSpotlight />
      <ModalsProvider modals={mantineModals}>
        <PermissionProvider>
          <RouterProvider router={router} />
        </PermissionProvider>
      </ModalsProvider>
    </MantineProvider>
  </React.StrictMode>,
);
