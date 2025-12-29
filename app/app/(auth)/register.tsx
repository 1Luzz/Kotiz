import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useSignUp } from '@/hooks/useAuth';
import { Button, Input } from '@/components/ui';
import { Colors, FontSizes, Spacing } from '@/constants/theme';

// Fonction pour traduire les erreurs Supabase
const getErrorMessage = (error: Error): string => {
  const message = error.message.toLowerCase();

  if (message.includes('user already registered')) {
    return 'Un compte existe déjà avec cet email. Essayez de vous connecter.';
  }
  if (message.includes('password should be at least')) {
    return 'Le mot de passe doit faire au moins 6 caractères';
  }
  if (message.includes('invalid email')) {
    return 'Adresse email invalide';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Erreur de connexion. Vérifiez votre connexion internet.';
  }
  if (message.includes('too many requests') || message.includes('rate limit') || message.includes('security purposes')) {
    return 'Trop de tentatives. Veuillez patienter quelques minutes.';
  }

  return error.message || 'Une erreur est survenue';
};

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const signUp = useSignUp();

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!displayName.trim()) {
      newErrors.displayName = 'Le pseudo est requis';
    } else if (displayName.trim().length < 2) {
      newErrors.displayName = 'Le pseudo doit faire au moins 2 caractères';
    }

    if (!email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email invalide';
    }

    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 6) {
      newErrors.password = 'Le mot de passe doit faire au moins 6 caractères';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setGlobalError(null);
    setSuccessMessage(null);

    try {
      await signUp.mutateAsync({
        email,
        password,
        displayName: displayName.trim(),
      });

      setSuccessMessage(
        `Compte créé avec succès ! Un email de confirmation a été envoyé à ${email}. Cliquez sur le lien dans l'email pour activer votre compte.`
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? getErrorMessage(error) : 'Erreur lors de l\'inscription';
      setGlobalError(message);
    }
  };

  const clearMessages = () => {
    setGlobalError(null);
    setSuccessMessage(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>
            Rejoignez Kotiz et commencez à gérer les amendes de votre équipe
          </Text>
        </View>

        <View style={styles.form}>
          {globalError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{globalError}</Text>
            </View>
          )}

          {successMessage && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>{successMessage}</Text>
              <TouchableOpacity
                style={styles.goToLoginButton}
                onPress={() => router.replace('/(auth)/login')}
              >
                <Text style={styles.goToLoginText}>Aller à la connexion</Text>
              </TouchableOpacity>
            </View>
          )}

          {!successMessage && (
            <>
              <Input
                label="Pseudo"
                placeholder="Votre pseudo"
                value={displayName}
                onChangeText={(text) => { setDisplayName(text); clearMessages(); }}
                error={errors.displayName}
                autoCapitalize="words"
                leftIcon="person-outline"
              />

              <Input
                label="Email"
                placeholder="votre@email.com"
                value={email}
                onChangeText={(text) => { setEmail(text); clearMessages(); }}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                leftIcon="mail-outline"
              />

              <Input
                label="Mot de passe"
                placeholder="Au moins 6 caractères"
                value={password}
                onChangeText={(text) => { setPassword(text); clearMessages(); }}
                error={errors.password}
                secureTextEntry
                autoComplete="new-password"
                leftIcon="lock-closed-outline"
              />

              <Input
                label="Confirmer le mot de passe"
                placeholder="Répétez le mot de passe"
                value={confirmPassword}
                onChangeText={(text) => { setConfirmPassword(text); clearMessages(); }}
                error={errors.confirmPassword}
                secureTextEntry
                autoComplete="new-password"
                leftIcon="lock-closed-outline"
              />

              <Button
                title="Créer mon compte"
                onPress={handleRegister}
                loading={signUp.isPending}
                fullWidth
                style={styles.button}
              />
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà un compte ?</Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Se connecter</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: Spacing.xl,
  },
  button: {
    marginTop: Spacing.md,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#dc2626',
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
  },
  successText: {
    color: '#15803d',
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  goToLoginButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  goToLoginText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: FontSizes.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
  },
  link: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '600',
  },
});
