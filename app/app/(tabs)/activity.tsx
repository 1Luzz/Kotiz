import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useTeams } from '@/hooks/useTeams';
import { useActivity } from '@/hooks/useActivity';
import { ActivityItem } from '@/components/ActivityItem';
import { EmptyState, LoadingScreen } from '@/components/ui';
import { Colors, FontSizes, Spacing } from '@/constants/theme';

export default function ActivityScreen() {
  const { data: teams, isLoading: teamsLoading } = useTeams();

  // Pour le MVP, on affiche l'activité de la première équipe
  // Plus tard, on pourrait agréger l'activité de toutes les équipes
  const firstTeamId = teams?.[0]?.id;
  const { data: activities, isLoading, refetch, isRefetching } = useActivity(
    firstTeamId || ''
  );

  if (teamsLoading || isLoading) {
    return <LoadingScreen message="Chargement de l'activité..." />;
  }

  if (!firstTeamId) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="pulse-outline"
          title="Aucune activité"
          description="Rejoignez une équipe pour voir l'activité"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ActivityItem activity={item} />}
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
            icon="pulse-outline"
            title="Aucune activité"
            description="L'activité de votre équipe apparaîtra ici"
          />
        }
        ListHeaderComponent={
          activities && activities.length > 0 ? (
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Activité récente</Text>
              <Text style={styles.headerSubtitle}>
                {teams?.[0]?.name}
              </Text>
            </View>
          ) : null
        }
      />
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
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});
