import { createBrowserRouter } from 'react-router-dom';
import { ProtectedPath } from '../components/ProtectedPath';
import { Authentication } from '../views/Auth';
import { Signup } from '../views/Signup';
import { PermissionsDemo } from '../views/PermissionsDemo';
import { AuthDebugView } from '../views/AuthDebugView';
import { DiscordSetupPage } from '../views/DiscordSetupPage';
import App from '../views/Main/App';
import { AppLayout } from '../views/Main/AppLayout';
import { Dashboard } from '../views/Dashboard';
import { Members } from '../views/Members';
import { Inventory } from '../views/Inventory';
import { Settings } from '../views/Settings';
import { CraftingOrders } from '../views/CraftingOrders';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedPath redirectUrl="/auth">
        <AppLayout />
      </ProtectedPath>
    ),
    children: [
      {
        path: '/',
        element: <Dashboard />,
      },
      {
        path: '/members',
        element: <Members />,
      },
      {
        path: '/inventory',
        element: <Inventory />,
      },
      {
        path: '/crafting-orders',
        element: <CraftingOrders />,
      },
      {
        path: '/settings',
        element: <Settings />,
      },
      {
        path: '/app',
        element: <App />,
      },
      {
        path: '/permissions-demo',
        element: <PermissionsDemo />,
      },
      {
        path: '/auth-debug',
        element: <AuthDebugView />,
      },
      {
        path: '/discord-setup',
        element: <DiscordSetupPage />,
      },
    ],
  },

  {
    path: '/auth',
    element: <Authentication />,
  },

  {
    path: '/signup',
    element: <Signup />,
  },
]);
