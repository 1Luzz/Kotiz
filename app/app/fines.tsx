import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFines, useDeleteFine } from '@/hooks/useFines';
import { useTeam, useTeamMembers, useTeamStats, useTeamLeaderboard } from '@/hooks/useTeams';
import { useTeamDisputedFineIds, usePendingDisputes } from '@/hooks/useDisputes';
import { useSendFineReminder } from '@/hooks/useNotifications';
import { useAuthStore } from '@/lib/store';
import { Avatar, EmptyState, LoadingScreen } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { FineWithDetails } from '@/types/database';

export default function FinesScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { user } = useAuthStore();

  const { data: team } = useTeam(teamId);
  const { data: fines, isLoading } = useFines(teamId);
  const { data: members } = useTeamMembers(teamId);
  const { data: stats } = useTeamStats(teamId);
  const { data: leaderboard } = useTeamLeaderboard(teamId, 100);
  const deleteFine = useDeleteFine();
  const sendReminder = useSendFineReminder();
  const { data: disputedFineIds } = useTeamDisputedFineIds(teamId);
  const { data: pendingDisputes } = usePendingDisputes(teamId);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedFine, setSelectedFine] = useState<FineWithDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const currentUserRole = members?.find((m) => m.user_id === user?.id)?.role;
  const isAdmin = currentUserRole === 'admin';
  const isTreasurer = currentUserRole === 'treasurer';
  const canSendReminder = isAdmin || isTreasurer;

  // Visibilité du bouton contestations:
  // - Mode simple: visible uniquement pour admin/tresorier
  // - Mode communautaire: visible pour tous les membres
  const canSeeDisputes = team?.dispute_enabled && (
    team?.dispute_mode === 'community' || isAdmin || isTreasurer
  );
  const pendingDisputesCount = pendingDisputes?.length || 0;

  // Compter les amendes par utilisateur
  const fineCountByUser = useMemo(() => {
    const countMap = new Map<string, number>();
    fines?.forEach((fine) => {
      countMap.set(fine.offender_id, (countMap.get(fine.offender_id) || 0) + 1);
    });
    return countMap;
  }, [fines]);

  // Tous les membres de l'équipe avec leur nombre d'amendes
  const allMembersWithFineCount = useMemo(() => {
    if (!members) return [];
    return members
      .map((m) => ({
        id: m.user_id,
        name: m.display_name,
        avatar: m.avatar_url,
        count: fineCountByUser.get(m.user_id) || 0,
      }))
      .sort((a, b) => b.count - a.count); // Trier par nombre d'amendes décroissant
  }, [members, fineCountByUser]);

  // Info de l'utilisateur courant
  const currentUserInfo = useMemo(() => {
    return allMembersWithFineCount.find(u => u.id === user?.id);
  }, [allMembersWithFineCount, user]);

  // Filtrer les membres basé sur la recherche (excluant l'utilisateur courant qui est affiché séparément)
  const filteredMembers = useMemo(() => {
    const otherMembers = allMembersWithFineCount.filter(u => u.id !== user?.id);
    if (!searchQuery.trim()) {
      return otherMembers;
    }
    return otherMembers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allMembersWithFineCount, searchQuery, user]);

  // Filter fines by selected user
  const filteredFines = useMemo(() => {
    if (!fines) return [];
    if (!selectedUserId) return fines;
    return fines.filter((f) => f.offender_id === selectedUserId);
  }, [fines, selectedUserId]);

  const handleDelete = (fine: FineWithDetails) => {
    setSelectedFine(fine);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedFine) return;
    try {
      await deleteFine.mutateAsync({ fineId: selectedFine.id, teamId });
      setShowDeleteModal(false);
      setSelectedFine(null);
    } catch (error) {
      alert('Impossible de supprimer l\'amende');
    }
  };

  const handleSendReminder = (fine: FineWithDetails) => {
    setSelectedFine(fine);
    setShowReminderModal(true);
  };

  const confirmSendReminder = async () => {
    if (!selectedFine) return;
    try {
      await sendReminder.mutateAsync({ fineId: selectedFine.id });
      setShowReminderModal(false);
      setSelectedFine(null);
      alert('Rappel envoye');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur';
      alert(message);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Chargement..." />;
  }

  const renderFine = ({ item }: { item: FineWithDetails }) => {
    const existingDisputeStatus = disputedFineIds?.get(item.id);
    const hasActiveDispute = existingDisputeStatus === 'pending';
    const isOffender = item.offender_id === user?.id;
    const canDispute = team?.dispute_enabled && isOffender && !existingDisputeStatus && item.status !== 'paid';

    return (
      <View style={styles.fineCard}>
        <Avatar source={item.offender_avatar} name={item.offender_name} size="md" />
        <View style={styles.fineInfo}>
          <View style={styles.fineNameRow}>
            <Text style={styles.fineName}>{item.offender_name}</Text>
            {hasActiveDispute && (
              <View style={styles.disputeBadge}>
                <Ionicons name="flag" size={10} color={Colors.warning} />
                <Text style={styles.disputeBadgeText}>Contestee</Text>
              </View>
            )}
          </View>
          <Text style={styles.fineReason} numberOfLines={2}>
            {item.custom_label || item.rule_label}
          </Text>
          <Text style={styles.fineDate}>
            {new Date(item.created_at).toLocaleDateString('fr-FR')}
          </Text>
        </View>
        <View style={styles.fineRight}>
          <Text style={styles.fineAmount}>{Number(item.amount).toFixed(0)}€</Text>
          <View style={styles.actionBtns}>
            {canDispute && (
              <TouchableOpacity
                style={styles.disputeBtn}
                onPress={() => router.push({ pathname: '/dispute', params: { fineId: item.id, teamId } })}
              >
                <Ionicons name="flag-outline" size={16} color={Colors.warning} />
              </TouchableOpacity>
            )}
            {canSendReminder && (
              <TouchableOpacity
                style={styles.reminderBtn}
                onPress={() => handleSendReminder(item)}
              >
                <Ionicons name="notifications-outline" size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
            {isAdmin && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Calculer les totaux en utilisant le leaderboard pour les données de paiement par membre
  const totalAmount = filteredFines?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;
  const paidAmount = selectedUserId
    ? Number(leaderboard?.find(entry => entry.user_id === selectedUserId)?.amount_paid || 0)
    : Number(stats?.total_collected || 0);

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Amendes',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtnLeft}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerRightContainer}>
              {canSeeDisputes && (
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/disputes', params: { teamId } })}
                  style={styles.headerBtnRight}
                >
                  <Ionicons name="flag" size={22} color={Colors.warning} />
                  {pendingDisputesCount > 0 && (
                    <View style={styles.disputeBadgeCount}>
                      <Text style={styles.disputeBadgeCountText}>{pendingDisputesCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/add-fine', params: { teamId } })}
                style={styles.headerBtnRight}
              >
                <Ionicons name="add" size={28} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <FlatList
        data={filteredFines}
        keyExtractor={(item) => item.id}
        renderItem={renderFine}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title={selectedUserId ? "Aucune amende pour ce membre" : "Aucune amende"}
            description={selectedUserId ? "Ce membre n'a pas d'amendes" : "Les amendes de l'equipe apparaitront ici"}
            actionLabel={selectedUserId ? "Voir toutes les amendes" : "Ajouter une amende"}
            onAction={selectedUserId
              ? () => setSelectedUserId(null)
              : () => router.push({ pathname: '/add-fine', params: { teamId } })
            }
          />
        }
        ListHeaderComponent={
          fines && fines.length > 0 ? (
            <View style={styles.headerContainer}>
              <Text style={styles.header}>
                {filteredFines.length} amende{filteredFines.length > 1 ? 's' : ''}
                {selectedUserId && ` pour ${allMembersWithFineCount.find(u => u.id === selectedUserId)?.name}`}
              </Text>

              {/* User Filter Selector */}
              {allMembersWithFineCount.length > 1 && (
                <TouchableOpacity
                  style={styles.filterSelector}
                  onPress={() => setShowFilterModal(true)}
                >
                  <Ionicons name="person-outline" size={16} color={selectedUserId ? Colors.primary : Colors.textSecondary} />
                  <Text style={[styles.filterSelectorText, selectedUserId && styles.filterSelectorTextActive]}>
                    {selectedUserId
                      ? allMembersWithFineCount.find(u => u.id === selectedUserId)?.name || 'Tous'
                      : 'Tous les membres'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              )}

              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{totalAmount.toFixed(0)}€</Text>
                  <Text style={styles.summaryLabel}>Total</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: Colors.success }]}>{paidAmount.toFixed(0)}€</Text>
                  <Text style={styles.summaryLabel}>Paye</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: Colors.warning }]}>{Math.max(0, totalAmount - paidAmount).toFixed(0)}€</Text>
                  <Text style={styles.summaryLabel}>Reste</Text>
                </View>
              </View>
            </View>
          ) : null
        }
      />

      {/* FILTER MODAL */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowFilterModal(false);
          setSearchQuery('');
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowFilterModal(false);
            setSearchQuery('');
          }}
        >
          <View style={styles.filterModalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.filterModalTitle}>Filtrer par membre</Text>

            {/* Option "Tous" */}
            <TouchableOpacity
              style={[styles.filterOption, !selectedUserId && styles.filterOptionActive]}
              onPress={() => {
                setSelectedUserId(null);
                setShowFilterModal(false);
                setSearchQuery('');
              }}
            >
              <View style={styles.filterOptionLeft}>
                <Ionicons name="people" size={20} color={!selectedUserId ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.filterOptionText, !selectedUserId && styles.filterOptionTextActive]}>
                  Tous les membres
                </Text>
              </View>
              <Text style={styles.filterOptionCount}>{fines?.length || 0}</Text>
            </TouchableOpacity>

            {/* Option "Mes amendes" - bouton rapide toujours affiché */}
            {currentUserInfo && (
              <TouchableOpacity
                style={[styles.filterOption, styles.filterOptionMe, selectedUserId === user?.id && styles.filterOptionActive]}
                onPress={() => {
                  setSelectedUserId(user?.id || null);
                  setShowFilterModal(false);
                  setSearchQuery('');
                }}
              >
                <View style={styles.filterOptionLeft}>
                  <Ionicons name="person-circle" size={24} color={selectedUserId === user?.id ? Colors.primary : Colors.secondary} />
                  <Text style={[styles.filterOptionText, styles.filterOptionTextMe, selectedUserId === user?.id && styles.filterOptionTextActive]} numberOfLines={1}>
                    Mes amendes
                  </Text>
                </View>
                <Text style={[styles.filterOptionCount, currentUserInfo.count === 0 && styles.filterOptionCountZero]}>
                  {currentUserInfo.count}
                </Text>
              </TouchableOpacity>
            )}

            {/* Barre de recherche */}
            {allMembersWithFineCount.length > 3 && (
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher un membre..."
                  placeholderTextColor={Colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Liste des autres membres */}
            <ScrollView style={styles.filterScrollList} showsVerticalScrollIndicator={false}>
              {filteredMembers.map((memberItem) => (
                <TouchableOpacity
                  key={memberItem.id}
                  style={[styles.filterOption, selectedUserId === memberItem.id && styles.filterOptionActive]}
                  onPress={() => {
                    setSelectedUserId(memberItem.id);
                    setShowFilterModal(false);
                    setSearchQuery('');
                  }}
                >
                  <View style={styles.filterOptionLeft}>
                    <Avatar source={memberItem.avatar} name={memberItem.name} size="xs" />
                    <Text style={[styles.filterOptionText, selectedUserId === memberItem.id && styles.filterOptionTextActive]} numberOfLines={1}>
                      {memberItem.name}
                    </Text>
                  </View>
                  <Text style={[styles.filterOptionCount, memberItem.count === 0 && styles.filterOptionCountZero]}>
                    {memberItem.count}
                  </Text>
                </TouchableOpacity>
              ))}
              {filteredMembers.length === 0 && searchQuery.length > 0 && (
                <Text style={styles.noResultsText}>Aucun membre trouve</Text>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* DELETE MODAL */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Supprimer l'amende</Text>
            <Text style={styles.modalText}>
              Voulez-vous vraiment supprimer cette amende de {selectedFine?.amount}€ pour {selectedFine?.offender_name} ?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={confirmDelete}
              >
                <Text style={styles.modalBtnConfirmText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* REMINDER MODAL */}
      <Modal
        visible={showReminderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReminderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Envoyer un rappel</Text>
            <Text style={styles.modalText}>
              Envoyer un rappel de paiement a {selectedFine?.offender_name} pour cette amende de {Number(selectedFine?.amount || 0).toFixed(0)}€ ?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowReminderModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={confirmSendReminder}
              >
                <Text style={styles.modalBtnConfirmText}>Envoyer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerBtnLeft: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerBtnRight: {
    padding: Spacing.xs,
    position: 'relative',
  },
  disputeBadgeCount: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  disputeBadgeCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    flexGrow: 1,
  },
  headerContainer: {
    marginBottom: Spacing.md,
  },
  header: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  filterSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterSelectorText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  filterSelectorTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  filterModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    width: '85%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  filterModalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  filterOptionActive: {
    backgroundColor: Colors.primary + '15',
  },
  filterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  filterOptionText: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  filterOptionTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  filterOptionCount: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  filterOptionCountZero: {
    color: Colors.textMuted,
    opacity: 0.5,
  },
  filterOptionMe: {
    backgroundColor: Colors.primary + '08',
    marginBottom: Spacing.xs,
  },
  filterOptionTextMe: {
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
    paddingVertical: Spacing.xs,
  },
  filterScrollList: {
    maxHeight: 250,
  },
  noResultsText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  summaryLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  fineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  fineInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  fineName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  fineReason: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  fineDate: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  fineRight: {
    alignItems: 'flex-end',
  },
  fineAmount: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.secondary,
  },
  actionBtns: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  reminderBtn: {
    padding: Spacing.xs,
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.sm,
  },
  deleteBtn: {
    padding: Spacing.xs,
  },
  disputeBtn: {
    padding: Spacing.xs,
    backgroundColor: Colors.warning + '15',
    borderRadius: BorderRadius.sm,
  },
  fineNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  disputeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 2,
  },
  disputeBadgeText: {
    fontSize: 10,
    color: Colors.warning,
    fontWeight: '600',
  },
  // Modal styles
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
    marginBottom: Spacing.xl,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
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
    backgroundColor: Colors.error,
  },
  modalBtnPrimary: {
    backgroundColor: Colors.primary,
  },
  modalBtnConfirmText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
