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
import { useSignIn } from '@/hooks/useAuth';
import { useAuthStore } from '@/lib/store';
import { Button, Input } from '@/components/ui';
import { Colors, FontSizes, Spacing } from '@/constants/theme';

// Fonction pour traduire les erreurs Supabase
const getErrorMessage = (error: Error): string => {
  const message = error.message.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'Identifiant ou mot de passe incorrect';
  }
  if (message.includes('pseudo ou email introuvable')) {
    return 'Pseudo ou email introuvable';
  }
  if (message.includes('email not confirmed')) {
    return 'Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception.';
  }
  if (message.includes('invalid email')) {
    return 'Adresse email invalide';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Erreur de connexion. Vérifiez votre connexion internet.';
  }
  if (message.includes('too many requests') || message.includes('rate limit')) {
    return 'Trop de tentatives. Veuillez patienter quelques minutes.';
  }

  return error.message || 'Une erreur est survenue';
};

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const signIn = useSignIn();

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!identifier.trim()) {
      newErrors.identifier = 'L\'email ou pseudo est requis';
    }

    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setGlobalError(null);

    try {
      const { user } = await signIn.mutateAsync({ identifier, password });
      // Le store est mis à jour dans onSuccess du hook useSignIn
      if (user) {
        router.replace('/(tabs)');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? getErrorMessage(error) : 'Erreur de connexion';
      setGlobalError(message);
    }
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
          <Text style={styles.logo}>Kotiz</Text>
          <Text style={styles.subtitle}>
            Gérez les amendes de votre équipe
          </Text>
        </View>

        <View style={styles.form}>
          {globalError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{globalError}</Text>
            </View>
          )}

          <Input
            label="Email ou pseudo"
            placeholder="votre@email.com ou pseudo"
            value={identifier}
            onChangeText={(text) => { setIdentifier(text); setGlobalError(null); }}
            error={errors.identifier}
            autoCapitalize="none"
            autoComplete="username"
            leftIcon="person-outline"
          />

          <Input
            label="Mot de passe"
            placeholder="Votre mot de passe"
            value={password}
            onChangeText={(text) => { setPassword(text); setGlobalError(null); }}
            error={errors.password}
            secureTextEntry
            autoComplete="password"
            leftIcon="lock-closed-outline"
          />

          <Button
            title="Se connecter"
            onPress={handleLogin}
            loading={signIn.isPending}
            fullWidth
            style={styles.button}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ?</Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Créer un compte</Text>
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
    marginBottom: Spacing.xxl,
  },
  logo: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: Colors.primary,
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
