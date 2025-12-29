import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/lib/store';

// Hook pour sélectionner une image depuis la galerie
export const usePickImage = () => {
  return useMutation({
    mutationFn: async () => {
      // Demander les permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission d\'accès à la galerie requise');
      }

      // Ouvrir le sélecteur d'images
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) {
        throw new Error('Sélection annulée');
      }

      return result.assets[0];
    },
  });
};

// Hook pour uploader l'avatar utilisateur
export const useUploadAvatar = () => {
  const queryClient = useQueryClient();
  const { user, setProfile } = useAuthStore();

  return useMutation({
    mutationFn: async (imageUri: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Upload via API
      const data = await api.uploadFile<{ url: string }>('/users/me/avatar', imageUri, 'avatar');

      return { avatar_url: data.url };
    },
    onSuccess: (data) => {
      if (data && user) {
        setProfile({ ...user, avatar_url: data.avatar_url } as any);
        queryClient.invalidateQueries({ queryKey: queryKeys.profile(user.id) });
      }
    },
  });
};

// Hook pour uploader la photo d'équipe
export const useUploadTeamPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, imageUri }: { teamId: string; imageUri: string }) => {
      // Upload via API
      const data = await api.uploadFile<{ url: string; teamId: string }>(
        `/teams/${teamId}/photo`,
        imageUri,
        'photo'
      );

      return { id: data.teamId, photo_url: data.url };
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: queryKeys.team(data.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.teams });
      }
    },
  });
};

// Hook combiné pour sélectionner et uploader un avatar
export const useSelectAndUploadAvatar = () => {
  const pickImage = usePickImage();
  const uploadAvatar = useUploadAvatar();

  return useMutation({
    mutationFn: async () => {
      const image = await pickImage.mutateAsync();
      const result = await uploadAvatar.mutateAsync(image.uri);
      return result;
    },
  });
};

// Hook combiné pour sélectionner et uploader une photo d'équipe
export const useSelectAndUploadTeamPhoto = () => {
  const pickImage = usePickImage();
  const uploadTeamPhoto = useUploadTeamPhoto();

  return useMutation({
    mutationFn: async (teamId: string) => {
      const image = await pickImage.mutateAsync();
      const result = await uploadTeamPhoto.mutateAsync({ teamId, imageUri: image.uri });
      return result;
    },
  });
};
