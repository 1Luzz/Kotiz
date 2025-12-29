import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTeams } from '@/hooks/useTeams';
import { EmptyState, LoadingScreen } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { Team } from '@/types/database';

interface TeamWithRole extends Team {
  userRole?: string;
}

export default function TeamsScreen() {
  const { data: teams, isLoading, refetch, isRefetching } = useTeams();

  if (isLoading) {
    return <LoadingScreen message="Chargement..." />;
  }

  const renderTeamCard = ({ item }: { item: TeamWithRole }) => (
    <TouchableOpacity
      style={styles.teamCard}
      onPress={() => router.push(`/team/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.teamIcon}>
        <Ionicons name="people" size={24} color={Colors.primary} />
      </View>

      <View style={styles.teamInfo}>
        <Text style={styles.teamName} numberOfLines={1}>{item.name}</Text>
        {item.description && (
          <Text style={styles.teamDesc} numberOfLines={1}>{item.description}</Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={teams}
        keyExtractor={(item) => item.id}
        renderItem={renderTeamCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Aucune equipe"
            description="Creez votre premiere equipe ou rejoignez-en une"
            actionLabel="Creer une equipe"
            onAction={() => router.push('/create-team')}
          />
        }
        ListHeaderComponent={
          teams && teams.length > 0 ? (
            <Text style={styles.header}>
              {teams.length} equipe{teams.length > 1 ? 's' : ''}
            </Text>
          ) : null
        }
      />

      {/* FAB */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fabSecondary}
          onPress={() => router.push('/join-team')}
        >
          <Ionicons name="enter-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/create-team')}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 120,
  },
  header: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  teamIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  teamDesc: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  fabContainer: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabSecondary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
});
