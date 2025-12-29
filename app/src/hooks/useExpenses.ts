import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { ExpenseCategory, ExpenseWithDetails } from '@/types/database';

// Transform API response (camelCase) to frontend format (snake_case)
const transformExpense = (e: any): ExpenseWithDetails => ({
  id: e.id,
  team_id: e.teamId,
  recorded_by: e.recordedById,
  amount: e.amount,
  description: e.description,
  category: e.category,
  receipt_url: e.receiptUrl,
  created_at: e.createdAt,
  recorded_by_name: e.recordedBy?.displayName || '',
  recorded_by_avatar: e.recordedBy?.avatarUrl || null,
});

// Clé de requête locale pour les dépenses
const expensesKey = (teamId: string) => ['team', teamId, 'expenses'] as const;

// Labels pour les catégories de dépenses
export const ExpenseCategoryLabels: Record<ExpenseCategory, string> = {
  nourriture: 'Nourriture',
  boisson: 'Boissons',
  materiel: 'Matériel',
  evenement: 'Événement',
  autre: 'Autre',
};

// Re-export des types pour compatibilité
export type { ExpenseCategory, ExpenseWithDetails } from '@/types/database';

// Hook pour récupérer les dépenses d'une équipe
export const useExpenses = (teamId: string) => {
  return useQuery({
    queryKey: expensesKey(teamId),
    queryFn: async () => {
      const data = await api.get<any[]>(`/teams/${teamId}/expenses`);
      return data.map(transformExpense);
    },
    enabled: !!teamId,
  });
};

// Hook pour créer une dépense
export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      amount,
      description,
      category,
      receiptUrl,
    }: {
      teamId: string;
      amount: number;
      description: string;
      category?: ExpenseCategory;
      receiptUrl?: string;
    }) => {
      const data = await api.post<any>(`/teams/${teamId}/expenses`, {
        amount,
        description,
        category: category || 'autre',
        receiptUrl,
      });
      return { expenseId: data.id as string, teamId };
    },
    onSuccess: ({ teamId }) => {
      queryClient.invalidateQueries({ queryKey: expensesKey(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teamStats(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(teamId) });
    },
  });
};

// Hook pour supprimer une dépense (admin seulement)
export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ expenseId, teamId }: { expenseId: string; teamId: string }) => {
      await api.delete(`/teams/${teamId}/expenses/${expenseId}`);
      return teamId;
    },
    onSuccess: (teamId) => {
      queryClient.invalidateQueries({ queryKey: expensesKey(teamId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teamStats(teamId) });
    },
  });
};
