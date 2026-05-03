import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import superjson from 'superjson';
import Constants from 'expo-constants';
import type { AppRouter } from '@api/router';

const queryClient = new QueryClient();

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${Constants.expoConfig?.extra?.serverUrl || 'http://localhost:3000'}/api/trpc`,
      transformer: superjson,
    }),
  ],
});

export { queryClient, QueryClientProvider };
