import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FineWithDetails } from '@/types/database';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { Avatar } from './ui/Avatar';
import { Badge } from './ui/Badge';
import { getStatusColor, StatusLabels, getCategoryColor, CategoryLabels } from '@/constants/theme';

interface FineCardProps {
  fine: FineWithDetails;
  onPress?: () => void;
  showOffender?: boolean;
}

export const FineCard: React.FC<FineCardProps> = ({
  fine,
  onPress,
  showOffender = true,
}) => {
  const statusColor = getStatusColor(fine.status);
  const remaining = Number(fine.amount) - Number(fine.amount_paid);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.header}>
        {showOffender && (
          <View style={styles.offender}>
            <Avatar
              source={fine.offender_avatar}
              name={fine.offender_name}
              size="sm"
            />
            <Text style={styles.offenderName}>{fine.offender_name}</Text>
          </View>
        )}
        <Badge
          label={StatusLabels[fine.status]}
          variant={fine.status === 'paid' ? 'success' : fine.status === 'partially_paid' ? 'warning' : 'error'}
          size="sm"
        />
      </View>

      <View style={styles.content}>
        <View style={styles.ruleInfo}>
          {fine.rule_category && (
            <View
              style={[
                styles.categoryDot,
                { backgroundColor: getCategoryColor(fine.rule_category) },
              ]}
            />
          )}
          <Text style={styles.label}>{fine.custom_label || fine.rule_label}</Text>
        </View>

        <View style={styles.amountContainer}>
          <Text style={styles.amount}>{Number(fine.amount).toFixed(2)}€</Text>
          {fine.status === 'partially_paid' && (
            <Text style={styles.remaining}>
              (reste {remaining.toFixed(2)}€)
            </Text>
          )}
        </View>
      </View>

      {fine.note && (
        <Text style={styles.note} numberOfLines={2}>
          {fine.note}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.issuedBy}>
          <Ionicons name="person-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.issuedByText}>
            Par {fine.issued_by_name}
          </Text>
        </View>
        <Text style={styles.date}>{formatDate(fine.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  offender: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offenderName: {
    marginLeft: Spacing.sm,
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ruleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  label: {
    fontSize: FontSizes.md,
    color: Colors.text,
    flex: 1,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.secondary,
  },
  remaining: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  note: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  issuedBy: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  issuedByText: {
    marginLeft: Spacing.xs,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  date: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
});
