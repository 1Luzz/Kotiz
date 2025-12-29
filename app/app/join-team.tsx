import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useJoinTeam } from '@/hooks/useTeams';
import { Button, Input, Card } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

type FeedbackType = 'error' | 'success' | 'info' | null;

export default function JoinTeamScreen() {
  const [inviteCode, setInviteCode] = useState('');
  const [feedback, setFeedback] = useState<{ type: FeedbackType; message: string } | null>(null);
  const joinTeam = useJoinTeam();

  const showFeedback = (type: FeedbackType, message: string) => {
    setFeedback({ type, message });
    // Auto-clear error messages after 5 seconds
    if (type === 'error') {
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const clearFeedback = () => setFeedback(null);

  const handleJoin = async () => {
    clearFeedback();
    const code = inviteCode.trim().toUpperCase();

    if (!code) {
      showFeedback('error', 'Entrez un code d\'invitation');
      return;
    }

    if (code.length < 6) {
      showFeedback('error', 'Le code doit contenir au moins 6 caractères');
      return;
    }

    try {
      const teamId = await joinTeam.mutateAsync(code);
      showFeedback('success', 'Vous avez rejoint l\'équipe avec succès !');

      // Redirect after a short delay to show success message
      setTimeout(() => {
        router.replace(`/team/${teamId}`);
      }, 1000);
    } catch (error: unknown) {
      // Supabase errors have a specific structure with message in different places
      let errorMessage = '';
      if (error && typeof error === 'object') {
        const err = error as { message?: string; details?: string; hint?: string };
        errorMessage = err.message || err.details || '';
      }

      console.log('Join team error:', JSON.stringify(error, null, 2));

      if (errorMessage.toLowerCase().includes('already a member')) {
        showFeedback('info', 'Vous êtes déjà membre de cette équipe');
      } else if (errorMessage.toLowerCase().includes('invalid invite code')) {
        showFeedback('error', 'Code invalide. Vérifiez le code et réessayez.');
      } else {
        showFeedback('error', 'Code invalide ou équipe introuvable');
      }
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Rejoindre une équipe',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtnLeft}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="enter" size={48} color={Colors.primary} />
          </View>

          <Text style={styles.title}>Rejoindre une équipe</Text>
          <Text style={styles.subtitle}>
            Entrez le code d'invitation partagé par un membre de l'équipe
          </Text>

          <View style={styles.inputContainer}>
            <Input
              label="Code d'invitation"
              placeholder="Ex: HAND2024"
              value={inviteCode}
              onChangeText={(text) => {
                setInviteCode(text.toUpperCase());
                clearFeedback();
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              leftIcon="key-outline"
            />
          </View>

          {/* Feedback Message */}
          {feedback && (
            <TouchableOpacity
              style={[
                styles.feedbackContainer,
                feedback.type === 'error' && styles.feedbackError,
                feedback.type === 'success' && styles.feedbackSuccess,
                feedback.type === 'info' && styles.feedbackInfo,
              ]}
              onPress={clearFeedback}
              activeOpacity={0.8}
            >
              <Ionicons
                name={
                  feedback.type === 'error' ? 'alert-circle' :
                  feedback.type === 'success' ? 'checkmark-circle' :
                  'information-circle'
                }
                size={20}
                color={
                  feedback.type === 'error' ? Colors.error :
                  feedback.type === 'success' ? Colors.success :
                  Colors.primary
                }
              />
              <Text style={[
                styles.feedbackText,
                feedback.type === 'error' && styles.feedbackTextError,
                feedback.type === 'success' && styles.feedbackTextSuccess,
                feedback.type === 'info' && styles.feedbackTextInfo,
              ]}>
                {feedback.message}
              </Text>
              <Ionicons name="close" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}

          <Button
            title="Rejoindre"
            onPress={handleJoin}
            loading={joinTeam.isPending}
            fullWidth
            disabled={!inviteCode.trim() || joinTeam.isPending}
          />

          <Card style={styles.helpCard}>
            <View style={styles.helpRow}>
              <Ionicons name="help-circle-outline" size={20} color={Colors.textSecondary} />
              <View style={styles.helpContent}>
                <Text style={styles.helpTitle}>Comment obtenir un code ?</Text>
                <Text style={styles.helpText}>
                  Demandez à un membre de votre équipe de partager le code
                  depuis les paramètres de l'équipe.
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </KeyboardAvoidingView>
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
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: Spacing.sm,
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  feedbackError: {
    backgroundColor: Colors.error + '15',
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  feedbackSuccess: {
    backgroundColor: Colors.success + '15',
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  feedbackInfo: {
    backgroundColor: Colors.primary + '15',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  feedbackText: {
    flex: 1,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  feedbackTextError: {
    color: Colors.error,
  },
  feedbackTextSuccess: {
    color: Colors.success,
  },
  feedbackTextInfo: {
    color: Colors.primary,
  },
  helpCard: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.surface,
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  helpContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  helpTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  helpText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
