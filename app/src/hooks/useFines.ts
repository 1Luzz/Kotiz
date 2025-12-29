import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { FineRule, FineWithDetails, UserBalance, FineCategory } from '@/types/database';

// Types pour les réponses API
interface FineRuleResponse {
  id: string;
  teamId: string;
  label: string;
  amount: number;
  category: FineCategory;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

interface FineResponse {
  id: string;
  teamId: string;
  ruleId: string | null;
  offenderId: string;
  issuedById: string;
  customLabel: string | null;
  amount: number;
  amountPaid: number;
  status: string;
  note: string | null;
  lastReminderSent: string | null;
  createdAt: string;
  updatedAt: string;
  offender: { id: string; displayName: string; avatarUrl: string | null };
  issuedBy: { id: string; displayName: string; avatarUrl: string | null };
  rule: { id: string; label: string; category: string } | null;
}

interface BalanceResponse {
  totalFines: number;
  totalPaid: number;
  balance: number;
  finesCount: number;
  unpaidCount: number;
}

// Helper pour transformer FineRuleResponse en FineRule (snake_case)
function toFineRule(rule: FineRuleResponse): FineRule {
  return {
    id: rule.id,
    team_id: rule.teamId,
    label: rule.label,
    amount: rule.amount,
    category: rule.category,
    is_active: rule.isActive,
    created_by: rule.createdById,
    created_at: rule.createdAt,
    updated_at: rule.updatedAt,
  };
}

// Helper pour transformer FineResponse en FineWithDetails (snake_case)
function toFineWithDetails(fine: FineResponse): FineWithDetails {
  return {
    id: fine.id,
    team_id: fine.teamId,
    rule_id: fine.ruleId,
    offender_id: fine.offenderId,
    issued_by_id: fine.issuedById,
    custom_label: fine.customLabel,
    amount: fine.amount,
    amount_paid: fine.amountPaid,
    status: fine.status as any,
    note: fine.note,
    last_reminder_sent: fine.lastReminderSent ?? null,
    created_at: fine.createdAt,
    updated_at: fine.updatedAt,
    offender_name: fine.offender.displayName,
    offender_avatar: fine.offender.avatarUrl,
    issued_by_name: fine.issuedBy.displayName,
    issued_by_avatar: fine.issuedBy.avatarUrl,
    rule_label: fine.rule?.label ?? null,
    rule_category: fine.rule?.category as FineCategory ?? null,
  };
}

// Hook pour les règles d'amendes d'une équipe
export const useFineRules = (teamId: string) => {
  return useQuery({
    queryKey: queryKeys.fineRules(teamId),
    queryFn: async () => {
      const data = await api.get<FineRuleResponse[]>(`/teams/${teamId}/rules`);
      return data.map(toFineRule);
    },
    enabled: !!teamId,
  });
};

// Hook pour créer une règle
export const useCreateFineRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      label,
      amount,
      category,
    }: {
      teamId: string;
      label: string;
      amount: number;
      category?: FineCategory;
    }) => {
      const data = await api.post<FineRuleResponse>(`/teams/${teamId}/rules`, {
        label,
        amount,
        category: category || 'autre',
      });

      return toFineRule(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fineRules(data.team_id) });
    },
  });
};

// Hook pour mettre à jour une règle
export const useUpdateFineRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      ruleId,
      updates,
    }: {
      teamId: string;
      ruleId: string;
      updates: Partial<Pick<FineRule, 'label' | 'amount' | 'category' | 'is_active'>>;
    }) => {
      // Transformer snake_case en camelCase pour l'API
      const apiUpdates: Record<string, unknown> = {};
      if (updates.label !== undefined) apiUpdates.label = updates.label;
      if (updates.amount !== undefined) apiUpdates.amount = updates.amount;
      if (updates.category !== undefined) apiUpdates.category = updates.category;
      if (updates.is_active !== undefined) apiUpdates.isActive = updates.is_active;

      const data = await api.patch<FineRuleResponse>(`/teams/${teamId}/rules/${ruleId}`, apiUpdates);
      return toFineRule(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fineRules(data.team_id) });
    },
  });
};

// Hook pour supprimer une règle (désactiver)
export const useDeleteFineRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ruleId, teamId }: { ruleId: string; teamId: string }) => {
      await api.delete(`/teams/${teamId}/rules/${ruleId}`);
      return teamId;
    },
    onSuccess: (teamId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fineRules(teamId) });
    },
  });
};

