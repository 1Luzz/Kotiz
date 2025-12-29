import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  NotificationTypeLabels,
  NotificationTypeIcons,
} from '@/hooks/useNotifications';
import { EmptyState, LoadingScreen } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { Notification, NotificationType } from '@/types/database';

const getNotificationColor = (type: NotificationType): string => {
  switch (type) {
    case 'fine_received':
      return Colors.error;
    case 'fine_paid':
    case 'payment_recorded':
    case 'team_reopened':
      return Colors.success;
    case 'member_joined':
      return Colors.primary;
    case 'member_left':
    case 'team_closed':
      return Colors.warning;
    case 'reminder_unpaid':
      return Colors.secondary;
    default:
      return Colors.textSecondary;
  }
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'A l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
};

interface NotificationItemProps {
  notification: Notification & { team_name?: string };
  onPress: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onPress }) => {
  const color = getNotificationColor(notification.notification_type);
  const iconName = NotificationTypeIcons[notification.notification_type] as keyof typeof Ionicons.glyphMap;

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.is_read && styles.notificationItemUnread,
      ]}
      onPress={onPress}
    >
      <View style={[styles.notificationIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={iconName} size={20} color={color} />
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {notification.title}
          </Text>
          {!notification.is_read && <View style={styles.unreadDot} />}
        </View>

        <Text style={styles.notificationBody} numberOfLines={2}>
          {notification.body}
        </Text>

        <View style={styles.notificationMeta}>
          {notification.team_name && (
            <Text style={styles.notificationTeam}>{notification.team_name}</Text>
          )}
          <Text style={styles.notificationTime}>
            {formatTimeAgo(notification.created_at)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function NotificationsScreen() {
  const { data: notifications, isLoading, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.is_read) {
      await markRead.mutateAsync(notification.id);
    }

    // Navigate based on notification type and data
    if (notification.team_id) {
      router.push({ pathname: '/team/[id]', params: { id: notification.team_id } });
    }
  };

  const handleMarkAllRead = async () => {
    await markAllRead.mutateAsync();
  };

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  if (isLoading) {
    return <LoadingScreen message="Chargement..." />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Notifications',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () =>
            unreadCount > 0 ? (
              <TouchableOpacity onPress={handleMarkAllRead} style={styles.headerBtn}>
                <Ionicons name="checkmark-done" size={24} color={Colors.primary} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      {!notifications || notifications.length === 0 ? (
        <View style={styles.container}>
          <EmptyState
            icon="notifications-off-outline"
            title="Aucune notification"
            description="Vous n'avez pas encore de notifications"
          />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem
              notification={item}
              onPress={() => handleNotificationPress(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={Colors.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBtn: {
    padding: Spacing.xs,
    marginHorizontal: Spacing.sm,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  notificationItemUnread: {
    backgroundColor: Colors.primary + '10',
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTitle: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: Spacing.sm,
  },
  notificationBody: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  notificationTeam: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
    color: Colors.primary,
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  notificationTime: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  separator: {
    height: Spacing.sm,
  },
});
