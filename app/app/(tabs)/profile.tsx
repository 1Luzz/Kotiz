import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useSignOut, useUpdateProfile } from '@/hooks/useAuth';
import { useSelectAndUploadAvatar } from '@/hooks/useImageUpload';
import { Avatar, Button, Input, Card, useToast } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

export default function ProfileScreen() {
  const { profile, user } = useAuth();
  const toast = useToast();
  const signOut = useSignOut();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useSelectAndUploadAvatar();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleChangeAvatar = async () => {
    try {
      await uploadAvatar.mutateAsync();
      toast.showSuccess('Photo de profil mise a jour');
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Sélection annulée') {
        return;
      }
      const message = error instanceof Error ? error.message : 'Erreur lors du changement de photo';
      toast.showError(message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut.mutateAsync();
      setShowLogoutModal(false);
      router.replace('/(auth)/login');
    } catch (error: unknown) {
      toast.showError('Erreur lors de la deconnexion');
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      toast.showError('Le pseudo ne peut pas etre vide');
      return;
    }

    try {
      await updateProfile.mutateAsync({ display_name: displayName.trim() });
      setIsEditing(false);
      toast.showSuccess('Profil mis a jour');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la mise a jour';
      toast.showError(message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileSection}>
        <TouchableOpacity onPress={handleChangeAvatar} style={styles.avatarContainer} disabled={uploadAvatar.isPending}>
          <Avatar
            source={profile?.avatar_url}
            name={profile?.display_name || 'Utilisateur'}
            size="xl"
          />
          <View style={styles.avatarEditBadge}>
            {uploadAvatar.isPending ? (
              <ActivityIndicator size="small" color={Colors.text} />
            ) : (
              <Ionicons name="camera" size={16} color={Colors.text} />
            )}
          </View>
        </TouchableOpacity>

        {isEditing ? (
          <View style={styles.editForm}>
            <Input
              label="Pseudo"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Votre pseudo"
            />
            <View style={styles.editButtons}>
              <Button
                title="Annuler"
                onPress={() => {
                  setIsEditing(false);
                  setDisplayName(profile?.display_name || '');
                }}
                variant="ghost"
                size="sm"
              />
              <Button
                title="Enregistrer"
                onPress={handleSaveProfile}
                loading={updateProfile.isPending}
                size="sm"
              />
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.name}>{profile?.display_name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="pencil" size={16} color={Colors.primary} />
              <Text style={styles.editButtonText}>Modifier</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paramètres</Text>

        <Card style={styles.menuCard}>
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            onPress={() => router.push('/notification-settings')}
          />
          <MenuItem
            icon="shield-outline"
            label="Confidentialité"
            onPress={() => toast.showInfo('Bientot disponible')}
          />
          <MenuItem
            icon="help-circle-outline"
            label="Aide"
            onPress={() => toast.showInfo('Bientot disponible')}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compte</Text>

        <Card style={styles.menuCard}>
          <MenuItem
            icon="log-out-outline"
            label="Déconnexion"
            onPress={() => setShowLogoutModal(true)}
            danger
          />
        </Card>
      </View>

      <Text style={styles.version}>Kotiz v1.0.0</Text>

      {/* Modal de déconnexion */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="log-out" size={40} color={Colors.error} style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Deconnexion</Text>
            <Text style={styles.modalMessage}>
              Etes-vous sur de vouloir vous deconnecter ?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={handleLogout}
                disabled={signOut.isPending}
              >
                <Text style={styles.modalButtonConfirmText}>
                  {signOut.isPending ? '...' : 'Deconnexion'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onPress, danger }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <Ionicons
      name={icon}
      size={22}
      color={danger ? Colors.error : Colors.textSecondary}
    />
    <Text style={[styles.menuItemLabel, danger && styles.menuItemLabelDanger]}>
      {label}
    </Text>
    <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  name: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  email: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  editButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
  editForm: {
    width: '100%',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  menuCard: {
    padding: 0,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
    marginLeft: Spacing.md,
  },
  menuItemLabelDanger: {
    color: Colors.error,
  },
  version: {
    textAlign: 'center',
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xl,
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
    fontSize: FontSizes.sm,
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
