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
import { useFines, useRecordPayment } from '@/hooks/useFines';
import { Button, Input, useToast } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

export default function RecordPaymentScreen() {
  const { teamId, memberId, memberName, amountDue, totalPaid: existingTotalPaid } = useLocalSearchParams<{
    teamId: string;
    memberId: string;
    memberName: string;
    amountDue: string;
    totalPaid: string;
  }>();
  const toast = useToast();

  const [amount, setAmount] = useState(amountDue || '');
  const [note, setNote] = useState('');

  const { data: fines } = useFines(teamId);
  const recordPayment = useRecordPayment();

  // Get fines for this member (for display only)
  const memberFines = fines?.filter(
    (f) => f.offender_id === memberId
  ) || [];

  const totalDue = parseFloat(amountDue || '0');
  const totalPaid = parseFloat(existingTotalPaid || '0');

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handlePayAll = () => {
    setAmount(totalDue.toFixed(2));
  };

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.showError('Le montant doit etre superieur a 0');
      return;
    }

    try {
      // Un seul appel pour enregistrer le paiement au niveau membre
      await recordPayment.mutateAsync({
        teamId,
        userId: memberId,
        amount: numAmount,
        method: 'cash',
        note: note || undefined,
      });

      const surplus = numAmount > totalDue ? numAmount - totalDue : 0;
      let message = `Paiement de ${numAmount.toFixed(2)}€ enregistre pour ${memberName}`;
      if (surplus > 0) {
        message += ` - ${surplus.toFixed(2)}€ en credit`;
      }

      toast.showSuccess(message);
      router.back();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement';
      toast.showError(message);
    }
  };

  const numAmount = parseFloat(amount) || 0;
  const surplus = numAmount > totalDue ? numAmount - totalDue : 0;
  const quickAmounts = [5, 10, 20, 50];

  // Calculer le crédit existant (si totalPaid > totalFines)
  const totalFines = memberFines.reduce((sum, f) => sum + Number(f.amount), 0);
  const existingCredit = Math.max(0, totalPaid - totalFines);

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Enregistrer un paiement',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtnLeft}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* MEMBER INFO */}
        <View style={styles.memberCard}>
          <View style={styles.memberAvatar}>
            <Ionicons name="person" size={32} color={Colors.primary} />
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{memberName}</Text>
            <Text style={styles.memberDue}>
              Doit: <Text style={styles.memberDueAmount}>{totalDue.toFixed(2)}€</Text>
            </Text>
            {totalPaid > 0 && (
              <Text style={styles.memberPaid}>
                Deja paye: <Text style={styles.memberPaidAmount}>{totalPaid.toFixed(2)}€</Text>
              </Text>
            )}
            {existingCredit > 0 && (
              <Text style={styles.memberCredit}>
                Credit: <Text style={styles.memberCreditAmount}>+{existingCredit.toFixed(2)}€</Text>
              </Text>
            )}
          </View>
        </View>

        {/* AMOUNT */}
        <View style={styles.section}>
          <Text style={styles.label}>Montant du paiement</Text>

          <View style={styles.quickAmounts}>
            {quickAmounts.map((value) => (
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
            {totalDue > 0 && (
              <TouchableOpacity
                style={[
                  styles.quickAmountBtn,
                  styles.quickAmountBtnAll,
                  amount === totalDue.toFixed(2) && styles.quickAmountBtnActive,
                ]}
                onPress={handlePayAll}
              >
                <Text
                  style={[
                    styles.quickAmountText,
                    amount === totalDue.toFixed(2) && styles.quickAmountTextActive,
                  ]}
                >
                  Tout
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Input
            placeholder="Montant"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            leftIcon="cash-outline"
          />

          {/* SURPLUS WARNING */}
          {surplus > 0 && (
            <View style={styles.surplusWarning}>
              <Ionicons name="information-circle" size={20} color={Colors.primary} />
              <Text style={styles.surplusText}>
                {surplus.toFixed(2)}€ sera ajoute en credit pour les futures amendes
              </Text>
            </View>
          )}
        </View>

        {/* NOTE */}
        <View style={styles.section}>
          <Text style={styles.label}>Note (optionnel)</Text>
          <Input
            placeholder="Ex: Paiement en especes"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* FINES LIST */}
        {memberFines.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Amendes en attente ({memberFines.length})</Text>
            <View style={styles.finesList}>
              {memberFines.map((fine) => (
                <View key={fine.id} style={styles.fineItem}>
                  <Text style={styles.fineLabel} numberOfLines={1}>
                    {fine.custom_label || fine.rule_label}
                  </Text>
                  <Text style={styles.fineAmount}>
                    {Number(fine.amount).toFixed(0)}€
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* SUBMIT */}
        <Button
          title={`Enregistrer ${amount ? parseFloat(amount).toFixed(2) + '€' : ''}`}
          onPress={handleSubmit}
          loading={recordPayment.isPending}
          fullWidth
          disabled={!amount || parseFloat(amount) <= 0}
          style={styles.submitBtn}
        />
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
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  memberAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  memberDue: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  memberDueAmount: {
    fontWeight: '700',
    color: Colors.error,
  },
  memberPaid: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  memberPaidAmount: {
    fontWeight: '700',
    color: Colors.success,
  },
  memberCredit: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  memberCreditAmount: {
    fontWeight: '700',
    color: Colors.primary,
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
  quickAmountBtnAll: {
    backgroundColor: Colors.success + '15',
  },
  quickAmountBtnActive: {
    borderColor: Colors.success,
    backgroundColor: Colors.success + '15',
  },
  quickAmountText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  quickAmountTextActive: {
    color: Colors.success,
  },
  surplusWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  surplusText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  finesList: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  fineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fineLabel: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  fineAmount: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.error,
  },
  submitBtn: {
    marginTop: Spacing.md,
  },
});
