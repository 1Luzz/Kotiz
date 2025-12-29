import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Team, TeamMemberWithDetails, TeamStats, LeaderboardEntry, TeamRole } from '@/types/database';
import { useAuthStore } from '@/lib/store';

// Types pour les réponses API (camelCase from server)
interface TeamResponse {
  id: string;
  name: string;
  description: string | null;
  sport: string | null;
  photoUrl: string | null;
  inviteCode: string;
  createdById: string;
  allowCustomFines: boolean;
  finePermission: string;
  isClosed: boolean;
  disputeEnabled: boolean;
  disputeMode: string | null;
  disputeVotesRequired: number | null;
  createdAt: string;
  updatedAt: string;
  userRole?: TeamRole;
}

// Helper to convert API response to frontend Team type
function toTeam(t: TeamResponse): Team & { userRole?: TeamRole } {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    sport: t.sport,
    photo_url: t.photoUrl,
    invite_code: t.inviteCode,
    created_by: t.createdById,
    allow_custom_fines: t.allowCustomFines,
    fine_permission: t.finePermission as any,
    is_closed: t.isClosed,
    dispute_enabled: t.disputeEnabled,
    dispute_mode: t.disputeMode as any,
    dispute_votes_required: t.disputeVotesRequired,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
    userRole: t.userRole,
  };
}

interface TeamWithRole extends Team {
  userRole: TeamRole;
}

interface TeamMemberResponse {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  credit: number;
  isDeleted: boolean;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

interface CreateTeamResponse {
  teamId: string;
  team: Team;
}

interface JoinTeamResponse {
  teamId: string;
  team: Team;
}

// Hook pour récupérer les équipes de l'utilisateur
export const useTeams = () => {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.teams,
    queryFn: async () => {
      if (!user?.id) return [];
      const data = await api.get<TeamResponse[]>('/teams');
      return data.map(toTeam) as TeamWithRole[];
    },
    enabled: !!user?.id,
  });
};

// Hook pour récupérer une équipe spécifique
export const useTeam = (teamId: string) => {
  return useQuery({
    queryKey: queryKeys.team(teamId),
    queryFn: async () => {
      const data = await api.get<TeamResponse>(`/teams/${teamId}`);
      return toTeam(data);
    },
    enabled: !!teamId,
  });
};

// Hook pour les membres d'une équipe
export const useTeamMembers = (teamId: string) => {
  return useQuery({
    queryKey: queryKeys.teamMembers(teamId),
    queryFn: async () => {
      const data = await api.get<TeamMemberResponse[]>(`/teams/${teamId}/members`);
      // Transformer en format TeamMemberWithDetails attendu par le frontend
      return data.map((member) => ({
        id: member.id,
        team_id: member.teamId,
        user_id: member.userId,
        role: member.role,
        credit: member.credit,
        is_deleted: member.isDeleted,
        joined_at: member.joinedAt,
        display_name: member.user.displayName,
        avatar_url: member.user.avatarUrl,
        email: member.user.email,
      })) as TeamMemberWithDetails[];
    },
    enabled: !!teamId,
  });
};

// Hook pour les stats d'équipe
export const useTeamStats = (teamId: string) => {
  return useQuery({
    queryKey: queryKeys.teamStats(teamId),
    queryFn: async () => {
      const data = await api.get<{
        totalPot: number;
        totalCollected: number;
        totalPending: number;
        totalExpenses: number;
        availableBalance: number;
        totalFines: number;
        totalMembers: number;
      }>(`/teams/${teamId}/stats`);

      // Transformer en format snake_case attendu par le frontend
      return {
        total_pot: data.totalPot,
        total_collected: data.totalCollected,
        total_pending: data.totalPending,
        total_fines: data.totalFines,
        total_members: data.totalMembers,
      } as TeamStats;
    },
    enabled: !!teamId,
  });
};

