import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityLogWithDetails, ActivityType } from '@/types/database';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import { Avatar } from './ui/Avatar';
import { formatActivityMessage } from '@/hooks/useActivity';

interface ActivityItemProps {
  activity: ActivityLogWithDetails;
}

const getActivityIcon = (type: ActivityType): keyof typeof Ionicons.glyphMap => {
  const icons: Record<ActivityType, keyof typeof Ionicons.glyphMap> = {
    team_created: 'flag',
    member_joined: 'person-add',
    member_left: 'person-remove',
    rule_created: 'document-text',
    rule_updated: 'create',
    fine_issued: 'cash',
    fine_updated: 'pencil',
    payment_recorded: 'checkmark-circle',
  };
  return icons[type] || 'ellipse';
};

const getActivityColor = (type: ActivityType): string => {
  const colors: Record<ActivityType, string> = {
    team_created: Colors.primary,
    member_joined: Colors.success,
    member_left: Colors.textMuted,
    rule_created: Colors.primary,
    rule_updated: Colors.primary,
    fine_issued: Colors.secondary,
    fine_updated: Colors.secondary,
    payment_recorded: Colors.success,
  };
  return colors[type] || Colors.textMuted;
};

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const color = getActivityColor(activity.activity_type);

  return (
    <View style={styles.container}>
      <View style={styles.iconColumn}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons
            name={getActivityIcon(activity.activity_type)}
            size={16}
            color={color}
          />
        </View>
        <View style={styles.line} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          {activity.actor_name && (
            <Avatar
              source={activity.actor_avatar}
              name={activity.actor_name}
              size="xs"
            />
          )}
          <Text style={styles.time}>{formatDate(activity.created_at)}</Text>
        </View>

        <Text style={styles.message}>
          {formatActivityMessage(activity)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
  },
  iconColumn: {
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.border,
    marginTop: Spacing.xs,
  },
  content: {
    flex: 1,
    paddingBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  time: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginLeft: Spacing.sm,
  },
  message: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    lineHeight: 20,
  },
});
