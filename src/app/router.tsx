import { createBrowserRouter } from 'react-router';
import { RootErrorBoundary } from '@/components/common/root-error-boundary';
import { RootLayout } from '@/components/layout/root-layout';

/**
 * Route table. Pages are code-split with `lazy`; add a route here when you add a page.
 * Pages live in `src/pages/<name>/index.tsx` and compose features from `src/features/`.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RootErrorBoundary,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('@/pages/home')).HomePage }),
      },
      // Dev-only style guide for the design system; tree-shaken out of production builds.
      ...(import.meta.env.DEV
        ? [
            {
              path: 'design-system',
              lazy: async () => ({
                Component: (await import('@/pages/design-system')).DesignSystemPage,
              }),
            },
          ]
        : []),
      {
        path: '*',
        lazy: async () => ({ Component: (await import('@/pages/not-found')).NotFoundPage }),
      },
    ],
  },
]);
