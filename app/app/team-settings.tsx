import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTeam, useUpdateTeam, useDeleteTeam } from '@/hooks/useTeams';
import { useSelectAndUploadTeamPhoto } from '@/hooks/useImageUpload';
import {
  useTeamNotificationSettings,
  useUpdateTeamNotificationSettings,
  NotificationTypeLabels,
  NotificationTypeDescriptions,
} from '@/hooks/useNotifications';
import { LoadingScreen, useToast } from '@/components/ui';
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

type NotificationSettingKey =
  | 'notify_fine_received'
  | 'notify_fine_paid'
  | 'notify_payment_recorded'
  | 'notify_member_joined'
  | 'notify_member_left'
  | 'notify_team_closed'
  | 'notify_team_reopened'
  | 'notify_reminder_unpaid';

const NOTIFICATION_SETTINGS: {
  key: NotificationSettingKey;
  type: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { key: 'notify_fine_received', type: 'fine_received', icon: 'warning', color: Colors.error },
  { key: 'notify_fine_paid', type: 'fine_paid', icon: 'checkmark-circle', color: Colors.success },
  { key: 'notify_payment_recorded', type: 'payment_recorded', icon: 'cash', color: Colors.success },
  { key: 'notify_member_joined', type: 'member_joined', icon: 'person-add', color: Colors.primary },
  { key: 'notify_member_left', type: 'member_left', icon: 'person-remove', color: Colors.warning },
  { key: 'notify_team_closed', type: 'team_closed', icon: 'lock-closed', color: Colors.warning },
  { key: 'notify_team_reopened', type: 'team_reopened', icon: 'lock-open', color: Colors.success },
  { key: 'notify_reminder_unpaid', type: 'reminder_unpaid', icon: 'alarm', color: Colors.secondary },
];

