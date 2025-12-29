import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export default function Index() {
  const { isAuthenticated, isLoading, isInitialized } = useAuth();

  if (!isInitialized || isLoading) {
    return <LoadingScreen message="Chargement..." />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
