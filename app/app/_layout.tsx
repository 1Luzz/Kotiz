import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/theme';
import { LoadingScreen, ToastProvider } from '@/components/ui';

function RootLayoutNav() {
  const { isLoading, isInitialized } = useAuth();

  if (!isInitialized || isLoading) {
    return <LoadingScreen message="Chargement..." />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.background,
          },
          headerTintColor: Colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: Colors.background,
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="team/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Équipe',
            headerBackTitle: 'Retour',
          }}
        />
        <Stack.Screen
          name="add-fine"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Nouvelle amende',
          }}
        />
        <Stack.Screen
          name="join-team"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Rejoindre une équipe',
          }}
        />
        <Stack.Screen
          name="create-team"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Créer une équipe',
          }}
        />
        <Stack.Screen
          name="add-rule"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Nouvelle règle',
          }}
        />
        <Stack.Screen
          name="rules"
          options={{
            headerShown: true,
            headerTitle: 'Règles',
            headerBackTitle: 'Retour',
          }}
        />
        <Stack.Screen
          name="fines"
          options={{
            headerShown: true,
            headerTitle: 'Amendes',
            headerBackTitle: 'Retour',
          }}
        />
        <Stack.Screen
          name="members"
          options={{
            headerShown: true,
            headerTitle: 'Membres',
            headerBackTitle: 'Retour',
          }}
        />
        <Stack.Screen
          name="record-payment"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Enregistrer un paiement',
          }}
        />
        <Stack.Screen
          name="team-settings"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Parametres',
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: true,
            headerTitle: 'Notifications',
            headerBackTitle: 'Retour',
          }}
        />
        <Stack.Screen
          name="notification-settings"
          options={{
            headerShown: true,
            headerTitle: 'Notifications',
            headerBackTitle: 'Retour',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RootLayoutNav />
        </ToastProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
