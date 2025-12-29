import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Données considérées "fraîches" pendant 30 secondes
      staleTime: 30 * 1000,
      // Garder en cache pendant 5 minutes
      gcTime: 5 * 60 * 1000,
      // Retry 2 fois en cas d'erreur
      retry: 2,
      // Refetch quand la fenêtre reprend le focus
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Retry 1 fois pour les mutations
      retry: 1,
    },
  },
});

// Clés de requête pour React Query
export const queryKeys = {
  // Utilisateur
  profile: (userId: string) => ['profile', userId] as const,
  currentUser: ['currentUser'] as const,

  // Équipes
  teams: ['teams'] as const,
  team: (teamId: string) => ['team', teamId] as const,
  teamStats: (teamId: string) => ['team', teamId, 'stats'] as const,
  teamLeaderboard: (teamId: string) => ['team', teamId, 'leaderboard'] as const,

  // Membres
  teamMembers: (teamId: string) => ['team', teamId, 'members'] as const,
  memberBalance: (teamId: string, userId: string) => ['team', teamId, 'member', userId, 'balance'] as const,

  // Règles
  fineRules: (teamId: string) => ['team', teamId, 'rules'] as const,
  fineRule: (ruleId: string) => ['rule', ruleId] as const,

  // Amendes
  fines: (teamId: string) => ['team', teamId, 'fines'] as const,
  userFines: (teamId: string, userId: string) => ['team', teamId, 'user', userId, 'fines'] as const,
  fine: (fineId: string) => ['fine', fineId] as const,

  // Paiements
  payments: (teamId: string) => ['team', teamId, 'payments'] as const,
  finePayments: (fineId: string) => ['fine', fineId, 'payments'] as const,

  // Activité
  activity: (teamId: string) => ['team', teamId, 'activity'] as const,

  // Méthodes de paiement
  paymentMethods: (teamId: string) => ['team', teamId, 'paymentMethods'] as const,

  // Notifications
  notifications: ['notifications'] as const,
  unreadCount: ['notifications', 'unreadCount'] as const,
  notificationSettings: ['notificationSettings'] as const,
  teamNotificationSettings: (teamId: string) => ['notificationSettings', 'team', teamId] as const,

  // Contestations
  disputes: (teamId: string) => ['team', teamId, 'disputes'] as const,
  dispute: (disputeId: string) => ['dispute', disputeId] as const,
  fineDispute: (fineId: string) => ['fine', fineId, 'dispute'] as const,
  disputeVotes: (disputeId: string) => ['dispute', disputeId, 'votes'] as const,
};
