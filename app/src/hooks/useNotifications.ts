import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import {
  Notification,
  UserNotificationSettings,
  UserTeamNotificationSettings,
} from '@/types/database';

// Transform API response (camelCase) to frontend format (snake_case)
const transformNotification = (n: any): Notification & { team_name?: string } => ({
  id: n.id,
  user_id: n.userId,
  team_id: n.teamId,
  notification_type: n.notificationType,
  title: n.title,
  body: n.body,
  data: n.data,
  is_read: n.isRead,
  read_at: n.readAt,
  created_at: n.createdAt,
  team_name: n.team?.name,
});

const transformSettings = (s: any): UserNotificationSettings => ({
  id: s.id,
  user_id: s.userId,
  notifications_enabled: s.notificationsEnabled,
  notify_fine_received: s.notifyFineReceived,
  notify_fine_paid: s.notifyFinePaid,
  notify_payment_recorded: s.notifyPaymentRecorded,
  notify_member_joined: s.notifyMemberJoined,
  notify_member_left: s.notifyMemberLeft,
  notify_team_closed: s.notifyTeamClosed,
  notify_team_reopened: s.notifyTeamReopened,
  notify_reminder_unpaid: s.notifyReminderUnpaid,
  reminder_interval_days: s.reminderIntervalDays,
  quiet_hours_enabled: s.quietHoursEnabled,
  quiet_hours_start: s.quietHoursStart,
  quiet_hours_end: s.quietHoursEnd,
  created_at: s.createdAt,
  updated_at: s.updatedAt,
});

const transformTeamSettings = (s: any): UserTeamNotificationSettings => ({
  id: s.id,
  user_id: s.userId,
  team_id: s.teamId,
  notifications_enabled: s.notificationsEnabled,
  notify_fine_received: s.notifyFineReceived,
  notify_fine_paid: s.notifyFinePaid,
  notify_payment_recorded: s.notifyPaymentRecorded,
  notify_member_joined: s.notifyMemberJoined,
  notify_member_left: s.notifyMemberLeft,
  notify_team_closed: s.notifyTeamClosed,
  notify_team_reopened: s.notifyTeamReopened,
  notify_reminder_unpaid: s.notifyReminderUnpaid,
  created_at: s.createdAt,
  updated_at: s.updatedAt,
});

// Hook pour récupérer les notifications
export const useNotifications = (limit = 50) => {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const data = await api.get<any[]>(`/notifications?limit=${limit}`);
      return data.map(transformNotification);
    },
  });
};

// Hook pour le nombre de notifications non lues
export const useUnreadCount = () => {
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: async () => {
      const data = await api.get<{ count: number }>('/notifications/unread-count');
      return data.count;
    },
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  });
};

// Hook pour les paramètres de notification globaux
export const useNotificationSettings = () => {
  return useQuery({
    queryKey: queryKeys.notificationSettings,
    queryFn: async () => {
      const data = await api.get<any>('/notifications/settings');
      return transformSettings(data);
    },
  });
};

// Hook pour mettre à jour les paramètres de notification globaux
export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<UserNotificationSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      // Transform snake_case to camelCase for API
      const apiUpdates: Record<string, any> = {};
      if (updates.notifications_enabled !== undefined) apiUpdates.notificationsEnabled = updates.notifications_enabled;
      if (updates.notify_fine_received !== undefined) apiUpdates.notifyFineReceived = updates.notify_fine_received;
      if (updates.notify_fine_paid !== undefined) apiUpdates.notifyFinePaid = updates.notify_fine_paid;
      if (updates.notify_payment_recorded !== undefined) apiUpdates.notifyPaymentRecorded = updates.notify_payment_recorded;
      if (updates.notify_member_joined !== undefined) apiUpdates.notifyMemberJoined = updates.notify_member_joined;
      if (updates.notify_member_left !== undefined) apiUpdates.notifyMemberLeft = updates.notify_member_left;
      if (updates.notify_team_closed !== undefined) apiUpdates.notifyTeamClosed = updates.notify_team_closed;
      if (updates.notify_team_reopened !== undefined) apiUpdates.notifyTeamReopened = updates.notify_team_reopened;
      if (updates.notify_reminder_unpaid !== undefined) apiUpdates.notifyReminderUnpaid = updates.notify_reminder_unpaid;
      if (updates.quiet_hours_enabled !== undefined) apiUpdates.quietHoursEnabled = updates.quiet_hours_enabled;
      if (updates.quiet_hours_start !== undefined) apiUpdates.quietHoursStart = updates.quiet_hours_start;
      if (updates.quiet_hours_end !== undefined) apiUpdates.quietHoursEnd = updates.quiet_hours_end;
      if (updates.reminder_interval_days !== undefined) apiUpdates.reminderIntervalDays = updates.reminder_interval_days;

      const data = await api.patch<any>('/notifications/settings', apiUpdates);
      return transformSettings(data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.notificationSettings, data);
    },
  });
};

