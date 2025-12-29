import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  usePaymentMethods,
  useUpsertPaymentMethod,
  PAYMENT_METHOD_METADATA,
  PAYMENT_METHOD_TYPES,
} from '@/hooks/usePaymentMethods';
import { LoadingScreen } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { PaymentMethodType, TeamPaymentMethod } from '@/types/database';

export default function PaymentMethodsConfigScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { data: paymentMethods, isLoading } = usePaymentMethods(teamId);
  const upsertMethod = useUpsertPaymentMethod();

  const [expandedMethod, setExpandedMethod] = useState<PaymentMethodType | null>(null);
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});
  const [instructions, setInstructions] = useState<Record<string, string>>({});
  const [enabledMethods, setEnabledMethods] = useState<Record<string, boolean>>({});
  const [savingToggle, setSavingToggle] = useState<string | null>(null);
  const [savingDetails, setSavingDetails] = useState<string | null>(null);
  const [savedMethod, setSavedMethod] = useState<string | null>(null);

  // Initialiser les données depuis les méthodes existantes
  useEffect(() => {
    if (paymentMethods) {
      const initialFormData: Record<string, Record<string, string>> = {};
      const initialInstructions: Record<string, string> = {};
      const initialEnabled: Record<string, boolean> = {};

      paymentMethods.forEach((method) => {
        initialFormData[method.method_type] = method.config as Record<string, string>;
        initialInstructions[method.method_type] = method.instructions || '';
        initialEnabled[method.method_type] = method.is_enabled;
      });

      setFormData(initialFormData);
      setInstructions(initialInstructions);
      setEnabledMethods(initialEnabled);
    }
  }, [paymentMethods]);

  // Toggle et sauvegarde automatique du statut actif/inactif
  const handleToggle = async (methodType: PaymentMethodType) => {
    const newValue = !enabledMethods[methodType];
    setEnabledMethods((prev) => ({ ...prev, [methodType]: newValue }));
    setSavingToggle(methodType);

    try {
      const config = formData[methodType] || {};
      const instruction = instructions[methodType] || '';

      await upsertMethod.mutateAsync({
        teamId,
        methodType,
        isEnabled: newValue,
        instructions: instruction,
        config,
      });

      // Feedback visuel bref
      setSavedMethod(methodType);
      setTimeout(() => setSavedMethod(null), 1500);
    } catch (error) {
      // Revert en cas d'erreur
      setEnabledMethods((prev) => ({ ...prev, [methodType]: !newValue }));
    } finally {
      setSavingToggle(null);
    }
  };

  // Sauvegarder les détails (champs + instructions)
  const handleSaveDetails = async (methodType: PaymentMethodType) => {
    setSavingDetails(methodType);

    try {
      const config = formData[methodType] || {};
      const instruction = instructions[methodType] || '';
      const isEnabled = enabledMethods[methodType] ?? false;

      await upsertMethod.mutateAsync({
        teamId,
        methodType,
        isEnabled,
        instructions: instruction,
        config,
      });

      setSavedMethod(methodType);
      setTimeout(() => setSavedMethod(null), 1500);

      // Fermer le panneau après sauvegarde réussie
      setExpandedMethod(null);
    } catch (error) {
      // Erreur silencieuse pour l'instant
    } finally {
      setSavingDetails(null);
    }
  };

  const updateFormField = (methodType: PaymentMethodType, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [methodType]: {
        ...(prev[methodType] || {}),
        [field]: value,
      },
    }));
  };

  const getExistingMethod = (methodType: PaymentMethodType): TeamPaymentMethod | undefined => {
    return paymentMethods?.find((m) => m.method_type === methodType);
  };

  // Vérifie si une méthode a des données configurées
  const hasConfig = (methodType: PaymentMethodType): boolean => {
    const config = formData[methodType];
    if (!config) return false;
    return Object.values(config).some((v) => v && v.trim() !== '');
  };

  // Obtenir le statut à afficher
  const getStatusBadge = (methodType: PaymentMethodType) => {
    const isEnabled = enabledMethods[methodType];
    const configured = hasConfig(methodType);
    const existing = getExistingMethod(methodType);

    if (isEnabled) {
      return { label: 'Actif', type: 'enabled' as const };
    } else if (existing || configured) {
      return { label: 'Inactif', type: 'disabled' as const };
    }
    return { label: 'Non configuré', type: 'none' as const };
  };

  if (isLoading) {
    return <LoadingScreen message="Chargement..." />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Moyens de paiement',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtnLeft}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.description}>
            Activez les moyens de paiement et configurez les informations que vos membres verront.
          </Text>

          {PAYMENT_METHOD_TYPES.map((methodType) => {
            const meta = PAYMENT_METHOD_METADATA[methodType];
            const isExpanded = expandedMethod === methodType;
            const isEnabled = enabledMethods[methodType] ?? false;
            const status = getStatusBadge(methodType);
            const isSavingToggle = savingToggle === methodType;
            const isSavingDetails = savingDetails === methodType;
            const justSaved = savedMethod === methodType;

            return (
              <View key={methodType} style={[styles.methodCard, isEnabled && styles.methodCardEnabled]}>
                {/* Header avec toggle intégré */}
                <View style={styles.methodHeader}>
                  <TouchableOpacity
                    style={styles.methodHeaderLeft}
                    onPress={() => setExpandedMethod(isExpanded ? null : methodType)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.methodIcon, isEnabled && styles.methodIconEnabled]}>
                      <Ionicons
                        name={meta.icon as keyof typeof Ionicons.glyphMap}
                        size={24}
                        color={isEnabled ? Colors.primary : Colors.textMuted}
                      />
                    </View>
                    <View style={styles.methodInfo}>
                      <View style={styles.methodTitleRow}>
                        <Text style={[styles.methodLabel, isEnabled && styles.methodLabelEnabled]}>
                          {meta.label}
                        </Text>
                        {justSaved && (
                          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                        )}
                      </View>
                      <View style={styles.statusRow}>
                        <View style={[
                          styles.statusDot,
                          status.type === 'enabled' && styles.statusDotEnabled,
                          status.type === 'disabled' && styles.statusDotDisabled,
                          status.type === 'none' && styles.statusDotNone,
                        ]} />
                        <Text style={[
                          styles.statusText,
                          status.type === 'enabled' && styles.statusTextEnabled,
                          status.type === 'disabled' && styles.statusTextDisabled,
                        ]}>
                          {status.label}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.methodHeaderRight}>
                    {isSavingToggle ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Switch
                        value={isEnabled}
                        onValueChange={() => handleToggle(methodType)}
                        trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                        thumbColor={isEnabled ? Colors.primary : Colors.textMuted}
                      />
                    )}
                  </View>
                </View>

                {/* Bouton configurer (toujours visible) */}
                <TouchableOpacity
                  style={styles.configureButton}
                  onPress={() => setExpandedMethod(isExpanded ? null : methodType)}
                >
                  <Text style={styles.configureButtonText}>
                    {isExpanded ? 'Masquer les détails' : 'Configurer les détails'}
                  </Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={Colors.primary}
                  />
                </TouchableOpacity>

                {/* Expanded content - Détails */}
                {isExpanded && (
                  <View style={styles.methodContent}>
                    {/* Fields */}
                    {meta.fields.map((field) => (
                      <View key={field.key} style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>
                          {field.label}
                          {field.required && <Text style={styles.required}> *</Text>}
                        </Text>
                        <TextInput
                          style={[styles.input, field.multiline && styles.inputMultiline]}
                          placeholder={field.placeholder}
                          placeholderTextColor={Colors.textMuted}
                          value={formData[methodType]?.[field.key] || ''}
                          onChangeText={(value) => updateFormField(methodType, field.key, value)}
                          multiline={field.multiline}
                          numberOfLines={field.multiline ? 3 : 1}
                        />
                      </View>
                    ))}

                    {/* Instructions */}
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Instructions pour les membres</Text>
                      <TextInput
                        style={[styles.input, styles.inputMultiline]}
                        placeholder="Ex: Merci d'indiquer 'Caisse noire + votre nom' en référence"
                        placeholderTextColor={Colors.textMuted}
                        value={instructions[methodType] || ''}
                        onChangeText={(value) => setInstructions((prev) => ({ ...prev, [methodType]: value }))}
                        multiline
                        numberOfLines={3}
                      />
                    </View>

                    {/* Save button */}
                    <TouchableOpacity
                      style={[styles.saveButton, isSavingDetails && styles.saveButtonDisabled]}
                      onPress={() => handleSaveDetails(methodType)}
                      disabled={isSavingDetails}
                    >
                      {isSavingDetails ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={20} color="#FFF" />
                          <Text style={styles.saveButtonText}>Enregistrer</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  description: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  methodCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodCardEnabled: {
    borderColor: Colors.primary + '40',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  methodHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconEnabled: {
    backgroundColor: Colors.primary + '15',
  },
  methodInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  methodLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  methodLabelEnabled: {
    color: Colors.primary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textMuted,
  },
  statusDotEnabled: {
    backgroundColor: Colors.success,
  },
  statusDotDisabled: {
    backgroundColor: Colors.warning,
  },
  statusDotNone: {
    backgroundColor: Colors.textMuted,
  },
  statusText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  statusTextEnabled: {
    color: Colors.success,
  },
  statusTextDisabled: {
    color: Colors.warning,
  },
  methodHeaderRight: {
    marginLeft: Spacing.md,
  },
  configureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.xs,
  },
  configureButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '500',
  },
  methodContent: {
    padding: Spacing.md,
    backgroundColor: Colors.backgroundLight,
  },
  fieldContainer: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  required: {
    color: Colors.error,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
