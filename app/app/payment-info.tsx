import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useEnabledPaymentMethods, PAYMENT_METHOD_METADATA } from '@/hooks/usePaymentMethods';
import { LoadingScreen, EmptyState } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import {
  TeamPaymentMethod,
  PaymentMethodType,
  BankTransferConfig,
  PaypalConfig,
  LydiaConfig,
  CashConfig,
  PaylibConfig,
  RevolutConfig,
} from '@/types/database';

export default function PaymentInfoScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { data: paymentMethods, isLoading } = useEnabledPaymentMethods(teamId);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedMethod, setExpandedMethod] = useState<PaymentMethodType | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const openLink = (url: string) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      Linking.openURL(url);
    }
  };

  const renderMethodDetails = (method: TeamPaymentMethod) => {
    const config = method.config;
    const methodType = method.method_type;

    switch (methodType) {
      case 'bank_transfer': {
        const bankConfig = config as BankTransferConfig;
        return (
          <>
            {bankConfig.beneficiary_name && (
              <DetailRow
                label="Beneficiaire"
                value={bankConfig.beneficiary_name}
                onCopy={() => copyToClipboard(bankConfig.beneficiary_name, `${method.id}-name`)}
                copied={copiedField === `${method.id}-name`}
              />
            )}
            {bankConfig.iban && (
              <DetailRow
                label="IBAN"
                value={bankConfig.iban}
                onCopy={() => copyToClipboard(bankConfig.iban, `${method.id}-iban`)}
                copied={copiedField === `${method.id}-iban`}
                highlight
              />
            )}
            {bankConfig.bic && (
              <DetailRow
                label="BIC"
                value={bankConfig.bic}
                onCopy={() => copyToClipboard(bankConfig.bic!, `${method.id}-bic`)}
                copied={copiedField === `${method.id}-bic`}
              />
            )}
          </>
        );
      }
      case 'paypal': {
        const paypalConfig = config as PaypalConfig;
        return (
          <>
            {paypalConfig.email && (
              <DetailRow
                label="Email PayPal"
                value={paypalConfig.email}
                onCopy={() => copyToClipboard(paypalConfig.email!, `${method.id}-email`)}
                copied={copiedField === `${method.id}-email`}
              />
            )}
            {paypalConfig.link && (
              <DetailRow
                label="Lien PayPal"
                value={paypalConfig.link}
                onPress={() => openLink(paypalConfig.link!)}
                isLink
              />
            )}
          </>
        );
      }
      case 'lydia': {
        const lydiaConfig = config as LydiaConfig;
        return (
          <>
            {lydiaConfig.phone && (
              <DetailRow
                label="Telephone"
                value={lydiaConfig.phone}
                onCopy={() => copyToClipboard(lydiaConfig.phone!, `${method.id}-phone`)}
                copied={copiedField === `${method.id}-phone`}
              />
            )}
            {lydiaConfig.link && (
              <DetailRow
                label="Lien Lydia"
                value={lydiaConfig.link}
                onPress={() => openLink(lydiaConfig.link!)}
                isLink
              />
            )}
          </>
        );
      }
      case 'cash': {
        const cashConfig = config as CashConfig;
        return (
          <>
            {cashConfig.contact_person && (
              <DetailRow
                label="Contact"
                value={cashConfig.contact_person}
              />
            )}
            {cashConfig.location && (
              <DetailRow
                label="Lieu de collecte"
                value={cashConfig.location}
              />
            )}
          </>
        );
      }
      case 'paylib': {
        const paylibConfig = config as PaylibConfig;
        return (
          <>
            {paylibConfig.phone && (
              <DetailRow
                label="Telephone"
                value={paylibConfig.phone}
                onCopy={() => copyToClipboard(paylibConfig.phone, `${method.id}-phone`)}
                copied={copiedField === `${method.id}-phone`}
              />
            )}
          </>
        );
      }
      case 'revolut': {
        const revolutConfig = config as RevolutConfig;
        return (
          <>
            {revolutConfig.username && (
              <DetailRow
                label="Utilisateur Revolut"
                value={revolutConfig.username}
                onCopy={() => copyToClipboard(revolutConfig.username!, `${method.id}-username`)}
                copied={copiedField === `${method.id}-username`}
              />
            )}
            {revolutConfig.link && (
              <DetailRow
                label="Lien Revolut"
                value={revolutConfig.link}
                onPress={() => openLink(revolutConfig.link!)}
                isLink
              />
            )}
          </>
        );
      }
      default:
        return null;
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Chargement..." />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Comment payer',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtnLeft}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Voici les moyens de paiement disponibles pour regler vos amendes.
        </Text>

        {(!paymentMethods || paymentMethods.length === 0) ? (
          <EmptyState
            icon="wallet-outline"
            title="Aucun moyen de paiement"
            description="L'administrateur n'a pas encore configure les moyens de paiement. Contactez-le pour plus d'informations."
          />
        ) : (
          paymentMethods.map((method) => {
            const meta = PAYMENT_METHOD_METADATA[method.method_type];
            const isExpanded = expandedMethod === method.method_type;

            return (
              <TouchableOpacity
                key={method.id}
                style={styles.methodCard}
                onPress={() => setExpandedMethod(isExpanded ? null : method.method_type)}
                activeOpacity={0.7}
              >
                <View style={styles.methodHeader}>
                  <View style={styles.methodIconContainer}>
                    <Ionicons
                      name={meta.icon as keyof typeof Ionicons.glyphMap}
                      size={28}
                      color={Colors.primary}
                    />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodLabel}>{meta.label}</Text>
                    <Text style={styles.methodDescription}>{meta.description}</Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={Colors.textMuted}
                  />
                </View>

                {isExpanded && (
                  <View style={styles.methodDetails}>
                    {renderMethodDetails(method)}

                    {method.instructions && (
                      <View style={styles.instructionsContainer}>
                        <Ionicons name="information-circle" size={18} color={Colors.primary} />
                        <Text style={styles.instructionsText}>{method.instructions}</Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </>
  );
}

// Composant pour afficher une ligne de detail
interface DetailRowProps {
  label: string;
  value: string;
  onCopy?: () => void;
  onPress?: () => void;
  copied?: boolean;
  highlight?: boolean;
  isLink?: boolean;
}

function DetailRow({ label, value, onCopy, onPress, copied, highlight, isLink }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailValueContainer}>
        <Text
          style={[
            styles.detailValue,
            highlight && styles.detailValueHighlight,
            isLink && styles.detailValueLink,
          ]}
          numberOfLines={1}
          onPress={onPress}
        >
          {value}
        </Text>
        {onCopy && (
          <TouchableOpacity onPress={onCopy} style={styles.copyButton}>
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={18}
              color={copied ? Colors.success : Colors.primary}
            />
          </TouchableOpacity>
        )}
        {isLink && onPress && (
          <TouchableOpacity onPress={onPress} style={styles.copyButton}>
            <Ionicons name="open-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
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
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  methodIconContainer: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  methodLabel: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  methodDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  methodDetails: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  detailRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailValue: {
    fontSize: FontSizes.md,
    color: Colors.text,
    flex: 1,
  },
  detailValueHighlight: {
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  detailValueLink: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  copyButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primary + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  instructionsText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    flex: 1,
    lineHeight: 20,
  },
});
