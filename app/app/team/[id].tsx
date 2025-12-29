import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
  Dimensions,
  Platform,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTeam, useTeamMembers, useTeamStats, useTeamLeaderboard } from '@/hooks/useTeams';
import { useFines, useFineRules } from '@/hooks/useFines';
import { usePendingDisputes } from '@/hooks/useDisputes';
import { useExpenses } from '@/hooks/useExpenses';
import { useAuthStore } from '@/lib/store';
import { Avatar, EmptyState, LoadingScreen } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

const { width } = Dimensions.get('window');
const POT_SIZE = Math.min(width * 0.5, 200);

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const { data: team, isLoading: teamLoading, refetch } = useTeam(id);
  const { data: stats } = useTeamStats(id);
  const { data: members } = useTeamMembers(id);
  const { data: leaderboard } = useTeamLeaderboard(id, 5);
  const { data: fines, refetch: refetchFines } = useFines(id);
  const { data: rules } = useFineRules(id);
  const { data: pendingDisputes } = usePendingDisputes(id);
  const { data: expenses, refetch: refetchExpenses } = useExpenses(id);

  const currentUserRole = members?.find((m) => m.user_id === user?.id)?.role;
  const isAdmin = currentUserRole === 'admin';
  const isTreasurer = currentUserRole === 'treasurer';
  const canRecordPayment = isAdmin || isTreasurer;

  // Visibilité du lien contestations
  const canSeeDisputes = team?.dispute_enabled && (
    team?.dispute_mode === 'community' || isAdmin || isTreasurer
  );
  const pendingDisputesCount = pendingDisputes?.length || 0;

  // Calcul du total des depenses
  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

  const handleRefresh = () => {
    refetch();
    refetchFines();
    refetchExpenses();
  };

  if (teamLoading) {
    return <LoadingScreen message="Chargement..." />;
  }

  if (!team) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="alert-circle-outline"
          title="Equipe non trouvee"
          description="Cette equipe n'existe pas ou vous n'y avez pas acces"
          actionLabel="Retour"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  // Utiliser les stats pour les totaux (total_collected vient de total_paid des membres)
  const totalPot = Number(stats?.total_pot || 0);
  const totalCollected = Number(stats?.total_collected || 0);
  const finesRemaining = Math.max(0, totalPot - totalCollected);
  const progress = totalPot > 0 ? (totalCollected / totalPot) * 100 : 0;

  // Solde reel de la caisse = collecte - depenses
  const realBalance = totalCollected - totalExpenses;

  const handleShareInvite = async () => {
    try {
      await Share.share({
        message: `Rejoins "${team.name}" sur Kotiz ! Code: ${team.invite_code}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleCopyInviteCode = async () => {
    if (!team?.invite_code) return;
    try {
      await Clipboard.setStringAsync(team.invite_code);
      // Simple feedback - on mobile the share sheet works better
      if (Platform.OS === 'web') {
        alert('Code copie !');
      }
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: team.name,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerLeftBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/team-settings', params: { teamId: id } })}
                  style={styles.headerBtn}
                >
                  <Ionicons name="settings-outline" size={24} color={Colors.text} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleShareInvite} style={styles.headerBtn}>
                <Ionicons name="share-outline" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >
        {/* POT DISPLAY */}
        <View style={styles.potSection}>
          <View style={styles.potContainer}>
            <View style={styles.potOuter}>
              {/* SVG Progress Circle */}
              <Svg width={POT_SIZE} height={POT_SIZE} style={styles.svgCircle}>
                {/* Background circle (remaining/warning - yellow) */}
                <Circle
                  cx={POT_SIZE / 2}
                  cy={POT_SIZE / 2}
                  r={(POT_SIZE - 16) / 2}
                  stroke={Colors.warning}
                  strokeWidth={8}
                  fill="none"
                />
                {/* Progress circle (paid/success - green) */}
                <Circle
                  cx={POT_SIZE / 2}
                  cy={POT_SIZE / 2}
                  r={(POT_SIZE - 16) / 2}
                  stroke={Colors.success}
                  strokeWidth={8}
                  fill="none"
                  strokeDasharray={`${Math.PI * (POT_SIZE - 16)}`}
                  strokeDashoffset={Math.PI * (POT_SIZE - 16) * (1 - progress / 100)}
                  strokeLinecap="round"
                  rotation="-90"
                  origin={`${POT_SIZE / 2}, ${POT_SIZE / 2}`}
                />
              </Svg>
              <View style={styles.potInner}>
                <Text style={styles.potAmount}>{totalPot.toFixed(0)}€</Text>
                <Text style={styles.potLabel}>dans la caisse</Text>
              </View>
            </View>
          </View>

          <View style={styles.potStats}>
            <View style={styles.potStatItem}>
              <View style={[styles.potStatDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.potStatValue}>{totalCollected.toFixed(0)}€</Text>
              <Text style={styles.potStatLabel}>collecte</Text>
            </View>
            {totalExpenses > 0 && (
              <View style={styles.potStatItem}>
                <View style={[styles.potStatDot, { backgroundColor: Colors.secondary }]} />
                <Text style={styles.potStatValue}>-{totalExpenses.toFixed(0)}€</Text>
                <Text style={styles.potStatLabel}>depenses</Text>
              </View>
            )}
            <View style={styles.potStatItem}>
              <View style={[styles.potStatDot, { backgroundColor: Colors.warning }]} />
              <Text style={styles.potStatValue}>{finesRemaining.toFixed(0)}€</Text>
              <Text style={styles.potStatLabel}>impaye</Text>
            </View>
          </View>
          {/* Solde reel si des depenses ont ete faites */}
          {totalExpenses > 0 && (
            <View style={styles.realBalanceRow}>
              <Text style={styles.realBalanceLabel}>Solde disponible:</Text>
              <Text style={[styles.realBalanceValue, realBalance < 0 && styles.realBalanceNegative]}>
                {realBalance.toFixed(0)}€
              </Text>
            </View>
          )}
        </View>

        {/* CLOSED BANNER */}
        {team.is_closed && (
          <View style={styles.closedBanner}>
            <Ionicons name="lock-closed" size={16} color={Colors.warning} />
            <Text style={styles.closedBannerText}>Cette cagnotte est close</Text>
          </View>
        )}

        {/* QUICK ACTIONS */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, team.is_closed && styles.actionBtnDisabled]}
            onPress={() => !team.is_closed && router.push({ pathname: '/add-fine', params: { teamId: id } })}
            disabled={team.is_closed}
          >
            <View style={[styles.actionIcon, { backgroundColor: team.is_closed ? Colors.textMuted + '20' : Colors.error + '20' }]}>
              <Ionicons name={team.is_closed ? 'lock-closed' : 'add'} size={24} color={team.is_closed ? Colors.textMuted : Colors.error} />
            </View>
            <Text style={[styles.actionLabel, team.is_closed && styles.actionLabelDisabled]}>Amende</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push({ pathname: '/rules', params: { teamId: id } })}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.primary + '20' }]}>
              <Ionicons name="list" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Regles</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleShareInvite}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.success + '20' }]}>
              <Ionicons name="person-add" size={24} color={Colors.success} />
            </View>
            <Text style={styles.actionLabel}>Inviter</Text>
          </TouchableOpacity>

          {canRecordPayment && (
            <TouchableOpacity
              style={[styles.actionBtn, team.is_closed && styles.actionBtnDisabled]}
              onPress={() => !team.is_closed && router.push({ pathname: '/add-expense', params: { teamId: id } })}
              disabled={team.is_closed}
            >
              <View style={[styles.actionIcon, { backgroundColor: team.is_closed ? Colors.textMuted + '20' : Colors.secondary + '20' }]}>
                <Ionicons name={team.is_closed ? 'lock-closed' : 'remove'} size={24} color={team.is_closed ? Colors.textMuted : Colors.secondary} />
              </View>
              <Text style={[styles.actionLabel, team.is_closed && styles.actionLabelDisabled]}>Depense</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* FINES LINK */}
        <TouchableOpacity
          style={styles.sectionLink}
          onPress={() => router.push({ pathname: '/fines', params: { teamId: id } })}
        >
          <View style={styles.sectionLinkLeft}>
            <View style={[styles.sectionLinkIcon, { backgroundColor: Colors.secondary + '20' }]}>
              <Ionicons name="receipt" size={20} color={Colors.secondary} />
            </View>
            <View>
              <Text style={styles.sectionLinkTitle}>Amendes</Text>
              <Text style={styles.sectionLinkSubtitle}>
                {fines?.length || 0} amende{(fines?.length || 0) > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <View style={styles.sectionLinkRight}>
            {pendingDisputesCount > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingDisputesCount}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* LEADERBOARD */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Classement des taxes</Text>
          {members && members.length > 0 ? (
            <View style={styles.leaderboard}>
              {/* Fusionner leaderboard avec les membres pour afficher tout le monde */}
              {(() => {
                // Créer une map du leaderboard par user_id
                const leaderboardMap = new Map(
                  (leaderboard || []).map(entry => [entry.user_id, entry])
                );

                // Combiner tous les membres avec leurs données de leaderboard
                const allMembers = members.map(member => {
                  const leaderEntry = leaderboardMap.get(member.user_id);
                  return {
                    user_id: member.user_id,
                    display_name: member.display_name,
                    avatar_url: member.avatar_url,
                    total_fines: Number(leaderEntry?.total_fines || 0),
                    amount_paid: Number(leaderEntry?.amount_paid || 0),
                    credit: Number(leaderEntry?.credit || 0),
                    is_deleted: member.is_deleted || false,
                  };
                });

                // Trier par total_fines décroissant
                allMembers.sort((a, b) => b.total_fines - a.total_fines);

                return allMembers.map((entry) => {
                  const totalFines = entry.total_fines || 0;
                  const amountPaid = entry.amount_paid || 0;
                  const amountDue = totalFines - amountPaid;
                  const isPaidUp = amountDue <= 0;
                  const isDeleted = entry.is_deleted;
                  const isCurrentUser = entry.user_id === user?.id;

                  return (
                    <View key={entry.user_id} style={[styles.leaderItem, isDeleted && styles.leaderItemDeleted, isCurrentUser && styles.leaderItemCurrentUser]}>
                      <View style={isDeleted ? styles.leaderAvatarDeleted : undefined}>
                        <Avatar source={entry.avatar_url} name={entry.display_name} size="sm" />
                      </View>
                      <View style={styles.leaderNameContainer}>
                        <Text style={[styles.leaderName, isDeleted && styles.leaderNameDeleted, isCurrentUser && styles.leaderNameCurrentUser]} numberOfLines={1}>
                          {entry.display_name}
                        </Text>
                        {(entry.credit || 0) > 0 && (
                          <View style={styles.creditBadge}>
                            <Text style={styles.creditBadgeText}>+{entry.credit.toFixed(0)}€</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.leaderAmountsInline}>
                        <Text style={[styles.leaderAmountValue, isCurrentUser && styles.leaderAmountCurrentUser]}>{totalFines.toFixed(0)}€</Text>
                        <Text style={[styles.leaderAmountValue, styles.leaderAmountPaid]}>{amountPaid.toFixed(0)}€</Text>
                        <Text style={[styles.leaderAmountValue, styles.leaderAmountDue]}>{amountDue.toFixed(0)}€</Text>
                      </View>
                      <View style={styles.leaderActions}>
                        {/* Bouton ajouter amende */}
                        {!isDeleted && !team.is_closed && (
                          <TouchableOpacity
                            style={styles.addFineBtn}
                            onPress={() => router.push({
                              pathname: '/add-fine',
                              params: {
                                teamId: id,
                                preselectedUserId: entry.user_id,
                                preselectedUserName: entry.display_name
                              }
                            })}
                          >
                            <Ionicons name="add" size={16} color={Colors.error} />
                          </TouchableOpacity>
                        )}
                        {/* Bouton paiement - toujours visible pour admin/tresorier */}
                        {canRecordPayment && !isDeleted && (
                          <TouchableOpacity
                            style={styles.paymentBtn}
                            onPress={() => router.push({
                              pathname: '/record-payment',
                              params: {
                                teamId: id,
                                memberId: entry.user_id,
                                memberName: entry.display_name,
                                amountDue: amountDue.toFixed(2),
                                totalPaid: amountPaid.toFixed(2)
                              }
                            })}
                          >
                            <Ionicons name="cash-outline" size={16} color={Colors.success} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                });
              })()}
            </View>
          ) : (
            <Text style={styles.emptyText}>Aucun membre</Text>
          )}
        </View>

        {/* MEMBERS & PAYMENT INFO ROW */}
        <View style={styles.bottomLinksRow}>
          <TouchableOpacity
            style={styles.bottomLinkHalf}
            onPress={() => router.push({ pathname: '/members', params: { teamId: id } })}
          >
            <View style={[styles.bottomLinkIcon, { backgroundColor: Colors.success + '20' }]}>
              <Ionicons name="people" size={20} color={Colors.success} />
            </View>
            <View style={styles.bottomLinkInfo}>
              <Text style={styles.bottomLinkTitle}>Membres</Text>
              <Text style={styles.bottomLinkSubtitle}>
                {members?.length || 0} membre{(members?.length || 0) > 1 ? 's' : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomLinkHalf}
            onPress={() => router.push({ pathname: '/payment-info', params: { teamId: id } })}
          >
            <View style={[styles.bottomLinkIcon, { backgroundColor: Colors.primary + '20' }]}>
              <Ionicons name="wallet-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.bottomLinkInfo}>
              <Text style={styles.bottomLinkTitle}>Payer</Text>
              <Text style={styles.bottomLinkSubtitle}>Infos de paiement</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* EXPENSES LINK */}
        <TouchableOpacity
          style={styles.sectionLink}
          onPress={() => router.push({ pathname: '/expenses', params: { teamId: id } })}
        >
          <View style={styles.sectionLinkLeft}>
            <View style={[styles.sectionLinkIcon, { backgroundColor: Colors.secondary + '20' }]}>
              <Ionicons name="trending-down" size={20} color={Colors.secondary} />
            </View>
            <View>
              <Text style={styles.sectionLinkTitle}>Depenses</Text>
              <Text style={styles.sectionLinkSubtitle}>
                {expenses && expenses.length > 0
                  ? `${expenses.length} depense${expenses.length > 1 ? 's' : ''} - ${totalExpenses.toFixed(0)}€`
                  : 'Aucune depense'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* INVITE CODE */}
        <TouchableOpacity style={styles.inviteCard} onPress={handleCopyInviteCode}>
          <Ionicons name="qr-code-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.inviteCode}>{team.invite_code}</Text>
          <Ionicons name="copy-outline" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: Spacing.xxl,
  },
  headerLeftBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  headerBtn: {
    padding: Spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginRight: Spacing.sm,
  },

  // CLOSED BANNER
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warning + '20',
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  closedBannerText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.warning,
  },

  // POT
  potSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.backgroundLight,
  },
  potContainer: {
    marginBottom: Spacing.lg,
  },
  potOuter: {
    width: POT_SIZE,
    height: POT_SIZE,
    borderRadius: POT_SIZE / 2,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgCircle: {
    position: 'absolute',
  },
  potInner: {
    alignItems: 'center',
  },
  potAmount: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.text,
  },
  potLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  potStats: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  potStatItem: {
    alignItems: 'center',
  },
  potStatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  potStatValue: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  potStatLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  realBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  realBalanceLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  realBalanceValue: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.success,
  },
  realBalanceNegative: {
    color: Colors.error,
  },

  // ACTIONS
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionBtn: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  actionLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionLabelDisabled: {
    color: Colors.textMuted,
  },

  // INVITE
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
  },
  inviteCode: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 2,
  },

  // SECTIONS
  section: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  seeAll: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  emptyText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },

  // LEADERBOARD
  leaderboard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  leaderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  leaderItemDeleted: {
    opacity: 0.6,
  },
  leaderItemCurrentUser: {
    backgroundColor: Colors.primary + '15',
  },
  leaderAvatarDeleted: {
    opacity: 0.5,
  },
  leaderNameDeleted: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  leaderNameContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  leaderName: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  leaderNameCurrentUser: {
    fontWeight: '700',
    color: Colors.primary,
  },
  leaderAmountCurrentUser: {
    fontWeight: '700',
  },
  creditBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  creditBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.primary,
  },
  leaderAmountsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginRight: Spacing.md,
  },
  leaderAmountValue: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  leaderAmountPaid: {
    color: Colors.success,
  },
  leaderAmountDue: {
    color: Colors.warning,
  },
  leaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  addFineBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.error + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentBtnDisabled: {
    backgroundColor: Colors.border,
    opacity: 0.5,
  },

  // FINES
  finesList: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  fineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fineInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  fineName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  fineReason: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  fineAmountContainer: {
    alignItems: 'flex-end',
  },
  fineAmount: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
  },
  fineStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },

  // SECTION LINKS
  sectionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundLight,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  sectionLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  sectionLinkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLinkTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  sectionLinkSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sectionLinkRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pendingBadge: {
    backgroundColor: Colors.warning,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // BOTTOM LINKS ROW (Members + Payment Info)
  bottomLinksRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  bottomLinkHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  bottomLinkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomLinkInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  bottomLinkTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  bottomLinkSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
});