export default function TeamSettingsScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const toast = useToast();

  const { data: team, isLoading } = useTeam(teamId);
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const uploadTeamPhoto = useSelectAndUploadTeamPhoto();

  // Notification settings
  const { data: notifSettings } = useTeamNotificationSettings(teamId);
  const updateNotifSettings = useUpdateTeamNotificationSettings();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleChangePhoto = async () => {
    if (!teamId) return;
    try {
      await uploadTeamPhoto.mutateAsync(teamId);
      toast.showSuccess('Photo mise a jour');
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Sélection annulée') {
        return;
      }
      const message = error instanceof Error ? error.message : 'Erreur lors du changement de photo';
      toast.showError(message);
    }
  };

  const handleToggleCustomFines = async (value: boolean) => {
    if (!teamId) return;
    try {
      await updateTeam.mutateAsync({
        teamId,
        updates: { allow_custom_fines: value },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur';
      toast.showError(message);
    }
  };

  const handleChangeFinePermission = async (permission: FinePermission) => {
    if (!teamId) return;
    try {
      await updateTeam.mutateAsync({
        teamId,
        updates: { fine_permission: permission },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur';
      toast.showError(message);
    }
  };

  const handleToggleDispute = async (value: boolean) => {
    if (!teamId) return;
    try {
      await updateTeam.mutateAsync({
        teamId,
        updates: {
          dispute_enabled: value,
          // Si on active, mettre un mode par defaut
          dispute_mode: value ? (team?.dispute_mode || 'simple') : team?.dispute_mode,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur';
      toast.showError(message);
    }
  };

  const handleChangeDisputeMode = async (mode: DisputeMode) => {
    if (!teamId) return;
    try {
      await updateTeam.mutateAsync({
        teamId,
        updates: {
          dispute_mode: mode,
          // Si on passe en mode communautaire, definir un nombre de votes par defaut
          dispute_votes_required: mode === 'community' ? (team?.dispute_votes_required || 3) : team?.dispute_votes_required,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur';
      toast.showError(message);
    }
  };

  const handleChangeDisputeVotes = async (votes: number) => {
    if (!teamId) return;
    try {
      await updateTeam.mutateAsync({
        teamId,
        updates: { dispute_votes_required: votes },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur';
      toast.showError(message);
    }
  };

  const handleToggleClosed = async () => {
    if (!teamId || !team) return;

    const newStatus = !team.is_closed;

    try {
      await updateTeam.mutateAsync({
        teamId,
        updates: { is_closed: newStatus },
      });
      setShowCloseModal(false);
      toast.showSuccess(newStatus ? 'Cagnotte close' : 'Cagnotte reouverte');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Erreur lors de l'action`;
      toast.showError(message);
    }
  };

  const handleDeleteTeam = async () => {
    if (!teamId || !team) return;

    try {
      await deleteTeam.mutateAsync(teamId);
      setShowDeleteModal(false);
      toast.showSuccess('Cagnotte supprimee');
      router.replace('/(tabs)');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la suppression';
      toast.showError(message);
    }
  };

  const handleToggleNotifMaster = async (value: boolean) => {
    if (!teamId) return;
    try {
      await updateNotifSettings.mutateAsync({
        teamId,
        updates: { notifications_enabled: value },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur';
      toast.showError(message);
    }
  };

  const handleToggleNotifSetting = async (key: NotificationSettingKey, value: boolean | null) => {
    if (!teamId) return;
    try {
      await updateNotifSettings.mutateAsync({
        teamId,
        updates: { [key]: value },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur';
      toast.showError(message);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Chargement..." />;
  }

  if (!team) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Equipe non trouvee</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Parametres',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* TEAM INFO */}
        <View style={styles.teamHeader}>
          <TouchableOpacity
            style={styles.teamPhotoContainer}
            onPress={handleChangePhoto}
            disabled={uploadTeamPhoto.isPending}
          >
            {team.photo_url ? (
              <Image source={{ uri: team.photo_url }} style={styles.teamPhoto} />
            ) : (
              <View style={styles.teamPhotoPlaceholder}>
                <Ionicons name="people" size={32} color={Colors.textMuted} />
              </View>
            )}
            <View style={styles.teamPhotoEditBadge}>
              {uploadTeamPhoto.isPending ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <Ionicons name="camera" size={14} color={Colors.text} />
              )}
            </View>
          </TouchableOpacity>
          <View style={styles.teamInfo}>
            <View style={styles.teamHeaderRow}>
              <Text style={styles.teamName}>{team.name}</Text>
              {team.is_closed && (
                <View style={styles.closedBadge}>
                  <Text style={styles.closedBadgeText}>Close</Text>
                </View>
              )}
            </View>
            {team.description && (
              <Text style={styles.teamDescription}>{team.description}</Text>
            )}
          </View>
        </View>

        {/* SETTINGS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Regles des amendes</Text>

          {/* Allow custom fines */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Amendes personnalisees</Text>
              <Text style={styles.settingDesc}>
                Permettre de creer des amendes sans utiliser une regle predefinies
              </Text>
            </View>
            <Switch
              value={team?.allow_custom_fines ?? true}
              onValueChange={handleToggleCustomFines}
              trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
              thumbColor={(team?.allow_custom_fines ?? true) ? Colors.primary : Colors.textMuted}
            />
          </View>

          {/* Fine permission */}
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>Qui peut mettre des amendes ?</Text>
            <View style={styles.permissionOptions}>
              {FINE_PERMISSIONS.map((perm) => {
                const isActive = (team?.fine_permission ?? 'everyone') === perm.id;
                return (
                  <TouchableOpacity
                    key={perm.id}
                    style={[
                      styles.permissionOption,
                      isActive && styles.permissionOptionActive,
                    ]}
                    onPress={() => handleChangeFinePermission(perm.id)}
                  >
                    <View style={styles.permissionRadio}>
                      {isActive && <View style={styles.permissionRadioInner} />}
                    </View>
                    <View style={styles.permissionText}>
                      <Text style={[
                        styles.permissionLabel,
                        isActive && styles.permissionLabelActive,
                      ]}>
                        {perm.label}
                      </Text>
                      <Text style={styles.permissionDesc}>{perm.description}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* CONTESTATION SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contestation des amendes</Text>

          {/* Toggle dispute enabled */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Activer les contestations</Text>
              <Text style={styles.settingDesc}>
                Permettre aux membres de contester une amende
              </Text>
            </View>
            <Switch
              value={team?.dispute_enabled ?? false}
              onValueChange={handleToggleDispute}
              trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
              thumbColor={(team?.dispute_enabled ?? false) ? Colors.primary : Colors.textMuted}
            />
          </View>

          {team?.dispute_enabled && (
            <>
              {/* Dispute mode */}
              <View style={styles.settingSection}>
                <Text style={styles.settingLabel}>Mode de contestation</Text>
                <View style={styles.permissionOptions}>
                  {DISPUTE_MODES.map((mode) => {
                    const isActive = (team?.dispute_mode ?? 'simple') === mode.id;
                    return (
                      <TouchableOpacity
                        key={mode.id}
                        style={[
                          styles.permissionOption,
                          isActive && styles.permissionOptionActive,
                        ]}
                        onPress={() => handleChangeDisputeMode(mode.id)}
                      >
                        <View style={styles.permissionRadio}>
                          {isActive && <View style={styles.permissionRadioInner} />}
                        </View>
                        <View style={styles.permissionText}>
                          <Text style={[
                            styles.permissionLabel,
                            isActive && styles.permissionLabelActive,
                          ]}>
                            {mode.label}
                          </Text>
                          <Text style={styles.permissionDesc}>{mode.description}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Votes required (community mode only) */}
              {team?.dispute_mode === 'community' && (
                <View style={styles.settingSection}>
                  <Text style={styles.settingLabel}>Votes requis pour annuler</Text>
                  <View style={styles.votesSelector}>
                    {[2, 3, 4, 5].map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={[
                          styles.voteOption,
                          (team?.dispute_votes_required ?? 3) === num && styles.voteOptionActive,
                        ]}
                        onPress={() => handleChangeDisputeVotes(num)}
                      >
                        <Text style={[
                          styles.voteOptionText,
                          (team?.dispute_votes_required ?? 3) === num && styles.voteOptionTextActive,
                        ]}>
                          {num}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.votesHint}>
                    L'amende sera annulee apres {team?.dispute_votes_required ?? 3} votes en faveur
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Link to disputes list */}
          {team?.dispute_enabled && (
            <TouchableOpacity
              style={[styles.settingLink, { marginTop: Spacing.md }]}
              onPress={() => router.push({ pathname: '/disputes', params: { teamId } })}
            >
              <View style={[styles.settingLinkIcon, { backgroundColor: Colors.warning + '20' }]}>
                <Ionicons name="flag" size={20} color={Colors.warning} />
              </View>
              <View style={styles.settingLinkInfo}>
                <Text style={styles.settingLinkLabel}>Voir les contestations</Text>
                <Text style={styles.settingLinkDesc}>
                  Consulter et gerer les contestations d'amendes
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* PAYMENT METHODS SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Moyens de paiement</Text>

          {/* Configure payment methods (admin only) */}
          <TouchableOpacity
            style={styles.settingLink}
            onPress={() => router.push({ pathname: '/payment-methods-config', params: { teamId } })}
          >
            <View style={[styles.settingLinkIcon, { backgroundColor: Colors.primary + '20' }]}>
              <Ionicons name="settings-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.settingLinkInfo}>
              <Text style={styles.settingLinkLabel}>Configurer les paiements</Text>
              <Text style={styles.settingLinkDesc}>
                Definir les moyens de paiement (IBAN, Lydia, etc.)
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* MY NOTIFICATIONS FOR THIS TEAM */}
        <View style={styles.notifSection}>
          <TouchableOpacity
            style={styles.notifHeader}
            onPress={() => setShowNotifications(!showNotifications)}
          >
            <View style={styles.notifHeaderLeft}>
              <View style={[styles.notifIcon, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name="notifications" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.notifTitle}>Mes notifications</Text>
                <Text style={styles.notifSubtitle}>
                  Personnaliser pour cette cagnotte
                </Text>
              </View>
            </View>
            <Ionicons
              name={showNotifications ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          {showNotifications && (
            <View style={styles.notifContent}>
              {/* Master switch for this team */}
              <View style={styles.notifMasterRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Notifications activees</Text>
                  <Text style={styles.settingDesc}>
                    Recevoir des notifications pour cette cagnotte
                  </Text>
                </View>
                <Switch
                  value={notifSettings?.notifications_enabled ?? true}
                  onValueChange={handleToggleNotifMaster}
                  trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                  thumbColor={notifSettings?.notifications_enabled ? Colors.primary : Colors.textMuted}
                />
              </View>

              {(notifSettings?.notifications_enabled ?? true) && (
                <>
                  <Text style={styles.notifHint}>
                    Cochez pour activer, decochez pour desactiver.
                    Laissez grise pour utiliser vos parametres globaux.
                  </Text>

                  <View style={styles.notifList}>
                    {NOTIFICATION_SETTINGS.map((setting) => {
                      const currentValue = notifSettings?.[setting.key];
                      const isEnabled = currentValue === true;
                      const isDisabled = currentValue === false;
                      const isDefault = currentValue === null || currentValue === undefined;

                      return (
                        <View key={setting.key} style={styles.notifItem}>
                          <View style={[styles.notifItemIcon, { backgroundColor: setting.color + '20' }]}>
                            <Ionicons name={setting.icon} size={16} color={setting.color} />
                          </View>
                          <View style={styles.notifItemInfo}>
                            <Text style={styles.notifItemLabel}>
                              {NotificationTypeLabels[setting.type]}
                            </Text>
                          </View>
                          <View style={styles.notifItemActions}>
                            <TouchableOpacity
                              style={[
                                styles.notifBtn,
                                isDefault && styles.notifBtnActive,
                              ]}
                              onPress={() => handleToggleNotifSetting(setting.key, null)}
                            >
                              <Text style={[
                                styles.notifBtnText,
                                isDefault && styles.notifBtnTextActive,
                              ]}>
                                Auto
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.notifBtn,
                                isEnabled && styles.notifBtnActiveGreen,
                              ]}
                              onPress={() => handleToggleNotifSetting(setting.key, true)}
                            >
                              <Ionicons
                                name="checkmark"
                                size={14}
                                color={isEnabled ? Colors.success : Colors.textMuted}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.notifBtn,
                                isDisabled && styles.notifBtnActiveRed,
                              ]}
                              onPress={() => handleToggleNotifSetting(setting.key, false)}
                            >
                              <Ionicons
                                name="close"
                                size={14}
                                color={isDisabled ? Colors.error : Colors.textMuted}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          )}
        </View>

        {/* DANGER ZONE */}
        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>Zone de danger</Text>

          {/* Close/Reopen Team */}
          <TouchableOpacity style={styles.dangerOption} onPress={() => setShowCloseModal(true)}>
            <View style={[styles.dangerIcon, { backgroundColor: Colors.warning + '20' }]}>
              <Ionicons
                name={team.is_closed ? 'lock-open-outline' : 'lock-closed-outline'}
                size={20}
                color={Colors.warning}
              />
            </View>
            <View style={styles.dangerInfo}>
              <Text style={styles.dangerLabel}>
                {team.is_closed ? 'Reouvrir la cagnotte' : 'Clore la cagnotte'}
              </Text>
              <Text style={styles.dangerDesc}>
                {team.is_closed
                  ? 'Permettre a nouveau d\'ajouter des amendes'
                  : 'Empecher l\'ajout de nouvelles amendes'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Delete Team */}
          <TouchableOpacity
            style={styles.dangerOption}
            onPress={() => setShowDeleteModal(true)}
          >
            <View style={[styles.dangerIcon, { backgroundColor: Colors.error + '20' }]}>
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </View>
            <View style={styles.dangerInfo}>
              <Text style={[styles.dangerLabel, { color: Colors.error }]}>
                Supprimer la cagnotte
              </Text>
              <Text style={styles.dangerDesc}>
                Supprime definitivement la cagnotte et toutes ses donnees
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Close/Reopen Confirmation Modal */}
      <Modal
        visible={showCloseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCloseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIconContainer, { backgroundColor: Colors.warning + '20' }]}>
              <Ionicons
                name={team.is_closed ? 'lock-open' : 'lock-closed'}
                size={40}
                color={Colors.warning}
              />
            </View>
            <Text style={styles.modalTitle}>
              {team.is_closed ? 'Reouvrir la cagnotte ?' : 'Clore la cagnotte ?'}
            </Text>
            <Text style={styles.modalMessage}>
              {team.is_closed
                ? 'Reouvrir la cagnotte permettra a nouveau d\'ajouter des amendes.'
                : 'Une fois close, plus aucune amende ne pourra etre ajoutee. Les paiements restent possibles. Vous pourrez reouvrir la cagnotte a tout moment.'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowCloseModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Non</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonConfirm, { backgroundColor: Colors.warning }]}
                onPress={handleToggleClosed}
                disabled={updateTeam.isPending}
              >
                <Text style={styles.modalButtonConfirmText}>
                  {updateTeam.isPending ? '...' : 'Oui'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="warning" size={40} color={Colors.error} />
            </View>
            <Text style={styles.modalTitle}>Supprimer la cagnotte ?</Text>
            <Text style={styles.modalMessage}>
              Cette action est irreversible. Toutes les donnees de la cagnotte "{team.name}" seront supprimees.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Non</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={handleDeleteTeam}
                disabled={deleteTeam.isPending}
              >
                <Text style={styles.modalButtonConfirmText}>
                  {deleteTeam.isPending ? 'Suppression...' : 'Oui'}
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  headerBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  errorText: {
    fontSize: FontSizes.md,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  teamHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundLight,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  teamPhotoContainer: {
    position: 'relative',
  },
  teamPhoto: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  teamPhotoPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamPhotoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.backgroundLight,
  },
  teamInfo: {
    flex: 1,
  },
  teamHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  teamName: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  teamDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  closedBadge: {
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  closedBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.warning,
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
  settingLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  settingLinkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  settingLinkInfo: {
    flex: 1,
  },
  settingLinkLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  settingLinkDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
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
  // Notifications section
  notifSection: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  notifHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  notifSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  notifContent: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.md,
  },
  notifMasterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  notifHint: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },
  notifList: {
    gap: Spacing.sm,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  notifItemIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  notifItemInfo: {
    flex: 1,
  },
  notifItemLabel: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  notifItemActions: {
    flexDirection: 'row',
    gap: 4,
  },
  notifBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.backgroundLight,
    minWidth: 32,
    alignItems: 'center',
  },
  notifBtnActive: {
    backgroundColor: Colors.primary + '30',
  },
  notifBtnActiveGreen: {
    backgroundColor: Colors.success + '30',
  },
  notifBtnActiveRed: {
    backgroundColor: Colors.error + '30',
  },
  notifBtnText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  notifBtnTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },

  // Danger section
  dangerSection: {
    marginTop: Spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.xl,
  },
  dangerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: Spacing.md,
  },
  dangerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  dangerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  dangerInfo: {
    flex: 1,
  },
  dangerLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  dangerDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Modal styles
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
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.error + '20',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
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
  // Votes selector styles
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
