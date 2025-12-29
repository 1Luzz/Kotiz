import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TeamBalance } from '@/types/database';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { Avatar } from './ui/Avatar';
import { Badge } from './ui/Badge';

interface MemberCardProps {
  member: TeamBalance;
  onPress?: () => void;
  onAddFine?: () => void;
  showAddFine?: boolean;
}

export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  onPress,
  onAddFine,
  showAddFine = true,
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.leftSection}>
        <Avatar
          source={member.avatar_url}
          name={member.display_name}
          size="md"
        />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{member.display_name}</Text>
            {member.role === 'admin' && (
              <Badge label="Admin" variant="primary" size="sm" style={styles.badge} />
            )}
          </View>
          <Text style={styles.stats}>
            {member.fines_count} amende{member.fines_count > 1 ? 's' : ''}
            {member.unpaid_count > 0 && (
              <Text style={styles.unpaid}> ({member.unpaid_count} non payée{member.unpaid_count > 1 ? 's' : ''})</Text>
            )}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <View style={styles.balanceContainer}>
          <Text
            style={[
              styles.balance,
              member.balance > 0 && styles.balanceUnpaid,
              member.balance === 0 && styles.balancePaid,
            ]}
          >
            {Number(member.balance).toFixed(2)}€
          </Text>
          <Text style={styles.balanceLabel}>
            {member.balance > 0 ? 'dû' : 'OK'}
          </Text>
        </View>

        {showAddFine && onAddFine && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={(e) => {
              e.stopPropagation();
              onAddFine();
            }}
          >
            <Ionicons name="add" size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  info: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  badge: {
    marginLeft: Spacing.sm,
  },
  stats: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  unpaid: {
    color: Colors.error,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceContainer: {
    alignItems: 'flex-end',
    marginRight: Spacing.sm,
  },
  balance: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  balanceUnpaid: {
    color: Colors.error,
  },
  balancePaid: {
    color: Colors.success,
  },
  balanceLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
