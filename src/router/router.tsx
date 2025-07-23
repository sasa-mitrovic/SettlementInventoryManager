import { createBrowserRouter } from 'react-router-dom';
import { ProtectedPath } from '../components/ProtectedPath';
import { Authentication } from '../views/Auth';
import { Signup } from '../views/Signup';
import { PermissionsDemo } from '../views/PermissionsDemo';
import App from '../views/Main/App';
import { AppLayout } from '../views/Main/AppLayout';
import { Dashboard } from '../views/Dashboard';
import { Members } from '../views/Members';
import { Inventory } from '../views/Inventory';
import { Settings } from '../views/Settings';

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
