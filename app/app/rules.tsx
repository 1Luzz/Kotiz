import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFineRules, useDeleteFineRule } from '@/hooks/useFines';
import { useTeamMembers } from '@/hooks/useTeams';
import { useAuthStore } from '@/lib/store';
import { EmptyState, LoadingScreen, useToast } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { getCategoryColor } from '@/constants/theme';
import { FineRule } from '@/types/database';

export default function RulesScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { user } = useAuthStore();
  const toast = useToast();

  const { data: rules, isLoading } = useFineRules(teamId);
  const { data: members } = useTeamMembers(teamId);
  const deleteRule = useDeleteFineRule();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<FineRule | null>(null);

  const currentUserRole = members?.find((m) => m.user_id === user?.id)?.role;
  const isAdmin = currentUserRole === 'admin';

  const handleDelete = (rule: FineRule) => {
    setRuleToDelete(rule);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!ruleToDelete) return;
    try {
      await deleteRule.mutateAsync({ ruleId: ruleToDelete.id, teamId });
      toast.showSuccess('Regle supprimee');
      setShowDeleteModal(false);
      setRuleToDelete(null);
    } catch (error) {
      toast.showError('Impossible de supprimer la regle');
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Chargement..." />;
  }

  const renderRule = ({ item }: { item: FineRule }) => {
    const categoryColor = getCategoryColor(item.category);

    return (
      <View style={styles.ruleCard}>
        <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
        <View style={styles.ruleInfo}>
          <Text style={styles.ruleLabel}>{item.label}</Text>
          <Text style={styles.ruleCategory}>{item.category}</Text>
        </View>
        <Text style={styles.ruleAmount}>{Number(item.amount).toFixed(0)}€</Text>
        {isAdmin && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Regles',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtnLeft}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () =>
            isAdmin ? (
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/add-rule', params: { teamId } })}
                style={styles.headerBtnRight}
              >
                <Ionicons name="add" size={28} color={Colors.primary} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      <FlatList
        data={rules}
        keyExtractor={(item) => item.id}
        renderItem={renderRule}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="list-outline"
            title="Aucune regle"
            description="Creez des regles pour faciliter l'ajout d'amendes"
            actionLabel={isAdmin ? "Creer une regle" : undefined}
            onAction={isAdmin ? () => router.push({ pathname: '/add-rule', params: { teamId } }) : undefined}
          />
        }
        ListHeaderComponent={
          rules && rules.length > 0 ? (
            <Text style={styles.header}>
              {rules.length} regle{rules.length > 1 ? 's' : ''}
            </Text>
          ) : null
        }
      />

      {/* Modal de confirmation de suppression */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="trash" size={40} color={Colors.error} style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Supprimer la regle ?</Text>
            <Text style={styles.modalMessage}>
              {ruleToDelete?.label}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setShowDeleteModal(false);
                  setRuleToDelete(null);
                }}
              >
                <Text style={styles.modalButtonCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={confirmDelete}
                disabled={deleteRule.isPending}
              >
                <Text style={styles.modalButtonConfirmText}>
                  {deleteRule.isPending ? '...' : 'Supprimer'}
                </Text>
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
  headerBtnRight: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    flexGrow: 1,
  },
  header: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ruleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.md,
  },
  ruleInfo: {
    flex: 1,
  },
  ruleLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  ruleCategory: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  ruleAmount: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.secondary,
    marginRight: Spacing.sm,
  },
  deleteBtn: {
    padding: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  modalMessage: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.error,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.background,
  },
});
