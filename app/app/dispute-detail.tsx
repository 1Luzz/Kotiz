import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDispute, useDisputeVotes, useHasVoted, useVoteOnDispute, useResolveDispute } from '@/hooks/useDisputes';
import { useTeam, useTeamMembers } from '@/hooks/useTeams';
import { useAuthStore } from '@/lib/store';
import { Button, Input, Card, Avatar, LoadingScreen, Badge, useToast } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { DisputeStatus } from '@/types/database';

const STATUS_CONFIG: Record<DisputeStatus, { label: string; color: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
  pending: { label: 'En attente', color: Colors.warning, variant: 'warning' },
  approved: { label: 'Approuvee', color: Colors.success, variant: 'success' },
  rejected: { label: 'Rejetee', color: Colors.error, variant: 'error' },
  auto_approved: { label: 'Approuvee (vote)', color: Colors.success, variant: 'success' },
};

export default function DisputeDetailScreen() {
  const { disputeId, teamId } = useLocalSearchParams<{ disputeId: string; teamId: string }>();
  const { user } = useAuthStore();
  const toast = useToast();

  const { data: dispute, isLoading: disputeLoading } = useDispute(disputeId);
  const { data: votes } = useDisputeVotes(disputeId);
  const { data: hasVotedData, isLoading: hasVotedLoading } = useHasVoted(disputeId, user?.id || '') as { data: { id: string; vote: boolean } | null | undefined; isLoading: boolean };
  const { data: team, isLoading: teamLoading } = useTeam(teamId);
  const { data: members, isLoading: membersLoading } = useTeamMembers(teamId);

  const voteOnDispute = useVoteOnDispute();
  const resolveDispute = useResolveDispute();

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [resolveNote, setResolveNote] = useState('');

  // Attendre que toutes les donnees soient chargees avant d'afficher les actions
  const isLoading = disputeLoading || teamLoading || membersLoading;

  const currentUserRole = members?.find((m) => m.user_id === user?.id)?.role;
  const isAdmin = currentUserRole === 'admin';
  const isTreasurer = currentUserRole === 'treasurer';

  // Utiliser team_dispute_mode de la vue dispute pour plus de fiabilite
  const disputeMode = dispute?.team_dispute_mode || team?.dispute_mode;
  const isCommunityMode = disputeMode === 'community';
  const isSimpleMode = disputeMode === 'simple';

  // Mode simple: admin/tresorier peut approuver/rejeter
  const canResolve = (isAdmin || isTreasurer) && dispute?.status === 'pending' && isSimpleMode;

  // Mode communautaire: tous les membres peuvent voter (sauf le createur de la contestation)
  // On attend que hasVotedLoading soit false pour savoir si l'utilisateur a deja vote
  const hasAlreadyVoted = hasVotedData !== null && hasVotedData !== undefined;
  const canVote = isCommunityMode
    && dispute?.status === 'pending'
    && !hasVotedLoading  // On attend que le chargement soit termine
    && !hasAlreadyVoted  // N'a pas deja vote
    && user?.id !== dispute?.disputed_by;  // N'est pas celui qui a cree la contestation

  const handleVote = async (vote: boolean) => {
    try {
      await voteOnDispute.mutateAsync({ disputeId, vote });
      toast.showSuccess(vote ? 'Vote pour annuler enregistre !' : 'Vote pour maintenir enregistre !');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du vote';
      toast.showError(errorMessage);
    }
  };

  const handleResolve = async (approved: boolean) => {
    try {
      await resolveDispute.mutateAsync({
        disputeId,
        approved,
        note: resolveNote.trim() || undefined,
      });
      setShowResolveModal(false);
      setShowRejectModal(false);

      if (approved) {
        toast.showSuccess('Contestation approuvee - l\'amende a ete annulee');
      } else {
        toast.showSuccess('Contestation rejetee - l\'amende est maintenue');
      }
      router.back();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur';
      toast.showError(`Erreur: ${message}`);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Chargement..." />;
  }

  if (!dispute) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTitle: 'Contestation',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                <Ionicons name="arrow-back" size={24} color={Colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.container}>
          <Text style={styles.errorText}>Contestation introuvable</Text>
        </View>
      </>
    );
  }

  const statusConfig = STATUS_CONFIG[dispute.status];
  const positiveVotes = votes?.filter((v) => v.vote).length || 0;
  const negativeVotes = votes?.filter((v) => !v.vote).length || 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Contestation',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Status */}
        <View style={styles.statusRow}>
          <Badge label={statusConfig.label} variant={statusConfig.variant} />
        </View>

        {/* Progress bar for community voting */}
        {dispute.status === 'pending' && isCommunityMode && (
          <Card style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Ionicons name="people" size={20} color={Colors.primary} />
              <Text style={styles.progressTitle}>Vote communautaire</Text>
            </View>
            <View style={styles.progressInfo}>
              <Text style={styles.progressCount}>{positiveVotes}/{dispute.votes_required}</Text>
              <Text style={styles.progressLabel}>votes pour annuler</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${Math.min(100, (positiveVotes / (dispute.votes_required || 1)) * 100)}%` }
                ]}
              />
            </View>
            {negativeVotes > 0 && (
              <Text style={styles.negativeVotesHint}>
                {negativeVotes} vote(s) pour maintenir (+{negativeVotes} au seuil)
              </Text>
            )}
            <Text style={styles.progressHint}>
              {positiveVotes >= (dispute.votes_required || 0)
                ? 'Le seuil de votes est atteint !'
                : `Encore ${(dispute.votes_required || 0) - positiveVotes} vote(s) necessaire(s)`}
            </Text>
          </Card>
        )}

        {/* Amende contestee */}
        <Card style={styles.fineCard}>
          <Text style={styles.cardTitle}>Amende contestee</Text>
          <View style={styles.fineRow}>
            <View style={styles.fineInfo}>
              <Text style={styles.fineLabel}>{dispute.fine_label || 'Amende personnalisee'}</Text>
              <View style={styles.offenderRow}>
                <Avatar source={dispute.offender_avatar} name={dispute.offender_name} size="xs" />
                <Text style={styles.offenderName}>{dispute.offender_name}</Text>
              </View>
            </View>
            <Text style={styles.fineAmount}>{Number(dispute.fine_amount || 0).toFixed(0)}€</Text>
          </View>
        </Card>

        {/* Contestation */}
        <Card style={styles.disputeCard}>
          <Text style={styles.cardTitle}>Raison de la contestation</Text>
          <View style={styles.disputedByRow}>
            <Avatar source={dispute.disputed_by_avatar} name={dispute.disputed_by_name} size="sm" />
            <View style={styles.disputedByInfo}>
              <Text style={styles.disputedByName}>{dispute.disputed_by_name}</Text>
              <Text style={styles.disputedByDate}>
                Le {new Date(dispute.created_at).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          </View>
          <Text style={styles.reasonText}>{dispute.reason}</Text>
        </Card>

        {/* Resolution (si resolue) */}
        {dispute.status !== 'pending' && dispute.resolved_by_name && (
          <Card style={styles.resolutionCard}>
            <Text style={styles.cardTitle}>Resolution</Text>
            <View style={styles.resolvedByRow}>
              <Ionicons
                name={dispute.status === 'rejected' ? 'close-circle' : 'checkmark-circle'}
                size={20}
                color={dispute.status === 'rejected' ? Colors.error : Colors.success}
              />
              <Text style={styles.resolvedByName}>
                {dispute.status === 'auto_approved'
                  ? 'Vote communautaire'
                  : `Par ${dispute.resolved_by_name}`}
              </Text>
            </View>
            {dispute.resolution_note && (
              <Text style={styles.resolutionNote}>"{dispute.resolution_note}"</Text>
            )}
          </Card>
        )}

        {/* Votes (mode communautaire) */}
        {isCommunityMode && votes && votes.length > 0 && (
          <Card style={styles.votesCard}>
            <Text style={styles.cardTitle}>Votes ({votes.length})</Text>
            <View style={styles.votesSummary}>
              <View style={styles.voteSummaryItem}>
                <Ionicons name="thumbs-up" size={20} color={Colors.success} />
                <Text style={styles.voteSummaryText}>{positiveVotes} pour annuler</Text>
              </View>
              <View style={styles.voteSummaryItem}>
                <Ionicons name="thumbs-down" size={20} color={Colors.error} />
                <Text style={styles.voteSummaryText}>{negativeVotes} pour maintenir</Text>
              </View>
            </View>
            <View style={styles.votesList}>
              {votes.map((vote) => (
                <View key={vote.id} style={styles.voteItem}>
                  <Avatar source={vote.user.avatar_url} name={vote.user.display_name} size="xs" />
                  <Text style={styles.voterName}>{vote.user.display_name}</Text>
                  <Ionicons
                    name={vote.vote ? 'thumbs-up' : 'thumbs-down'}
                    size={16}
                    color={vote.vote ? Colors.success : Colors.error}
                  />
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Actions */}
        {canVote && (
          <Card style={styles.actionsCard}>
            <Text style={styles.cardTitle}>Votre vote</Text>
            <Text style={styles.voteHint}>
              Voter "maintenir" augmente le seuil requis de 1.
            </Text>
            <View style={styles.voteButtons}>
              <Button
                title="Voter pour annuler"
                onPress={() => handleVote(true)}
                loading={voteOnDispute.isPending}
                style={styles.voteButtonApprove}
                icon={<Ionicons name="thumbs-up-outline" size={18} color="#FFFFFF" />}
              />
              <Button
                title="Voter pour maintenir"
                onPress={() => handleVote(false)}
                loading={voteOnDispute.isPending}
                variant="secondary"
                style={styles.voteButtonReject}
                icon={<Ionicons name="thumbs-down-outline" size={18} color={Colors.background} />}
              />
            </View>
          </Card>
        )}

        {hasAlreadyVoted && dispute.status === 'pending' && isCommunityMode && (
          <Card style={styles.votedCard}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            <Text style={styles.votedText}>
              Vous avez vote {hasVotedData?.vote ? 'pour annuler' : 'pour maintenir'} cette amende.
            </Text>
          </Card>
        )}

        {canResolve && (
          <Card style={styles.actionsCard}>
            <Text style={styles.cardTitle}>Decision</Text>
            <Text style={styles.resolveHint}>
              En tant qu'{isAdmin ? 'administrateur' : 'tresorier'}, vous pouvez statuer sur cette contestation.
            </Text>
            <View style={styles.voteButtons}>
              <Button
                title="Approuver (annuler amende)"
                onPress={() => setShowResolveModal(true)}
                style={styles.voteButtonApprove}
              />
              <Button
                title="Rejeter (maintenir)"
                onPress={() => setShowRejectModal(true)}
                variant="secondary"
                style={styles.voteButtonReject}
              />
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Modal de resolution */}
      <Modal
        visible={showResolveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResolveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Approuver la contestation</Text>
            <Text style={styles.modalText}>
              L'amende de {dispute.fine_amount}€ sera annulee.
            </Text>
            <Input
              label="Note (optionnel)"
              placeholder="Raison de l'approbation..."
              value={resolveNote}
              onChangeText={setResolveNote}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowResolveModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={() => handleResolve(true)}
              >
                <Text style={styles.modalBtnConfirmText}>Approuver</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de rejet */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rejeter la contestation ?</Text>
            <Text style={styles.modalText}>
              L'amende de {dispute.fine_amount}€ sera maintenue.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowRejectModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnReject]}
                onPress={() => handleResolve(false)}
              >
                <Text style={styles.modalBtnConfirmText}>Rejeter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  errorText: {
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  progressCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.primary + '10',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  progressTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.primary,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  progressCount: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  progressLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: Colors.border,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 5,
  },
  progressHint: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  negativeVotesHint: {
    fontSize: FontSizes.xs,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  cardTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  fineCard: {
    marginBottom: Spacing.md,
  },
  fineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  fineInfo: {
    flex: 1,
  },
  fineLabel: {
    fontSize: FontSizes.md,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  offenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  offenderName: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  fineAmount: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.secondary,
  },
  disputeCard: {
    marginBottom: Spacing.md,
  },
  disputedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  disputedByInfo: {
    flex: 1,
  },
  disputedByName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  disputedByDate: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  reasonText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  resolutionCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.backgroundLight,
  },
  resolvedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  resolvedByName: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  resolutionNote: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  votesCard: {
    marginBottom: Spacing.md,
  },
  votesSummary: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  voteSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  voteSummaryText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  votesList: {
    gap: Spacing.sm,
  },
  voteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  voterName: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  actionsCard: {
    marginBottom: Spacing.md,
  },
  voteHint: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  resolveHint: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  voteButtons: {
    gap: Spacing.sm,
  },
  voteButtonApprove: {
    backgroundColor: Colors.success,
  },
  voteButtonReject: {},
  votedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success + '15',
    marginBottom: Spacing.md,
  },
  votedText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  modalText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: Colors.backgroundLight,
  },
  modalBtnCancelText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalBtnConfirm: {
    backgroundColor: Colors.success,
  },
  modalBtnReject: {
    backgroundColor: Colors.error,
  },
  modalBtnConfirmText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
