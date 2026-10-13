import {lazy, Suspense} from 'react';
import {createHashRouter, Outlet, RouterProvider} from 'react-router-dom';
import {Toaster} from './components/ui';
import {AppShell} from './layout/AppShell';
import {Calendar} from './pages/Calendar';
import {ClientDetail, Clients} from './pages/Clients';
import {Dashboard} from './pages/Dashboard';
import {DocumentView} from './pages/docs/DocumentView';
import {DriverJob} from './pages/driver/DriverJob';
import {DriverToday} from './pages/driver/DriverToday';
import {Equipment} from './pages/Equipment';
import {Invoices} from './pages/Invoices';
import {JobDetail} from './pages/JobDetail';
import {Jobs} from './pages/Jobs';
import {NotFound} from './pages/NotFound';
import {QuoteBuilder} from './pages/QuoteBuilder';
import {Quotes} from './pages/Quotes';
import {SettingsPage} from './pages/Settings';

// Reports pulls in the charting library, so it loads on first visit.
const Reports = lazy(() => import('./pages/Reports').then((m) => ({default: m.Reports})));

// Hash routing: works on any static host (GitHub Pages included) with no rewrites.
const router = createHashRouter([
  {
    element: (
      <AppShell>
        <Outlet />
      </AppShell>
    ),
    children: [
      {path: '/', element: <Dashboard />},
      {path: '/quotes', element: <Quotes />},
      {path: '/quotes/new', element: <QuoteBuilder />},
      {path: '/jobs', element: <Jobs />},
      {path: '/jobs/:id', element: <JobDetail />},
      {path: '/jobs/:id/edit', element: <QuoteBuilder />},
      {path: '/calendar', element: <Calendar />},
      {path: '/clients', element: <Clients />},
      {path: '/clients/:id', element: <ClientDetail />},
      {path: '/equipment', element: <Equipment />},
      {path: '/invoices', element: <Invoices />},
      {path: '/reports', element: <Suspense fallback={<p className="text-muted">Loading reports…</p>}><Reports /></Suspense>},
      {path: '/settings', element: <SettingsPage />},
      {path: '*', element: <NotFound />},
    ],
  },
  {path: '/doc/:kind/:id', element: <DocumentView />},
  {path: '/driver', element: <DriverToday />},
  {path: '/driver/:id', element: <DriverJob />},
]);

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
