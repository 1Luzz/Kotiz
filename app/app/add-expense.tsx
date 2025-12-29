import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTeam } from '@/hooks/useTeams';
import { useCreateExpense, ExpenseCategory, ExpenseCategoryLabels } from '@/hooks/useExpenses';
import { Button, Input, Card, EmptyState, useToast } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

const expenseCategories: ExpenseCategory[] = ['nourriture', 'boisson', 'materiel', 'evenement', 'autre'];

const categoryIcons: Record<ExpenseCategory, string> = {
  nourriture: 'fast-food-outline',
  boisson: 'beer-outline',
  materiel: 'football-outline',
  evenement: 'calendar-outline',
  autre: 'ellipsis-horizontal-outline',
};

export default function AddExpenseScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const toast = useToast();
  const { data: team, isLoading: teamLoading } = useTeam(teamId);
  const createExpense = useCreateExpense();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('autre');

  // Bloquer si la cagnotte est close
  if (!teamLoading && team?.is_closed) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTitle: 'Nouvelle depense',
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
            description="Cette cagnotte est close. Plus aucune depense ne peut etre enregistree."
            actionLabel="Retour"
            onAction={() => router.back()}
          />
        </View>
      </>
    );
  }

  const parsedAmount = parseFloat(amount) || 0;

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.showError('Entrez une description pour la depense');
      return;
    }

    if (!amount || parsedAmount <= 0) {
      toast.showError('Entrez un montant valide');
      return;
    }

    try {
      await createExpense.mutateAsync({
        teamId,
        amount: parsedAmount,
        description: description.trim(),
        category,
      });

      toast.showSuccess(`Depense enregistree ! ${parsedAmount.toFixed(2)}€ pour "${description}"`);
      router.replace({ pathname: '/team/[id]', params: { id: teamId } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement';
      toast.showError(message);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Nouvelle depense',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Étape 1: Montant */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Combien ?</Text>
          <Card style={styles.amountCard}>
            <View style={styles.amountContainer}>
              <Input
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                style={styles.amountInput}
              />
              <Text style={styles.euroSign}>€</Text>
            </View>
          </Card>
        </View>

        {/* Étape 2: Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Pour quoi ?</Text>
          <Input
            placeholder="Ex: Gouter apres le match"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Étape 3: Catégorie */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Categorie</Text>
          <View style={styles.categoriesGrid}>
            {expenseCategories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  category === cat && styles.categoryChipSelected,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Ionicons
                  name={categoryIcons[cat] as any}
                  size={20}
                  color={category === cat ? Colors.text : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.categoryLabel,
                    category === cat && styles.categoryLabelSelected,
                  ]}
                >
                  {ExpenseCategoryLabels[cat]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Récapitulatif */}
        {parsedAmount > 0 && description.trim() && (
          <Card style={styles.summary}>
            <Text style={styles.summaryLabel}>Recapitulatif</Text>
            <View style={styles.summaryRow}>
              <Ionicons
                name={categoryIcons[category] as any}
                size={24}
                color={Colors.secondary}
              />
              <Text style={styles.summaryText}>{description}</Text>
              <Text style={styles.summaryAmount}>{parsedAmount.toFixed(2)}€</Text>
            </View>
            <Text style={styles.summaryCategory}>
              Categorie: {ExpenseCategoryLabels[category]}
            </Text>
          </Card>
        )}

        {/* Bouton de validation */}
        <Button
          title="Enregistrer la depense"
          onPress={handleSubmit}
          loading={createExpense.isPending}
          fullWidth
          disabled={!description.trim() || parsedAmount <= 0}
          style={styles.submitButton}
        />

        {/* Note informative */}
        <Text style={styles.infoNote}>
          Cette depense sera deduite de la cagnotte et visible par tous les membres.
        </Text>
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
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  amountCard: {
    padding: Spacing.lg,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountInput: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  euroSign: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.secondary,
    marginLeft: Spacing.sm,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  categoryChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  categoryLabelSelected: {
    color: Colors.text,
  },
  summary: {
    backgroundColor: Colors.secondary + '10',
    borderWidth: 1,
    borderColor: Colors.secondary,
    marginBottom: Spacing.lg,
  },
  summaryLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  summaryAmount: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.secondary,
  },
  summaryCategory: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  infoNote: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },
});
