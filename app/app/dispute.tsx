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
import { useFine } from '@/hooks/useFines';
import { useTeam } from '@/hooks/useTeams';
import { useCreateDispute } from '@/hooks/useDisputes';
import { Button, Input, Card, Avatar, LoadingScreen, useToast } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

export default function DisputeScreen() {
  const { fineId, teamId } = useLocalSearchParams<{ fineId: string; teamId: string }>();
  const toast = useToast();

  const { data: fine, isLoading: fineLoading } = useFine(teamId, fineId);
  const { data: team, isLoading: teamLoading } = useTeam(teamId);
  const createDispute = useCreateDispute();

  const [reason, setReason] = useState('');

  const isLoading = fineLoading || teamLoading;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.showError('Veuillez indiquer la raison de votre contestation');
      return;
    }

    try {
      await createDispute.mutateAsync({
        fineId,
        reason: reason.trim(),
      });

      toast.showSuccess('Contestation envoyee avec succes !');
      router.replace({ pathname: '/fines', params: { teamId } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast.showError(`Echec: ${message}`);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Chargement..." />;
  }

  if (!fine) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTitle: 'Contester une amende',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                <Ionicons name="close" size={28} color={Colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.container}>
          <Text style={styles.errorText}>Amende introuvable</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Contester une amende',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Info amende */}
        <Card style={styles.fineCard}>
          <View style={styles.fineHeader}>
            <View style={styles.fineInfo}>
              <Text style={styles.fineLabel}>{fine.custom_label || fine.rule_label}</Text>
              <Text style={styles.fineDate}>
                Le {new Date(fine.created_at).toLocaleDateString('fr-FR')}
              </Text>
            </View>
            <Text style={styles.fineAmount}>{Number(fine.amount).toFixed(0)}€</Text>
          </View>
          <View style={styles.issuedBy}>
            <Text style={styles.issuedByLabel}>Mise par :</Text>
            <Avatar source={fine.issued_by_avatar} name={fine.issued_by_name} size="xs" />
            <Text style={styles.issuedByName}>{fine.issued_by_name}</Text>
          </View>
          {fine.note && (
            <Text style={styles.fineNote}>"{fine.note}"</Text>
          )}
        </Card>

        {/* Mode de contestation */}
        <Card style={styles.modeCard}>
          <View style={styles.modeHeader}>
            <Ionicons
              name={team?.dispute_mode === 'community' ? 'people' : 'shield-checkmark'}
              size={24}
              color={Colors.primary}
            />
            <Text style={styles.modeTitle}>
              {team?.dispute_mode === 'community' ? 'Vote communautaire' : 'Examen admin'}
            </Text>
          </View>
          <Text style={styles.modeDescription}>
            {team?.dispute_mode === 'community'
              ? `Votre contestation sera soumise au vote des membres. ${team?.dispute_votes_required || 3} votes favorables sont necessaires pour annuler l'amende.`
              : 'Votre contestation sera examinee par un administrateur ou tresorier qui decidera de la valider ou non.'}
          </Text>
        </Card>

        {/* Formulaire */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Raison de la contestation</Text>
          <Text style={styles.formHint}>
            Expliquez pourquoi vous contestez cette amende. Soyez precis et factuel.
          </Text>
          <Input
            placeholder="Ex: Je n'etais pas present ce jour-la car j'etais en deplacement professionnel..."
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={5}
            style={styles.reasonInput}
            maxLength={500}
          />
          <Text style={styles.charCount}>
            {reason.length}/500 caracteres
          </Text>
        </View>

        {/* Avertissement */}
        <Card style={styles.warningCard}>
          <View style={styles.warningRow}>
            <Ionicons name="warning" size={20} color={Colors.warning} />
            <Text style={styles.warningText}>
              Une fois soumise, vous ne pourrez plus modifier votre contestation.
              {team?.dispute_mode === 'community' &&
                ' Les autres membres pourront voter pour ou contre.'}
            </Text>
          </View>
        </Card>

        <Button
          title="Soumettre la contestation"
          onPress={handleSubmit}
          loading={createDispute.isPending}
          fullWidth
          disabled={!reason.trim() || createDispute.isPending}
          style={styles.submitButton}
        />
      </ScrollView>
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
  fineCard: {
    marginBottom: Spacing.md,
  },
  fineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  fineInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  fineLabel: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  fineDate: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  fineAmount: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.secondary,
  },
  issuedBy: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.xs,
  },
  issuedByLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  issuedByName: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  fineNote: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
  },
  modeCard: {
    backgroundColor: Colors.primary + '10',
    marginBottom: Spacing.lg,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  modeTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.primary,
  },
  modeDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  form: {
    marginBottom: Spacing.lg,
  },
  formTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  formHint: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  reasonInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  warningCard: {
    backgroundColor: Colors.warning + '15',
    marginBottom: Spacing.lg,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
});