// Hook pour le classement
export const useTeamLeaderboard = (teamId: string, limit = 10) => {
  return useQuery({
    queryKey: queryKeys.teamLeaderboard(teamId),
    queryFn: async () => {
      const data = await api.get<Array<{
        userId: string;
        displayName: string;
        avatarUrl: string | null;
        totalFines: number;
        finesCount: number;
      }>>(`/teams/${teamId}/leaderboard?limit=${limit}`);

      // Transformer en format snake_case attendu
      return data.map((entry) => ({
        user_id: entry.userId,
        display_name: entry.displayName,
        avatar_url: entry.avatarUrl,
        total_fines: entry.totalFines,
        fines_count: entry.finesCount,
      })) as LeaderboardEntry[];
    },
    enabled: !!teamId,
  });
};

// Hook pour créer une équipe
export const useCreateTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      sport,
      allowCustomFines,
      finePermission,
      disputeEnabled,
      disputeMode,
      disputeVotesRequired,
    }: {
      name: string;
      description?: string;
      sport?: string;
      allowCustomFines?: boolean;
      finePermission?: string;
      disputeEnabled?: boolean;
      disputeMode?: 'simple' | 'community';
      disputeVotesRequired?: number;
    }) => {
      const response = await api.post<CreateTeamResponse>('/teams', {
        name,
        description,
        sport,
        allowCustomFines: allowCustomFines ?? true,
        finePermission: finePermission ?? 'everyone',
        disputeEnabled: disputeEnabled ?? false,
        disputeMode: disputeMode ?? 'simple',
        disputeVotesRequired: disputeVotesRequired ?? 3,
      });

      return response.teamId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams });
    },
  });
};

// Hook pour rejoindre une équipe
export const useJoinTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const response = await api.post<JoinTeamResponse>('/teams/join', { inviteCode });
      return response.teamId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams });
    },
  });
};

// Hook pour quitter une équipe
export const useLeaveTeam = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (teamId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      await api.delete(`/teams/${teamId}/members/${user.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams });
    },
  });
};

// Hook pour mettre à jour une équipe
export const useUpdateTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      updates,
    }: {
      teamId: string;
      updates: Partial<Pick<Team, 'name' | 'description' | 'sport' | 'allow_custom_fines' | 'fine_permission' | 'is_closed' | 'dispute_enabled' | 'dispute_mode' | 'dispute_votes_required'>>;
    }) => {
      // Transformer snake_case en camelCase pour l'API
      const apiUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) apiUpdates.name = updates.name;
      if (updates.description !== undefined) apiUpdates.description = updates.description;
      if (updates.sport !== undefined) apiUpdates.sport = updates.sport;
      if (updates.allow_custom_fines !== undefined) apiUpdates.allowCustomFines = updates.allow_custom_fines;
      if (updates.fine_permission !== undefined) apiUpdates.finePermission = updates.fine_permission;
      if (updates.is_closed !== undefined) apiUpdates.isClosed = updates.is_closed;
      if (updates.dispute_enabled !== undefined) apiUpdates.disputeEnabled = updates.dispute_enabled;
      if (updates.dispute_mode !== undefined) apiUpdates.disputeMode = updates.dispute_mode;
      if (updates.dispute_votes_required !== undefined) apiUpdates.disputeVotesRequired = updates.dispute_votes_required;

      return api.patch<Team>(`/teams/${teamId}`, apiUpdates);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team(data.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams });
    },
  });
};

// Hook pour régénérer le code d'invitation
export const useRegenerateInviteCode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      const response = await api.post<{ code: string }>(`/teams/${teamId}/regenerate-code`);
      return response.code;
    },
    onSuccess: (_, teamId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team(teamId) });
    },
  });
};

// Hook pour retirer un membre de l'équipe
export const useRemoveMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, memberId }: { teamId: string; memberId: string }) => {
      await api.delete(`/teams/${teamId}/members/${memberId}`);
      return teamId;
    },
    onSuccess: (teamId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teamMembers(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teamLeaderboard(teamId) });
    },
  });
};

// Hook pour mettre à jour le rôle d'un membre
export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, memberId, role }: { teamId: string; memberId: string; role: TeamRole }) => {
      await api.patch(`/teams/${teamId}/members/${memberId}`, { role });
      return teamId;
    },
    onSuccess: (teamId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teamMembers(teamId) });
    },
  });
};

// Hook pour supprimer une équipe
export const useDeleteTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      await api.delete(`/teams/${teamId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams });
    },
  });
};
