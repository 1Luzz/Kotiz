import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Share,
  Platform,
  Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTeam, useTeamMembers, useRemoveMember, useUpdateMemberRole } from '@/hooks/useTeams';
import { useAuthStore } from '@/lib/store';
import { Avatar, EmptyState, LoadingScreen } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { TeamMemberWithDetails, TeamRole } from '@/types/database';

export default function MembersScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { user } = useAuthStore();

  const { data: team } = useTeam(teamId);
  const { data: members, isLoading } = useTeamMembers(teamId);
  const removeMember = useRemoveMember();
  const updateMemberRole = useUpdateMemberRole();

  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMemberWithDetails | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [memberToChangeRole, setMemberToChangeRole] = useState<TeamMemberWithDetails | null>(null);

  const currentUserRole = members?.find((m) => m.user_id === user?.id)?.role;
  const isAdmin = currentUserRole === 'admin';

  const handleRemove = (member: TeamMemberWithDetails) => {
    if (member.user_id === user?.id) {
      alert('Vous ne pouvez pas vous retirer vous-meme');
      return;
    }
    setMemberToRemove(member);
    setShowRemoveModal(true);
  };

  const confirmRemove = async () => {
    if (!memberToRemove) return;
    try {
      await removeMember.mutateAsync({ teamId, memberId: memberToRemove.user_id });
      setShowRemoveModal(false);
      setMemberToRemove(null);
    } catch (error) {
      alert('Impossible de retirer le membre');
    }
  };

  const handleChangeRole = (member: TeamMemberWithDetails) => {
    setMemberToChangeRole(member);
    setShowRoleModal(true);
  };

  const confirmChangeRole = async (newRole: TeamRole) => {
    if (!memberToChangeRole) return;
    try {
      await updateMemberRole.mutateAsync({
        teamId,
        memberId: memberToChangeRole.user_id,
        role: newRole,
      });
      setShowRoleModal(false);
      setMemberToChangeRole(null);
    } catch (error) {
      alert('Impossible de modifier le role');
    }
  };

  const handleShareInvite = async () => {
    if (!team) return;
    try {
      await Share.share({
        message: `Rejoins "${team.name}" sur Kotiz ! Code: ${team.invite_code}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleCopyInviteCode = async () => {
    if (!team?.invite_code) return;
    try {
      await Clipboard.setStringAsync(team.invite_code);
      if (Platform.OS === 'web') {
        alert('Code copie !');
      }
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Chargement..." />;
  }

  const renderMember = ({ item }: { item: TeamMemberWithDetails }) => {
    const isCurrentUser = item.user_id === user?.id;
    const isDeleted = item.is_deleted;

    return (
      <View style={[styles.memberCard, isDeleted && styles.memberCardDeleted]}>
        <View style={isDeleted ? styles.avatarDeleted : undefined}>
          <Avatar source={item.avatar_url} name={item.display_name} size="md" />
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={[styles.memberName, isDeleted && styles.memberNameDeleted]}>
              {item.display_name}
            </Text>
            {isCurrentUser && (
              <Text style={styles.youBadge}>Vous</Text>
            )}
            {isDeleted && (
              <Text style={styles.deletedBadge}>Retire</Text>
            )}
          </View>
          <View style={styles.roleRow}>
            {item.role === 'admin' && !isDeleted && (
              <View style={styles.adminBadge}>
                <Ionicons name="star" size={12} color={Colors.secondary} />
                <Text style={styles.adminText}>Admin</Text>
              </View>
            )}
            {item.role === 'treasurer' && !isDeleted && (
              <View style={styles.treasurerBadge}>
                <Ionicons name="wallet" size={12} color={Colors.success} />
                <Text style={styles.treasurerText}>Tresorier</Text>
              </View>
            )}
            {item.role === 'member' && !isDeleted && (
              <Text style={styles.memberRole}>Membre</Text>
            )}
          </View>
        </View>
        {isAdmin && !isCurrentUser && !isDeleted && item.role !== 'admin' && (
          <TouchableOpacity
            style={styles.roleBtn}
            onPress={() => handleChangeRole(item)}
          >
            <Ionicons
              name={item.role === 'treasurer' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
              size={22}
              color={item.role === 'treasurer' ? Colors.textMuted : Colors.success}
            />
          </TouchableOpacity>
        )}
        {isAdmin && !isCurrentUser && !isDeleted && (
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => handleRemove(item)}
          >
            <Ionicons name="close-circle-outline" size={22} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Membres',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtnLeft}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleShareInvite} style={styles.headerBtnRight}>
              <Ionicons name="person-add-outline" size={24} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <FlatList
        data={members}
        keyExtractor={(item) => item.user_id}
        renderItem={renderMember}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Aucun membre"
            description="Invitez des membres a rejoindre l'equipe"
            actionLabel="Inviter"
            onAction={handleShareInvite}
          />
        }
        ListHeaderComponent={
          members && members.length > 0 ? (
            <View style={styles.headerContainer}>
              <Text style={styles.header}>
                {members.length} membre{members.length > 1 ? 's' : ''}
              </Text>
              {team && (
                <TouchableOpacity style={styles.inviteBtn} onPress={handleCopyInviteCode}>
                  <Ionicons name="copy-outline" size={16} color={Colors.primary} />
                  <Text style={styles.inviteCode}>{team.invite_code}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
      />

      {/* REMOVE MEMBER MODAL */}
      <Modal
        visible={showRemoveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRemoveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Retirer le membre</Text>
            <Text style={styles.modalText}>
              Voulez-vous vraiment retirer {memberToRemove?.display_name} de l'equipe ?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowRemoveModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={confirmRemove}
              >
                <Text style={styles.modalBtnConfirmText}>Retirer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CHANGE ROLE MODAL */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {memberToChangeRole?.role === 'treasurer' ? 'Retrograder le membre' : 'Promouvoir en tresorier'}
            </Text>
            <Text style={styles.modalText}>
              {memberToChangeRole?.role === 'treasurer'
                ? `Voulez-vous retrograder ${memberToChangeRole?.display_name} au role de membre ?`
                : `Voulez-vous promouvoir ${memberToChangeRole?.display_name} au role de tresorier ?\n\nLes tresoriers peuvent gerer les amendes de la cagnotte.`}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowRoleModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSuccess]}
                onPress={() => confirmChangeRole(memberToChangeRole?.role === 'treasurer' ? 'member' : 'treasurer')}
              >
                <Text style={styles.modalBtnConfirmText}>
                  {memberToChangeRole?.role === 'treasurer' ? 'Retrograder' : 'Promouvoir'}
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
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  header: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary + '15',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  inviteCode: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 1,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  memberCardDeleted: {
    opacity: 0.6,
  },
  avatarDeleted: {
    opacity: 0.5,
  },
  memberInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  memberName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  memberNameDeleted: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  deletedBadge: {
    fontSize: FontSizes.xs,
    color: Colors.error,
    backgroundColor: Colors.error + '15',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  youBadge: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adminText: {
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    fontWeight: '600',
  },
  treasurerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  treasurerText: {
    fontSize: FontSizes.xs,
    color: Colors.success,
    fontWeight: '600',
  },
  memberRole: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  roleBtn: {
    padding: Spacing.xs,
    marginRight: Spacing.xs,
  },
  removeBtn: {
    padding: Spacing.xs,
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
  modalBtnSuccess: {
    backgroundColor: Colors.success,
  },
  modalBtnConfirmText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