// Hook pour les amendes d'une équipe
export const useFines = (teamId: string) => {
  return useQuery({
    queryKey: queryKeys.fines(teamId),
    queryFn: async () => {
      const data = await api.get<FineResponse[]>(`/teams/${teamId}/fines`);
      return data.map(toFineWithDetails);
    },
    enabled: !!teamId,
  });
};

// Hook pour une amende spécifique
export const useFine = (teamId: string, fineId: string) => {
  return useQuery({
    queryKey: ['fine', fineId],
    queryFn: async () => {
      const data = await api.get<FineResponse>(`/teams/${teamId}/fines/${fineId}`);
      return toFineWithDetails(data);
    },
    enabled: !!fineId && !!teamId,
  });
};

// Hook pour les amendes d'un utilisateur dans une équipe
export const useUserFines = (teamId: string, userId: string) => {
  return useQuery({
    queryKey: queryKeys.userFines(teamId, userId),
    queryFn: async () => {
      const data = await api.get<FineResponse[]>(`/teams/${teamId}/fines?userId=${userId}`);
      return data.map(toFineWithDetails);
    },
    enabled: !!teamId && !!userId,
  });
};

// Hook pour le solde d'un utilisateur
export const useUserBalance = (teamId: string, userId: string) => {
  return useQuery({
    queryKey: queryKeys.memberBalance(teamId, userId),
    queryFn: async () => {
      const data = await api.get<BalanceResponse>(`/teams/${teamId}/members/${userId}/balance`);
      // Transformer en format snake_case attendu
      return {
        total_fines: data.totalFines,
        total_paid: data.totalPaid,
        balance: data.balance,
        fines_count: data.finesCount,
        unpaid_count: data.unpaidCount,
      } as UserBalance;
    },
    enabled: !!teamId && !!userId,
  });
};

// Hook pour créer une amende
export const useCreateFine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      offenderId,
      ruleId,
      customLabel,
      amount,
      note,
    }: {
      teamId: string;
      offenderId: string;
      ruleId?: string;
      customLabel?: string;
      amount?: number;
      note?: string;
    }) => {
      const data = await api.post<FineResponse>(`/teams/${teamId}/fines`, {
        offenderId,
        ruleId,
        customLabel,
        amount,
        note,
      });

      return { fineId: data.id, teamId };
    },
    onSuccess: ({ teamId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fines(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teamStats(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teamLeaderboard(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(teamId) });
    },
  });
};

// Hook pour enregistrer un paiement (au niveau membre, pas au niveau amende)
export const useRecordPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      userId,
      amount,
      method,
      note,
    }: {
      teamId: string;
      userId: string;
      amount: number;
      method?: string;
      note?: string;
    }) => {
      const data = await api.post<{ payments: unknown[]; totalApplied: number }>(
        `/teams/${teamId}/members/${userId}/payments`,
        {
          amount,
          method: method || 'cash',
          note,
        }
      );

      return { result: data, teamId, userId };
    },
    onSuccess: ({ teamId, userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fines(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teamStats(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teamLeaderboard(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.memberBalance(teamId, userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teamMembers(teamId) });
    },
  });
};

// Hook pour supprimer une amende
export const useDeleteFine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fineId, teamId }: { fineId: string; teamId: string }) => {
      await api.delete(`/teams/${teamId}/fines/${fineId}`);
      return teamId;
    },
    onSuccess: (teamId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fines(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teamStats(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teamLeaderboard(teamId) });
    },
  });
};

// Hook pour créer plusieurs amendes en même temps (pour plusieurs utilisateurs)
export const useCreateMultipleFines = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      offenderIds,
      ruleId,
      customLabel,
      amount,
      note,
    }: {
      teamId: string;
      offenderIds: string[];
      ruleId?: string;
      customLabel?: string;
      amount?: number;
      note?: string;
    }) => {
      const results = await Promise.all(
        offenderIds.map(async (offenderId) => {
          const data = await api.post<FineResponse>(`/teams/${teamId}/fines`, {
            offenderId,
            ruleId,
            customLabel,
            amount,
            note,
          });

          return { fineId: data.id, offenderId };
        })
      );

      return { results, teamId, count: offenderIds.length };
    },
    onSuccess: ({ teamId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fines(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teamStats(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teamLeaderboard(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(teamId) });
    },
  });
};
