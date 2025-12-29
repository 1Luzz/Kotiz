import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCreateTeam } from '@/hooks/useTeams';
import { usePickImage, useUploadTeamPhoto } from '@/hooks/useImageUpload';
import { Button, Input, Card, useToast } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { FinePermission, DisputeMode } from '@/types/database';

const FINE_PERMISSIONS: { id: FinePermission; label: string; description: string }[] = [
  { id: 'everyone', label: 'Tout le monde', description: 'Tous les membres peuvent mettre des amendes' },
  { id: 'treasurer', label: 'Tresoriers & Admins', description: 'Seuls les tresoriers et admins peuvent mettre des amendes' },
  { id: 'admin_only', label: 'Admins uniquement', description: 'Seuls les admins peuvent mettre des amendes' },
];

const DISPUTE_MODES: { id: DisputeMode; label: string; description: string }[] = [
  { id: 'simple', label: 'Simple', description: 'Un admin ou tresorier examine et decide' },
  { id: 'community', label: 'Communautaire', description: 'Les membres votent pour annuler l\'amende' },
];

export default function CreateTeamScreen() {
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [allowCustomFines, setAllowCustomFines] = useState(true);
  const [finePermission, setFinePermission] = useState<FinePermission>('everyone');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  // Contestation settings
  const [disputeEnabled, setDisputeEnabled] = useState(false);
  const [disputeMode, setDisputeMode] = useState<DisputeMode>('simple');
  const [disputeVotesRequired, setDisputeVotesRequired] = useState(3);

  const createTeam = useCreateTeam();
  const pickImage = usePickImage();
  const uploadTeamPhoto = useUploadTeamPhoto();

  const handlePickImage = async () => {
    try {
      const image = await pickImage.mutateAsync();
      setSelectedImageUri(image.uri);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Sélection annulée') {
        return;
      }
      const message = error instanceof Error ? error.message : 'Erreur lors de la selection';
      toast.showError(message);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.showError('Le nom de l\'equipe est requis');
      return;
    }

    try {
      const teamId = await createTeam.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        allowCustomFines,
        finePermission,
        disputeEnabled,
        disputeMode,
        disputeVotesRequired,
      });

      // Upload la photo si sélectionnée
      if (selectedImageUri && teamId) {
        try {
          await uploadTeamPhoto.mutateAsync({ teamId, imageUri: selectedImageUri });
        } catch (photoError) {
          console.error('Erreur upload photo:', photoError);
          // Continue même si l'upload échoue
        }
      }

      toast.showSuccess('Equipe creee avec succes !');
      router.replace('/(tabs)');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la creation';
      toast.showError(message);
    }
  };

  const isSubmitting = createTeam.isPending || uploadTeamPhoto.isPending;

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Nouvelle équipe',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtnLeft}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Photo de l'équipe */}
        <View style={styles.photoSection}>
          <TouchableOpacity
            style={styles.photoSelector}
            onPress={handlePickImage}
            disabled={pickImage.isPending}
          >
            {selectedImageUri ? (
              <Image source={{ uri: selectedImageUri }} style={styles.selectedPhoto} />
            ) : (
              <View style={styles.photoPlaceholder}>
                {pickImage.isPending ? (
                  <ActivityIndicator size="small" color={Colors.textMuted} />
                ) : (
                  <>
                    <Ionicons name="camera" size={32} color={Colors.textMuted} />
                    <Text style={styles.photoPlaceholderText}>Ajouter une photo</Text>
                  </>
                )}
              </View>
            )}
            {selectedImageUri && (
              <View style={styles.photoEditBadge}>
                <Ionicons name="pencil" size={14} color={Colors.text} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.photoHint}>Optionnel</Text>
        </View>

        <View style={styles.section}>
          <Input
            label="Nom de l'équipe *"
            placeholder="Ex: Les Invincibles"
            value={name}
            onChangeText={setName}
            maxLength={50}
          />

          <Input
            label="Description"
            placeholder="Une petite description de l'équipe..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* SETTINGS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parametres</Text>

          {/* Allow custom fines */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Amendes personnalisees</Text>
              <Text style={styles.settingDesc}>Permettre de creer des amendes sans utiliser une regle</Text>
            </View>
            <Switch
              value={allowCustomFines}
              onValueChange={setAllowCustomFines}
              trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
              thumbColor={allowCustomFines ? Colors.primary : Colors.textMuted}
            />
          </View>

          {/* Fine permission */}
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>Qui peut mettre des amendes ?</Text>
            <View style={styles.permissionOptions}>
              {FINE_PERMISSIONS.map((perm) => (
                <TouchableOpacity
                  key={perm.id}
                  style={[
                    styles.permissionOption,
                    finePermission === perm.id && styles.permissionOptionActive,
                  ]}
                  onPress={() => setFinePermission(perm.id)}
                >
                  <View style={styles.permissionRadio}>
                    {finePermission === perm.id && <View style={styles.permissionRadioInner} />}
                  </View>
                  <View style={styles.permissionText}>
                    <Text style={[
                      styles.permissionLabel,
                      finePermission === perm.id && styles.permissionLabelActive,
                    ]}>
                      {perm.label}
                    </Text>
                    <Text style={styles.permissionDesc}>{perm.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Contestation */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Contestation des amendes</Text>
              <Text style={styles.settingDesc}>Permettre aux membres de contester une amende</Text>
            </View>
            <Switch
              value={disputeEnabled}
              onValueChange={setDisputeEnabled}
              trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
              thumbColor={disputeEnabled ? Colors.primary : Colors.textMuted}
            />
          </View>

          {disputeEnabled && (
            <>
              {/* Mode de contestation */}
              <View style={styles.settingSection}>
                <Text style={styles.settingLabel}>Mode de contestation</Text>
                <View style={styles.permissionOptions}>
                  {DISPUTE_MODES.map((mode) => (
                    <TouchableOpacity
                      key={mode.id}
                      style={[
                        styles.permissionOption,
                        disputeMode === mode.id && styles.permissionOptionActive,
                      ]}
                      onPress={() => setDisputeMode(mode.id)}
                    >
                      <View style={styles.permissionRadio}>
                        {disputeMode === mode.id && <View style={styles.permissionRadioInner} />}
                      </View>
                      <View style={styles.permissionText}>
                        <Text style={[
                          styles.permissionLabel,
                          disputeMode === mode.id && styles.permissionLabelActive,
                        ]}>
                          {mode.label}
                        </Text>
                        <Text style={styles.permissionDesc}>{mode.description}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Nombre de votes requis (uniquement pour mode communautaire) */}
              {disputeMode === 'community' && (
                <View style={styles.settingSection}>
                  <Text style={styles.settingLabel}>Votes requis pour annuler</Text>
                  <View style={styles.votesSelector}>
                    {[2, 3, 4, 5].map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={[
                          styles.voteOption,
                          disputeVotesRequired === num && styles.voteOptionActive,
                        ]}
                        onPress={() => setDisputeVotesRequired(num)}
                      >
                        <Text style={[
                          styles.voteOptionText,
                          disputeVotesRequired === num && styles.voteOptionTextActive,
                        ]}>
                          {num}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.votesHint}>
                    L'amende sera annulee apres {disputeVotesRequired} votes en faveur
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={20} color={Colors.primary} />
            <Text style={styles.infoText}>
              Vous serez automatiquement administrateur de cette équipe.
              Un code d'invitation sera généré pour inviter vos coéquipiers.
            </Text>
          </View>
        </Card>

        <Button
          title="Créer l'équipe"
          onPress={handleSubmit}
          loading={isSubmitting}
          fullWidth
          disabled={!name.trim() || isSubmitting}
          style={styles.submitButton}
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
  photoSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  photoSelector: {
    position: 'relative',
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.backgroundLight,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  selectedPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  photoHint: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  settingDesc: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  settingSection: {
    marginTop: Spacing.sm,
  },
  permissionOptions: {
    marginTop: Spacing.sm,
  },
  permissionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  permissionOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  permissionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  permissionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  permissionText: {
    flex: 1,
  },
  permissionLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  permissionLabelActive: {
    color: Colors.primary,
  },
  permissionDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: Colors.primary + '10',
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    lineHeight: 20,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  votesSelector: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  voteOption: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  voteOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  voteOptionText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  voteOptionTextActive: {
    color: Colors.primary,
  },
  votesHint: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
});
