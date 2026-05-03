import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import theme from '../src/lib/theme';
import { QueryClientProvider, queryClient } from '../src/providers/trpc';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </PaperProvider>
    </QueryClientProvider>
  );
}
