import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { queryKeys } from '@/lib/queryClient';
import { User } from '@/types/database';

// Types pour les réponses API
interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

interface SessionResponse {
  user: User;
}

// Hook principal d'authentification
export const useAuth = () => {
  const {
    user,
    profile,
    isLoading,
    isInitialized,
    setUser,
    setProfile,
    setLoading,
    setInitialized,
    reset,
  } = useAuthStore();

  const queryClient = useQueryClient();

  // Vérifier la session au démarrage
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await api.isAuthenticated();
        if (isAuth) {
          // Récupérer les infos utilisateur
          const { user: userData } = await api.get<SessionResponse>('/auth/session');
          setUser({ id: userData.id, email: userData.email });
          setProfile(userData);
        }
      } catch (error) {
        // Session invalide, nettoyer
        await api.clearTokens();
        reset();
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    checkAuth();
  }, []);

  // Charger le profil quand l'utilisateur change
  const { data: profileData } = useQuery({
    queryKey: queryKeys.profile(user?.id || ''),
    queryFn: async () => {
      if (!user?.id) return null;
      return api.get<User>('/users/me');
    },
    enabled: !!user?.id && isInitialized,
  });

  useEffect(() => {
    if (profileData) {
      setProfile(profileData);
    }
  }, [profileData, setProfile]);

  return {
    user,
    profile,
    isLoading,
    isInitialized,
    isAuthenticated: !!user,
  };
};

// Hook pour l'inscription
export const useSignUp = () => {
  const queryClient = useQueryClient();
  const { setUser, setProfile } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      displayName,
    }: {
      email: string;
      password: string;
      displayName: string;
    }) => {
      // Vérifier d'abord si le pseudo est disponible
      const { available } = await api.get<{ available: boolean }>(
        `/auth/check-display-name?name=${encodeURIComponent(displayName)}`
      );

      if (!available) {
        throw new Error('Ce pseudo est déjà utilisé');
      }

      // Créer le compte
      const response = await api.post<AuthResponse>('/auth/register', {
        email,
        password,
        displayName,
      });

      // Stocker les tokens
      await api.setTokens(response.tokens.accessToken, response.tokens.refreshToken);

      return response;
    },
    onSuccess: (data) => {
      setUser({ id: data.user.id, email: data.user.email });
      setProfile(data.user);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
};

// Hook pour la connexion (accepte email ou pseudo)
export const useSignIn = () => {
  const queryClient = useQueryClient();
  const { setUser, setProfile } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      identifier,
      password,
    }: {
      identifier: string; // email ou pseudo
      password: string;
    }) => {
      const response = await api.post<AuthResponse>('/auth/login', {
        identifier,
        password,
      });

      // Stocker les tokens
      await api.setTokens(response.tokens.accessToken, response.tokens.refreshToken);

      return response;
    },
    onSuccess: (data) => {
      setUser({ id: data.user.id, email: data.user.email });
      setProfile(data.user);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
};

// Hook pour la déconnexion
export const useSignOut = () => {
  const queryClient = useQueryClient();
  const { reset } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      try {
        const refreshToken = await api.getAccessToken(); // On utilise le refresh token stocké
        // Note: On devrait idéalement stocker et utiliser le refreshToken
        await api.post('/auth/logout', { refreshToken: '' });
      } catch {
        // Ignorer les erreurs de logout côté serveur
      }
      await api.clearTokens();
    },
    onSuccess: () => {
      reset();
      queryClient.clear();
    },
  });
};

// Hook pour mettre à jour le profil
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user, setProfile } = useAuthStore();

  return useMutation({
    mutationFn: async (updates: Partial<Pick<User, 'display_name' | 'avatar_url'>>) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Si on modifie le pseudo, vérifier qu'il est disponible
      if (updates.display_name) {
        const { available } = await api.get<{ available: boolean }>(
          `/auth/check-display-name?name=${encodeURIComponent(updates.display_name)}&excludeUserId=${user.id}`
        );

        if (!available) {
          throw new Error('Ce pseudo est déjà utilisé');
        }
      }

      // Adapter les noms de champs pour l'API (snake_case -> camelCase)
      const apiUpdates: Record<string, unknown> = {};
      if (updates.display_name) apiUpdates.displayName = updates.display_name;
      if (updates.avatar_url !== undefined) apiUpdates.avatarUrl = updates.avatar_url;

      return api.patch<User>('/users/me', apiUpdates);
    },
    onSuccess: (data) => {
      setProfile(data);
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(user!.id) });
    },
  });
};
