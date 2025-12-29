import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTeamDisputes, useVoteOnDispute, useHasVoted } from '@/hooks/useDisputes';
import { useTeam, useTeamMembers } from '@/hooks/useTeams';
import { useAuthStore } from '@/lib/store';
import { Avatar, EmptyState, LoadingScreen, Badge, useToast } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { FineDisputeWithDetails, DisputeStatus } from '@/types/database';

const STATUS_CONFIG: Record<DisputeStatus, { label: string; variant: 'success' | 'warning' | 'error' | 'default'; icon: string }> = {
  pending: { label: 'En attente', variant: 'warning', icon: 'time-outline' },
  approved: { label: 'Annulee', variant: 'success', icon: 'checkmark-circle' },
  rejected: { label: 'Maintenue', variant: 'error', icon: 'close-circle' },
  auto_approved: { label: 'Annulee par vote', variant: 'success', icon: 'people' },
};

const FILTER_OPTIONS: { id: DisputeStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'pending', label: 'En attente' },
  { id: 'approved', label: 'Approuvees' },
  { id: 'rejected', label: 'Rejetees' },
];

// Component for individual dispute card with voting
function DisputeCard({ item, teamId, isCommunityMode, userId }: {
  item: FineDisputeWithDetails;
  teamId: string;
  isCommunityMode: boolean;
  userId: string | undefined;
}) {
  const statusConfig = STATUS_CONFIG[item.status];
  const voteOnDispute = useVoteOnDispute();
  const { data: hasVotedData, isLoading: hasVotedLoading } = useHasVoted(item.id, userId || '');
  const toast = useToast();

  const hasAlreadyVoted = hasVotedData !== null && hasVotedData !== undefined;
  const canVote = isCommunityMode
    && item.status === 'pending'
    && !hasVotedLoading
    && !hasAlreadyVoted
    && userId !== item.disputed_by;

  const isPending = item.status === 'pending';
  const positiveVotes = item.votes_count || 0;
  const votesRequired = item.votes_required || 0;
  const progress = Math.min(100, (positiveVotes / (votesRequired || 1)) * 100);

  const handleVote = async (vote: boolean) => {
    try {
      await voteOnDispute.mutateAsync({ disputeId: item.id, vote });
      toast.showSuccess(vote ? 'Vote pour annuler enregistre !' : 'Vote pour maintenir enregistre !');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du vote';
      toast.showError(errorMessage);
    }
  };

  return (
    <View style={[styles.card, !isPending && styles.cardResolved]}>
      {/* Header avec montant et status */}
      <View style={styles.cardHeader}>
        <View style={styles.amountContainer}>
          <Text style={styles.amountValue}>{Number(item.fine_amount || 0).toFixed(0)}€</Text>
          <Text style={styles.amountLabel}>{item.fine_label || 'Amende'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.variant === 'warning' ? Colors.warning + '20' : statusConfig.variant === 'success' ? Colors.success + '20' : Colors.error + '20' }]}>
          <Ionicons
            name={statusConfig.icon as any}
            size={14}
            color={statusConfig.variant === 'warning' ? Colors.warning : statusConfig.variant === 'success' ? Colors.success : Colors.error}
          />
          <Text style={[styles.statusText, { color: statusConfig.variant === 'warning' ? Colors.warning : statusConfig.variant === 'success' ? Colors.success : Colors.error }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Personne concernee */}
      <View style={styles.personRow}>
        <Avatar source={item.offender_avatar} name={item.offender_name} size="xs" />
        <Text style={styles.personName}>{item.offender_name}</Text>
        <Ionicons name="arrow-forward" size={14} color={Colors.textMuted} />
        <Text style={styles.contestedByLabel}>contestee par</Text>
        <Avatar source={item.disputed_by_avatar} name={item.disputed_by_name} size="xs" />
        <Text style={styles.personName}>{item.disputed_by_name}</Text>
      </View>

      {/* Raison */}
      <View style={styles.reasonContainer}>
        <Ionicons name="chatbubble-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.reasonText} numberOfLines={2}>{item.reason}</Text>
      </View>

      {/* Section vote pour mode communautaire */}
      {isPending && isCommunityMode && (
        <View style={styles.voteSection}>
          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                <Text style={styles.progressCount}>{positiveVotes}</Text>/{votesRequired} votes pour annuler
              </Text>
              <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>

          {/* Vote buttons */}
          {canVote && (
            <View style={styles.voteButtons}>
              <TouchableOpacity
                style={[styles.voteBtn, styles.voteBtnApprove]}
                onPress={() => handleVote(true)}
                disabled={voteOnDispute.isPending}
              >
                <Ionicons name="thumbs-up" size={16} color="#FFFFFF" />
                <Text style={styles.voteBtnTextLight}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voteBtn, styles.voteBtnReject]}
                onPress={() => handleVote(false)}
                disabled={voteOnDispute.isPending}
              >
                <Ionicons name="thumbs-down" size={16} color={Colors.error} />
                <Text style={styles.voteBtnTextDark}>Maintenir</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Already voted indicator */}
          {hasAlreadyVoted && (
            <View style={styles.votedIndicator}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.votedText}>
                Vous avez vote {(hasVotedData as { vote: boolean })?.vote ? 'pour annuler' : 'pour maintenir'}
              </Text>
            </View>
          )}

          {/* Creator cannot vote */}
          {userId === item.disputed_by && (
            <View style={styles.votedIndicator}>
              <Ionicons name="information-circle" size={16} color={Colors.textMuted} />
              <Text style={styles.votedText}>Vous avez cree cette contestation</Text>
            </View>
          )}
        </View>
      )}

      {/* Resolution info */}
      {!isPending && item.resolution_note && (
        <View style={styles.resolutionContainer}>
          <Ionicons name="document-text-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.resolutionText}>{item.resolution_note}</Text>
        </View>
      )}

      {/* Footer avec date */}
      <View style={styles.cardFooter}>
        <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>
    </View>
  );
}