// Hook pour les paramètres de notification par équipe
export const useTeamNotificationSettings = (teamId: string) => {
  return useQuery({
    queryKey: queryKeys.teamNotificationSettings(teamId),
    queryFn: async () => {
      const data = await api.get<any>(`/teams/${teamId}/notification-settings`);
      return transformTeamSettings(data);
    },
    enabled: !!teamId,
  });
};

// Hook pour mettre à jour les paramètres de notification par équipe
export const useUpdateTeamNotificationSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      updates,
    }: {
      teamId: string;
      updates: Partial<Omit<UserTeamNotificationSettings, 'id' | 'user_id' | 'team_id' | 'created_at' | 'updated_at'>>;
    }) => {
      // Transform snake_case to camelCase for API
      const apiUpdates: Record<string, any> = {};
      if (updates.notifications_enabled !== undefined) apiUpdates.notificationsEnabled = updates.notifications_enabled;
      if (updates.notify_fine_received !== undefined) apiUpdates.notifyFineReceived = updates.notify_fine_received;
      if (updates.notify_fine_paid !== undefined) apiUpdates.notifyFinePaid = updates.notify_fine_paid;
      if (updates.notify_payment_recorded !== undefined) apiUpdates.notifyPaymentRecorded = updates.notify_payment_recorded;
      if (updates.notify_member_joined !== undefined) apiUpdates.notifyMemberJoined = updates.notify_member_joined;
      if (updates.notify_member_left !== undefined) apiUpdates.notifyMemberLeft = updates.notify_member_left;
      if (updates.notify_team_closed !== undefined) apiUpdates.notifyTeamClosed = updates.notify_team_closed;
      if (updates.notify_team_reopened !== undefined) apiUpdates.notifyTeamReopened = updates.notify_team_reopened;
      if (updates.notify_reminder_unpaid !== undefined) apiUpdates.notifyReminderUnpaid = updates.notify_reminder_unpaid;

      const data = await api.patch<any>(`/teams/${teamId}/notification-settings`, apiUpdates);
      return transformTeamSettings(data);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.teamNotificationSettings(variables.teamId), data);
    },
  });
};

// Hook pour marquer une notification comme lue
export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await api.post(`/notifications/${notificationId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
};

// Hook pour marquer toutes les notifications comme lues
export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post('/notifications/mark-all-read', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
};

// Hook pour envoyer un rappel de paiement à un membre (toutes ses amendes)
export const useSendPaymentReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      memberId,
      message,
    }: {
      teamId: string;
      memberId: string;
      message?: string;
    }) => {
      const data = await api.post<{ notification: any; remindedCount: number }>(
        `/teams/${teamId}/members/${memberId}/reminder`,
        { message }
      );
      return data.remindedCount;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fines', variables.teamId] });
    },
  });
};

// Hook pour envoyer un rappel pour une amende spécifique
export const useSendFineReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fineId,
      message,
    }: {
      fineId: string;
      message?: string;
    }) => {
      const data = await api.post<any>(`/fines/${fineId}/reminder`, { message });
      return data.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fines'] });
    },
  });
};

// Labels pour les types de notification
export const NotificationTypeLabels: Record<string, string> = {
  fine_received: 'Nouvelle amende',
  fine_paid: 'Paiement recu',
  payment_recorded: 'Paiement enregistre',
  member_joined: 'Nouveau membre',
  member_left: 'Depart membre',
  team_closed: 'Cagnotte close',
  team_reopened: 'Cagnotte reouverte',
  reminder_unpaid: 'Rappel amendes',
};

// Descriptions pour les types de notification
export const NotificationTypeDescriptions: Record<string, string> = {
  fine_received: 'Quand vous recevez une amende',
  fine_paid: 'Quand un paiement est enregistre sur votre amende',
  payment_recorded: 'Quand un membre effectue un paiement (admin/tresorier)',
  member_joined: 'Quand un nouveau membre rejoint l\'equipe',
  member_left: 'Quand un membre quitte l\'equipe',
  team_closed: 'Quand la cagnotte est close',
  team_reopened: 'Quand la cagnotte est reouverte',
  reminder_unpaid: 'Rappels pour vos amendes impayees',
};

// Icônes pour les types de notification
export const NotificationTypeIcons: Record<string, string> = {
  fine_received: 'warning',
  fine_paid: 'checkmark-circle',
  payment_recorded: 'cash',
  member_joined: 'person-add',
  member_left: 'person-remove',
  team_closed: 'lock-closed',
  team_reopened: 'lock-open',
  reminder_unpaid: 'alarm',
};
