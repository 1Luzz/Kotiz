import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Team } from '@/types/database';
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { Badge } from './ui/Badge';

interface TeamCardProps {
  team: Team & { userRole?: string };
  onPress: () => void;
  stats?: {
    totalPot: number;
    memberCount: number;
  };
}

export const TeamCard: React.FC<TeamCardProps> = ({ team, onPress, stats }) => {
  // Icône selon le sport
  const getSportIcon = (sport: string | null): keyof typeof Ionicons.glyphMap => {
    if (!sport) return 'people';

    const sportIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
      handball: 'hand-left',
      football: 'football',
      basketball: 'basketball',
      volleyball: 'tennisball',
      rugby: 'american-football',
      tennis: 'tennisball',
      natation: 'water',
      cyclisme: 'bicycle',
      running: 'walk',
      coloc: 'home',
      asso: 'people',
    };

    const lowerSport = sport.toLowerCase();
    return sportIcons[lowerSport] || 'people';
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={getSportIcon(team.sport)}
            size={24}
            color={Colors.primary}
          />
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {team.name}
          </Text>
          {team.sport && (
            <Text style={styles.sport}>{team.sport}</Text>
          )}
        </View>

        {team.userRole === 'admin' && (
          <Badge label="Admin" variant="primary" size="sm" />
        )}
      </View>

      {team.description && (
        <Text style={styles.description} numberOfLines={2}>
          {team.description}
        </Text>
      )}

      {stats && (
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Ionicons name="wallet-outline" size={16} color={Colors.secondary} />
            <Text style={styles.statValue}>{Number(stats.totalPot).toFixed(2)}€</Text>
            <Text style={styles.statLabel}>dans la caisse</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={16} color={Colors.primary} />
            <Text style={styles.statValue}>{stats.memberCount}</Text>
            <Text style={styles.statLabel}>membres</Text>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Voir les détails</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  name: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  sport: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  description: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.md,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginLeft: Spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginRight: Spacing.xs,
  },
});