export default function DisputesScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | 'all'>('all');
  const { user } = useAuthStore();

  const { data: team } = useTeam(teamId);
  const { data: disputes, isLoading } = useTeamDisputes(teamId);

  const isCommunityMode = team?.dispute_mode === 'community';

  const filteredDisputes = useMemo(() => {
    if (!disputes) return [];
    if (statusFilter === 'all') return disputes;
    return disputes.filter((d) => d.status === statusFilter);
  }, [disputes, statusFilter]);

  const pendingCount = useMemo(() => {
    return disputes?.filter((d) => d.status === 'pending').length || 0;
  }, [disputes]);

  if (isLoading) {
    return <LoadingScreen message="Chargement..." />;
  }

  const renderDispute = ({ item }: { item: FineDisputeWithDetails }) => (
    <DisputeCard
      item={item}
      teamId={teamId}
      isCommunityMode={isCommunityMode}
      userId={user?.id}
    />
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Contestations',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <FlatList
        data={filteredDisputes}
        keyExtractor={(item) => item.id}
        renderItem={renderDispute}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="flag-outline"
            title={statusFilter === 'all' ? "Aucune contestation" : `Aucune contestation ${STATUS_CONFIG[statusFilter as DisputeStatus]?.label.toLowerCase()}`}
            description={
              statusFilter === 'all'
                ? "Les contestations d'amendes apparaitront ici."
                : "Aucune contestation avec ce statut."
            }
            actionLabel={statusFilter !== 'all' ? "Voir toutes" : undefined}
            onAction={statusFilter !== 'all' ? () => setStatusFilter('all') : undefined}
          />
        }
        ListHeaderComponent={
          <>
            {/* Stats cards */}
            {disputes && disputes.length > 0 && (
              <View style={styles.statsContainer}>
                <View style={[styles.statCard, { backgroundColor: Colors.primary + '15' }]}>
                  <Ionicons name="flag" size={20} color={Colors.primary} />
                  <Text style={[styles.statValue, { color: Colors.primary }]}>{disputes.length}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: Colors.warning + '15' }]}>
                  <Ionicons name="time" size={20} color={Colors.warning} />
                  <Text style={[styles.statValue, { color: Colors.warning }]}>{pendingCount}</Text>
                  <Text style={styles.statLabel}>En attente</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: Colors.success + '15' }]}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                  <Text style={[styles.statValue, { color: Colors.success }]}>
                    {disputes.filter((d) => d.status === 'approved' || d.status === 'auto_approved').length}
                  </Text>
                  <Text style={styles.statLabel}>Annulees</Text>
                </View>
              </View>
            )}

            {/* Mode indicator */}
            {team && (
              <View style={styles.modeIndicator}>
                <Ionicons
                  name={isCommunityMode ? 'people' : 'person'}
                  size={14}
                  color={Colors.textMuted}
                />
                <Text style={styles.modeText}>
                  Mode {isCommunityMode ? 'communautaire' : 'simple'}
                  {isCommunityMode && ` (${team.dispute_votes_required} votes requis)`}
                </Text>
              </View>
            )}

            {/* Filter tabs */}
            {disputes && disputes.length > 0 && (
              <View style={styles.filterRow}>
                {FILTER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.filterTab, statusFilter === option.id && styles.filterTabActive]}
                    onPress={() => setStatusFilter(option.id)}
                  >
                    <Text style={[styles.filterTabText, statusFilter === option.id && styles.filterTabTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    flexGrow: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  modeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  modeText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  filterTab: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundLight,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  // Card styles
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardResolved: {
    opacity: 0.75,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  amountContainer: {
    flexDirection: 'column',
  },
  amountValue: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.secondary,
  },
  amountLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  personName: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.text,
  },
  contestedByLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    backgroundColor: Colors.backgroundLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  reasonText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  // Vote section
  voteSection: {
    backgroundColor: Colors.primary + '08',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  progressContainer: {
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  progressCount: {
    fontWeight: '700',
    color: Colors.primary,
  },
  progressPercent: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 4,
  },
  voteButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  voteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  voteBtnApprove: {
    backgroundColor: Colors.success,
  },
  voteBtnReject: {
    backgroundColor: Colors.error + '15',
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  voteBtnTextLight: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  voteBtnTextDark: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.error,
  },
  votedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  votedText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  resolutionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.md,
  },
  resolutionText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dateText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
});
