import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { ActivityLogWithDetails } from '@/types/database';

// Transform API response (camelCase) to frontend format (snake_case)
const transformActivity = (activity: any): ActivityLogWithDetails => ({
  id: activity.id,
  team_id: activity.teamId,
  user_id: activity.userId,
  target_user_id: activity.targetUserId,
  activity_type: activity.activityType,
  metadata: activity.metadata,
  created_at: activity.createdAt,
  actor_name: activity.user?.displayName || null,
  actor_avatar: activity.user?.avatarUrl || null,
  target_name: activity.targetUser?.displayName || null,
  target_avatar: activity.targetUser?.avatarUrl || null,
});

// Hook pour l'activité d'une équipe
export const useActivity = (teamId: string, limit = 50) => {
  return useQuery({
    queryKey: queryKeys.activity(teamId),
    queryFn: async () => {
      const data = await api.get<any[]>(`/teams/${teamId}/activity?limit=${limit}`);
      return data.map(transformActivity);
    },
    enabled: !!teamId,
  });
};

// Helper pour formater le message d'activité
export const formatActivityMessage = (activity: ActivityLogWithDetails): string => {
  const actorName = activity.actor_name || 'Quelqu\'un';
  const targetName = activity.target_name || 'un membre';
  const metadata = activity.metadata as Record<string, unknown>;

  switch (activity.activity_type) {
    case 'team_created':
      return `${actorName} a créé l'équipe`;

    case 'member_joined':
      return `${actorName} a rejoint l'équipe`;

    case 'member_left':
      return `${actorName} a quitté l'équipe`;

    case 'rule_created':
      return `${actorName} a créé une règle`;

    case 'rule_updated':
      return `${actorName} a modifié une règle`;

    case 'fine_issued':
      const fineAmount = metadata.amount ? `${metadata.amount}€` : '';
      const fineLabel = metadata.label || 'Amende';
      return `${actorName} a mis une amende à ${targetName}: ${fineLabel} (${fineAmount})`;

    case 'fine_updated':
      return `${actorName} a modifié une amende de ${targetName}`;

    case 'payment_recorded':
      const paymentAmount = metadata.amount ? `${metadata.amount}€` : '';
      const paymentMethod = metadata.method ? ` (${metadata.method})` : '';
      return `${actorName} a enregistré un paiement de ${targetName}: ${paymentAmount}${paymentMethod}`;

    default:
      return `${actorName} a effectué une action`;
  }
};
