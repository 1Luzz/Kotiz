import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { FineDispute, FineDisputeWithDetails, FineDisputeVote, DisputeStatus } from '@/types/database';

// Transform API response (camelCase) to frontend format (snake_case)
const transformDispute = (dispute: any): FineDispute => ({
  id: dispute.id,
  fine_id: dispute.fineId,
  team_id: dispute.teamId,
  disputed_by: dispute.disputerId,
  reason: dispute.reason,
  status: dispute.status,
  resolved_at: dispute.resolvedAt,
  resolved_by: dispute.resolvedBy,
  resolution_note: dispute.resolutionNote,
  votes_count: dispute.votesFor ?? 0,
  votes_required: dispute.votesRequired ?? 0,
  created_at: dispute.createdAt,
});

const transformDisputeWithDetails = (dispute: any): FineDisputeWithDetails => ({
  ...transformDispute(dispute),
  fine_amount: dispute.fine?.amount || 0,
  fine_label: dispute.fine?.customLabel || dispute.fine?.rule?.label || null,
  disputed_by_name: dispute.disputer?.displayName || '',
  disputed_by_avatar: dispute.disputer?.avatarUrl || null,
  offender_name: dispute.fine?.offender?.displayName || '',
  offender_avatar: dispute.fine?.offender?.avatarUrl || null,
  resolved_by_name: dispute.resolver?.displayName || null,
  team_dispute_mode: dispute.team?.disputeMode || 'simple',
});

const transformVote = (vote: any): FineDisputeVote & { user: { display_name: string; avatar_url: string | null } } => ({
  id: vote.id,
  dispute_id: vote.disputeId,
  user_id: vote.userId,
  vote: vote.vote,
  created_at: vote.createdAt,
  user: {
    display_name: vote.user?.displayName || '',
    avatar_url: vote.user?.avatarUrl || null,
  },
});

// Hook pour les fine_ids des amendes ayant une contestation active
export const useTeamDisputedFineIds = (teamId: string) => {
  return useQuery({
    queryKey: [...queryKeys.disputes(teamId), 'fineIds'],
    queryFn: async () => {
      const data = await api.get<any[]>(`/teams/${teamId}/disputes`);
      // Retourne un Map avec fine_id -> status
      const map = new Map<string, string>();
      data?.forEach((d) => {
        map.set(d.fineId, d.status);
      });
      return map;
    },
    enabled: !!teamId,
  });
};

// Hook pour les contestations d'une equipe
export const useTeamDisputes = (teamId: string, status?: DisputeStatus) => {
  return useQuery({
    queryKey: [...queryKeys.disputes(teamId), status],
    queryFn: async () => {
      const url = status
        ? `/teams/${teamId}/disputes?status=${status}`
        : `/teams/${teamId}/disputes`;
      const data = await api.get<any[]>(url);
      return data.map(transformDisputeWithDetails);
    },
    enabled: !!teamId,
  });
};

// Hook pour les contestations en attente (pour admins/tresoriers)
export const usePendingDisputes = (teamId: string) => {
  return useTeamDisputes(teamId, 'pending');
};

// Hook pour verifier si une amende a une contestation active
export const useFineDispute = (fineId: string) => {
  return useQuery({
    queryKey: queryKeys.fineDispute(fineId),
    queryFn: async () => {
      try {
        const data = await api.get<any>(`/fines/${fineId}/dispute`);
        return transformDispute(data);
      } catch (error: any) {
        if (error.message?.includes('404') || error.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!fineId,
  });
};

// Hook pour obtenir les details d'une contestation
export const useDispute = (disputeId: string) => {
  return useQuery({
    queryKey: queryKeys.dispute(disputeId),
    queryFn: async () => {
      const data = await api.get<any>(`/disputes/${disputeId}`);
      return transformDisputeWithDetails(data);
    },
    enabled: !!disputeId,
  });
};

// Hook pour les votes d'une contestation
export const useDisputeVotes = (disputeId: string) => {
  return useQuery({
    queryKey: queryKeys.disputeVotes(disputeId),
    queryFn: async () => {
      const data = await api.get<any[]>(`/disputes/${disputeId}/votes`);
      return data.map(transformVote);
    },
    enabled: !!disputeId,
  });
};

// Hook pour verifier si l'utilisateur courant a deja vote
export const useHasVoted = (disputeId: string, userId: string) => {
  return useQuery({
    queryKey: [...queryKeys.disputeVotes(disputeId), 'hasVoted', userId],
    queryFn: async () => {
      const data = await api.get<any>(`/disputes/${disputeId}/my-vote`);
      if (data.voted === false) {
        return null;
      }
      return { id: data.id, vote: data.vote };
    },
    enabled: !!disputeId && !!userId,
  });
};

// Hook pour creer une contestation
export const useCreateDispute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fineId,
      reason,
    }: {
      fineId: string;
      reason: string;
    }) => {
      const data = await api.post<any>(`/fines/${fineId}/dispute`, { reason });
      return data.id as string;
    },
    onSuccess: (disputeId, { fineId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fineDispute(fineId) });
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });
};

// Hook pour voter sur une contestation (mode communautaire)
export const useVoteOnDispute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      disputeId,
      vote,
    }: {
      disputeId: string;
      vote: boolean;
    }) => {
      const data = await api.post<any>(`/disputes/${disputeId}/vote`, { vote });
      return data.id as string;
    },
    onSuccess: (_, { disputeId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dispute(disputeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.disputeVotes(disputeId) });
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });
};

// Hook pour resoudre une contestation (admin/tresorier)
export const useResolveDispute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      disputeId,
      approved,
      note,
    }: {
      disputeId: string;
      approved: boolean;
      note?: string;
    }) => {
      const data = await api.post<any>(`/disputes/${disputeId}/resolve`, {
        approved,
        note,
      });
      return data.success as boolean;
    },
    onSuccess: (_, { disputeId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dispute(disputeId) });
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });
};
