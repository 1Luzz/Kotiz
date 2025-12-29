import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTeam, useTeamMembers } from '@/hooks/useTeams';
import { useFineRules, useCreateFine, useCreateMultipleFines } from '@/hooks/useFines';
import { useAuthStore } from '@/lib/store';
import { Button, Input, Card, Avatar, EmptyState, useToast } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { FineRule } from '@/types/database';
import { getCategoryColor, CategoryLabels } from '@/constants/theme';

export default function AddFineScreen() {
  const { teamId, memberId, preselectedUserId } = useLocalSearchParams<{
    teamId: string;
    memberId?: string;
    preselectedUserId?: string;
  }>();
  const _user = useAuthStore((state) => state.user);
  const toast = useToast();

  // Utiliser preselectedUserId ou memberId comme valeur initiale
  const initialMemberIds = preselectedUserId ? [preselectedUserId] : memberId ? [memberId] : [];

  const { data: team, isLoading: teamLoading } = useTeam(teamId);
  const { data: members } = useTeamMembers(teamId);
  const { data: rules } = useFineRules(teamId);
  const createFine = useCreateFine();
  const createMultipleFines = useCreateMultipleFines();

  // États du formulaire - TOUS les hooks avant les conditions
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(initialMemberIds);
  const [selectedRule, setSelectedRule] = useState<FineRule | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [note, setNote] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  // Tous les membres sont disponibles (y compris l'utilisateur courant)
  const availableMembers = useMemo(() => {
    return members || [];
  }, [members]);

  // Grouper les règles par catégorie
  const rulesByCategory = useMemo(() => {
    const grouped: Record<string, FineRule[]> = {};
    rules?.forEach((rule) => {
      const category = rule.category || 'autre';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(rule);
    });
    return grouped;
  }, [rules]);

  // Membres sélectionnés
  const selectedMembers = useMemo(() => {
    return members?.filter((m) => selectedMemberIds.includes(m.user_id)) || [];
  }, [members, selectedMemberIds]);

  const finalAmount = useCustom
    ? parseFloat(customAmount) || 0
    : Number(selectedRule?.amount || 0);

  // Total pour tous les membres sélectionnés
  const totalAmount = finalAmount * selectedMemberIds.length;

  // Toggle la sélection d'un membre
  const toggleMember = useCallback((memberId: string) => {
    setSelectedMemberIds((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }
      return [...prev, memberId];
    });
  }, []);

  // Sélectionner/désélectionner tous
  const toggleSelectAll = useCallback(() => {
    if (selectedMemberIds.length === availableMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(availableMembers.map((m) => m.user_id));
    }
  }, [availableMembers, selectedMemberIds]);

  // Effacer la sélection
  const clearSelection = useCallback(() => {
    setSelectedMemberIds([]);
  }, []);

  // Bloquer si la cagnotte est close - APRES tous les hooks
  if (!teamLoading && team?.is_closed) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTitle: 'Nouvelle amende',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                <Ionicons name="close" size={28} color={Colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.container}>
          <EmptyState
            icon="lock-closed-outline"
            title="Cagnotte close"
            description="Cette cagnotte est close. Plus aucune amende ne peut etre ajoutee. Contactez un administrateur pour la reouvrir."
            actionLabel="Retour"
            onAction={() => router.back()}
          />
        </View>
      </>
    );
  }

  const handleSubmit = async () => {
    if (selectedMemberIds.length === 0) {
      toast.showError('Selectionnez au moins un membre');
      return;
    }

    if (!useCustom && !selectedRule) {
      toast.showError('Selectionnez une regle ou creez une amende personnalisee');
      return;
    }

    if (useCustom && (!customLabel.trim() || !customAmount)) {
      toast.showError('Remplissez le label et le montant');
      return;
    }

    try {
      const fineLabel = useCustom ? customLabel : selectedRule?.label;

      if (selectedMemberIds.length === 1) {
        // Une seule amende
        await createFine.mutateAsync({
          teamId,
          offenderId: selectedMemberIds[0],
          ruleId: useCustom ? undefined : selectedRule?.id,
          customLabel: useCustom ? customLabel.trim() : undefined,
          amount: useCustom ? parseFloat(customAmount) : undefined,
          note: note.trim() || undefined,
        });

        toast.showSuccess(`Amende ajoutee ! ${selectedMembers[0]?.display_name} doit ${finalAmount.toFixed(0)}€ pour "${fineLabel}"`);
      } else {
        // Plusieurs amendes
        await createMultipleFines.mutateAsync({
          teamId,
          offenderIds: selectedMemberIds,
          ruleId: useCustom ? undefined : selectedRule?.id,
          customLabel: useCustom ? customLabel.trim() : undefined,
          amount: useCustom ? parseFloat(customAmount) : undefined,
          note: note.trim() || undefined,
        });

        toast.showSuccess(`${selectedMemberIds.length} amendes ajoutees ! Total: ${totalAmount.toFixed(0)}€`);
      }

      router.replace({ pathname: '/team/[id]', params: { id: teamId } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast.showError(`Echec: ${message}`);
    }
  };

  const isLoading = createFine.isPending || createMultipleFines.isPending;

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Nouvelle amende',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Étape 1: Sélection des membres (multi-sélection) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>1. Qui a fauté ?</Text>
            {selectedMemberIds.length > 0 && (
              <View style={styles.selectionBadge}>
                <Text style={styles.selectionBadgeText}>
                  {selectedMemberIds.length} sélectionné{selectedMemberIds.length > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Actions rapides */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionBtn, selectedMemberIds.length === availableMembers.length && styles.quickActionBtnActive]}
              onPress={toggleSelectAll}
            >
              <Ionicons
                name={selectedMemberIds.length === availableMembers.length ? 'checkbox' : 'checkbox-outline'}
                size={18}
                color={selectedMemberIds.length === availableMembers.length ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.quickActionText, selectedMemberIds.length === availableMembers.length && styles.quickActionTextActive]}>
                Tout le monde
              </Text>
            </TouchableOpacity>
            {selectedMemberIds.length > 0 && (
              <TouchableOpacity style={styles.quickActionBtn} onPress={clearSelection}>
                <Ionicons name="close-circle-outline" size={18} color={Colors.error} />
                <Text style={[styles.quickActionText, { color: Colors.error }]}>Effacer</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Membres sélectionnés - affichés en haut */}
          {selectedMembers.length > 0 && (
            <View style={styles.selectedMembersContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.selectedMembersScroll}
              >
                {selectedMembers.map((member) => (
                  <TouchableOpacity
                    key={member.user_id}
                    style={styles.selectedMemberChip}
                    onPress={() => toggleMember(member.user_id)}
                  >
                    <Avatar
                      source={member.avatar_url}
                      name={member.display_name}
                      size="sm"
                    />
                    <Text style={styles.selectedMemberChipName} numberOfLines={1}>
                      {member.display_name}
                    </Text>
                    <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Grille de tous les membres */}
          <View style={styles.membersGrid}>
            {availableMembers.map((member) => {
              const isSelected = selectedMemberIds.includes(member.user_id);
              return (
                <TouchableOpacity
                  key={member.user_id}
                  style={[styles.memberGridItem, isSelected && styles.memberGridItemSelected]}
                  onPress={() => toggleMember(member.user_id)}
                >
                  <View style={styles.memberAvatarContainer}>
                    <Avatar
                      source={member.avatar_url}
                      name={member.display_name}
                      size="lg"
                    />
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={14} color={Colors.text} />
                      </View>
                    )}
                  </View>
                  <Text
                    style={[styles.memberGridName, isSelected && styles.memberGridNameSelected]}
                    numberOfLines={1}
                  >
                    {member.display_name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Étape 2: Type d'amende */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Pourquoi ?</Text>

          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[styles.typeButton, !useCustom && styles.typeButtonActive]}
              onPress={() => setUseCustom(false)}
            >
              <Text style={[styles.typeButtonText, !useCustom && styles.typeButtonTextActive]}>
                Règle existante
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, useCustom && styles.typeButtonActive]}
              onPress={() => setUseCustom(true)}
            >
              <Text style={[styles.typeButtonText, useCustom && styles.typeButtonTextActive]}>
                Personnalisée
              </Text>
            </TouchableOpacity>
          </View>

          {useCustom ? (
            <View style={styles.customForm}>
              <Input
                label="Motif de l'amende"
                placeholder="Ex: Oubli de la bière"
                value={customLabel}
                onChangeText={setCustomLabel}
              />
              <Input
                label="Montant (€)"
                placeholder="0.00"
                value={customAmount}
                onChangeText={setCustomAmount}
                keyboardType="decimal-pad"
              />
            </View>
          ) : (
            <View style={styles.rulesContainer}>
              {Object.entries(rulesByCategory).map(([category, categoryRules]) => (
                <View key={category} style={styles.categorySection}>
                  <View style={styles.categoryHeader}>
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: getCategoryColor(category) },
                      ]}
                    />
                    <Text style={styles.categoryLabel}>
                      {CategoryLabels[category] || category}
                    </Text>
                  </View>
                  <View style={styles.rulesGrid}>
                    {categoryRules.map((rule) => (
                      <TouchableOpacity
                        key={rule.id}
                        style={[
                          styles.ruleChip,
                          selectedRule?.id === rule.id && styles.ruleChipSelected,
                        ]}
                        onPress={() => setSelectedRule(rule)}
                      >
                        <Text
                          style={[
                            styles.ruleChipLabel,
                            selectedRule?.id === rule.id && styles.ruleChipLabelSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {rule.label}
                        </Text>
                        <Text
                          style={[
                            styles.ruleChipAmount,
                            selectedRule?.id === rule.id && styles.ruleChipAmountSelected,
                          ]}
                        >
                          {Number(rule.amount).toFixed(2)}€
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}

              {(!rules || rules.length === 0) && (
                <Text style={styles.noRules}>
                  Aucune règle définie. Utilisez une amende personnalisée.
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Étape 3: Commentaire optionnel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Un petit mot ? (optionnel)</Text>
          <Input
            placeholder="Ajouter un commentaire..."
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>

        {/* Récapitulatif */}
        {selectedMemberIds.length > 0 && (useCustom ? customAmount : selectedRule) && (
          <Card style={styles.summary}>
            <Text style={styles.summaryLabel}>Récapitulatif</Text>

            {selectedMemberIds.length === 1 ? (
              // Affichage simple pour 1 membre
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryText}>
                    {selectedMembers[0]?.display_name} doit
                  </Text>
                  <Text style={styles.summaryAmount}>{finalAmount.toFixed(2)}€</Text>
                </View>
                <Text style={styles.summaryReason}>
                  pour: {useCustom ? customLabel : selectedRule?.label}
                </Text>
              </>
            ) : (
              // Affichage pour plusieurs membres
              <>
                <View style={styles.summaryMultiple}>
                  <View style={styles.summaryMembersRow}>
                    <Text style={styles.summaryMultipleText}>
                      {selectedMemberIds.length} personnes
                    </Text>
                    <Text style={styles.summaryMultipleAmount}>
                      × {finalAmount.toFixed(2)}€
                    </Text>
                  </View>
                  <Text style={styles.summaryMembersList} numberOfLines={2}>
                    {selectedMembers.map((m) => m.display_name).join(', ')}
                  </Text>
                </View>
                <View style={styles.summaryTotalRow}>
                  <Text style={styles.summaryTotalLabel}>Total</Text>
                  <Text style={styles.summaryTotalAmount}>{totalAmount.toFixed(2)}€</Text>
                </View>
                <Text style={styles.summaryReason}>
                  pour: {useCustom ? customLabel : selectedRule?.label}
                </Text>
              </>
            )}
          </Card>
        )}

        {/* Bouton de validation */}
        <Button
          title={
            selectedMemberIds.length > 1
              ? `Valider les ${selectedMemberIds.length} amendes`
              : 'Valider l\'amende'
          }
          onPress={handleSubmit}
          loading={isLoading}
          fullWidth
          disabled={
            selectedMemberIds.length === 0 ||
            (!useCustom && !selectedRule) ||
            (useCustom && (!customLabel.trim() || !customAmount))
          }
          style={styles.submitButton}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  selectionBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  selectionBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.text,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionBtnActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  quickActionText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  quickActionTextActive: {
    color: Colors.primary,
    fontWeight: '500',
  },
  selectedMembersContainer: {
    marginBottom: Spacing.md,
  },
  selectedMembersScroll: {
    gap: Spacing.sm,
  },
  selectedMemberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary + '20',
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.xs,
    paddingRight: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  selectedMemberChipName: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    maxWidth: 100,
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  memberGridItem: {
    alignItems: 'center',
    width: 80,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  memberGridItemSelected: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  memberAvatarContainer: {
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  memberGridName: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  memberGridNameSelected: {
    fontWeight: '600',
    color: Colors.primary,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.md,
  },
  typeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: Colors.text,
  },
  customForm: {
    marginTop: Spacing.sm,
  },
  rulesContainer: {
    marginTop: Spacing.sm,
  },
  categorySection: {
    marginBottom: Spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  categoryLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  rulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  ruleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ruleChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  ruleChipLabel: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginRight: Spacing.sm,
  },
  ruleChipLabelSelected: {
    color: Colors.text,
  },
  ruleChipAmount: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.secondary,
  },
  ruleChipAmountSelected: {
    color: Colors.text,
  },
  noRules: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  summary: {
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: Spacing.lg,
  },
  summaryLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  summaryAmount: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.secondary,
  },
  summaryReason: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  summaryMultiple: {
    marginBottom: Spacing.sm,
  },
  summaryMembersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryMultipleText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  summaryMultipleAmount: {
    fontSize: FontSizes.md,
    color: Colors.secondary,
    fontWeight: '600',
  },
  summaryMembersList: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.primary + '30',
    marginBottom: Spacing.xs,
  },
  summaryTotalLabel: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  summaryTotalAmount: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.secondary,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
});
