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
import { useCreateFineRule } from '@/hooks/useFines';
import { Button, Input, useToast } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { FineCategory } from '@/types/database';
import { getCategoryColor, CategoryLabels } from '@/constants/theme';

const CATEGORIES: { id: FineCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'retard', label: 'Retard', icon: 'time-outline' },
  { id: 'absence', label: 'Absence', icon: 'close-circle-outline' },
  { id: 'materiel', label: 'Materiel', icon: 'shirt-outline' },
  { id: 'comportement', label: 'Comportement', icon: 'warning-outline' },
  { id: 'performance', label: 'Performance', icon: 'trending-down-outline' },
  { id: 'autre', label: 'Autre', icon: 'ellipsis-horizontal' },
];

const QUICK_AMOUNTS = [1, 2, 5, 10, 20];

export default function AddRuleScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const toast = useToast();

  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<FineCategory>('autre');

  const createRule = useCreateFineRule();

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleSubmit = async () => {
    if (!label.trim()) {
      toast.showError('Le nom de la regle est requis');
      return;
    }

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.showError('Le montant doit etre superieur a 0');
      return;
    }

    try {
      await createRule.mutateAsync({
        teamId,
        label: label.trim(),
        amount: numAmount,
        category,
      });

      toast.showSuccess('Regle creee avec succes !');
      router.back();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la creation';
      toast.showError(message);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Nouvelle regle',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtnLeft}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* NOM */}
        <View style={styles.section}>
          <Text style={styles.label}>Nom de la regle</Text>
          <Input
            placeholder="Ex: Retard a l'entrainement"
            value={label}
            onChangeText={setLabel}
            maxLength={100}
          />
        </View>

        {/* MONTANT */}
        <View style={styles.section}>
          <Text style={styles.label}>Montant</Text>

          <View style={styles.quickAmounts}>
            {QUICK_AMOUNTS.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.quickAmountBtn,
                  amount === value.toString() && styles.quickAmountBtnActive,
                ]}
                onPress={() => handleQuickAmount(value)}
              >
                <Text
                  style={[
                    styles.quickAmountText,
                    amount === value.toString() && styles.quickAmountTextActive,
                  ]}
                >
                  {value}€
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            placeholder="Ou entrez un montant personnalise"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            leftIcon="cash-outline"
          />
        </View>

        {/* CATEGORIE */}
        <View style={styles.section}>
          <Text style={styles.label}>Categorie</Text>

          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              const color = getCategoryColor(cat.id);

              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryBtn,
                    isSelected && { borderColor: color, backgroundColor: color + '15' },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Ionicons
                    name={cat.icon}
                    size={24}
                    color={isSelected ? color : Colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.categoryLabel,
                      isSelected && { color },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* PREVIEW */}
        {label.trim() && amount && (
          <View style={styles.preview}>
            <View style={[styles.previewDot, { backgroundColor: getCategoryColor(category) }]} />
            <Text style={styles.previewLabel}>{label}</Text>
            <Text style={styles.previewAmount}>{parseFloat(amount).toFixed(2)}€</Text>
          </View>
        )}

        {/* SUBMIT */}
        <Button
          title="Creer la regle"
          onPress={handleSubmit}
          loading={createRule.isPending}
          fullWidth
          disabled={!label.trim() || !amount}
          style={styles.submitBtn}
        />

        <Text style={styles.hint}>
          Cette regle sera disponible pour tous les membres de l'equipe lors de l'ajout d'amendes.
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  headerBtnLeft: {
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
  section: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickAmountBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickAmountBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  quickAmountText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  quickAmountTextActive: {
    color: Colors.primary,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryBtn: {
    width: '31%',
    aspectRatio: 1.2,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  previewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  previewLabel: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  previewAmount: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.secondary,
  },
  submitBtn: {
    marginBottom: Spacing.md,
  },
  hint: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
