import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { TeamPaymentMethod, PaymentMethodType, PaymentMethodConfig } from '@/types/database';

// Transform API response (camelCase) to frontend format (snake_case)
const transformPaymentMethod = (m: any): TeamPaymentMethod => ({
  id: m.id,
  team_id: m.teamId,
  method_type: m.methodType,
  is_enabled: m.isEnabled,
  display_name: m.displayName,
  instructions: m.instructions,
  config: m.config,
  created_by: m.createdById,
  created_at: m.createdAt,
  updated_at: m.updatedAt,
});

// Hook pour récupérer les méthodes de paiement d'une équipe
export const usePaymentMethods = (teamId: string) => {
  return useQuery({
    queryKey: queryKeys.paymentMethods(teamId),
    queryFn: async () => {
      const data = await api.get<any[]>(`/teams/${teamId}/payment-methods`);
      return data.map(transformPaymentMethod);
    },
    enabled: !!teamId,
  });
};

// Hook pour récupérer uniquement les méthodes de paiement actives
export const useEnabledPaymentMethods = (teamId: string) => {
  return useQuery({
    queryKey: [...queryKeys.paymentMethods(teamId), 'enabled'],
    queryFn: async () => {
      const data = await api.get<any[]>(`/teams/${teamId}/payment-methods?enabledOnly=true`);
      return data.map(transformPaymentMethod);
    },
    enabled: !!teamId,
  });
};

// Hook pour créer ou mettre à jour une méthode de paiement (upsert)
export const useUpsertPaymentMethod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      methodType,
      isEnabled,
      displayName,
      instructions,
      config,
    }: {
      teamId: string;
      methodType: PaymentMethodType;
      isEnabled: boolean;
      displayName?: string;
      instructions?: string;
      config: PaymentMethodConfig;
    }) => {
      const data = await api.put<any>(`/teams/${teamId}/payment-methods`, {
        methodType,
        isEnabled,
        displayName,
        instructions,
        config,
      });
      return transformPaymentMethod(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods(data.team_id) });
    },
  });
};

// Métadonnées des types de méthodes de paiement
export const PAYMENT_METHOD_METADATA: Record<PaymentMethodType, {
  label: string;
  icon: string;
  description: string;
  fields: Array<{
    key: string;
    label: string;
    placeholder: string;
    required: boolean;
    multiline?: boolean;
  }>;
}> = {
  bank_transfer: {
    label: 'Virement bancaire',
    icon: 'business-outline',
    description: 'Paiement par virement SEPA',
    fields: [
      { key: 'beneficiary_name', label: 'Nom du bénéficiaire', placeholder: 'Jean Dupont', required: true },
      { key: 'iban', label: 'IBAN', placeholder: 'FR76 1234 5678 9012 3456 7890 123', required: true },
      { key: 'bic', label: 'BIC (optionnel)', placeholder: 'BNPAFRPP', required: false },
    ],
  },
  paypal: {
    label: 'PayPal',
    icon: 'logo-paypal',
    description: 'Paiement via PayPal',
    fields: [
      { key: 'email', label: 'Email PayPal', placeholder: 'exemple@email.com', required: false },
      { key: 'link', label: 'Lien PayPal.me (optionnel)', placeholder: 'https://paypal.me/monnom', required: false },
    ],
  },
  lydia: {
    label: 'Lydia',
    icon: 'phone-portrait-outline',
    description: 'Paiement via Lydia',
    fields: [
      { key: 'phone', label: 'Numéro de téléphone', placeholder: '06 12 34 56 78', required: false },
      { key: 'link', label: 'Lien Lydia (optionnel)', placeholder: 'https://lydia-app.com/collect/...', required: false },
    ],
  },
  cash: {
    label: 'Espèces',
    icon: 'cash-outline',
    description: 'Paiement en main propre',
    fields: [
      { key: 'contact_person', label: 'Personne à contacter', placeholder: 'Jean, le trésorier', required: false },
      { key: 'location', label: 'Lieu de collecte', placeholder: 'Au vestiaire après l\'entrainement', required: false },
    ],
  },
  paylib: {
    label: 'Paylib',
    icon: 'wallet-outline',
    description: 'Paiement via Paylib',
    fields: [
      { key: 'phone', label: 'Numéro de téléphone', placeholder: '06 12 34 56 78', required: true },
    ],
  },
  revolut: {
    label: 'Revolut',
    icon: 'card-outline',
    description: 'Paiement via Revolut',
    fields: [
      { key: 'username', label: 'Nom d\'utilisateur Revolut', placeholder: '@monpseudo', required: false },
      { key: 'link', label: 'Lien Revolut.me (optionnel)', placeholder: 'https://revolut.me/monnom', required: false },
    ],
  },
};

// Liste ordonnée des types de méthodes de paiement
export const PAYMENT_METHOD_TYPES: PaymentMethodType[] = [
  'bank_transfer',
  'lydia',
  'paypal',
  'paylib',
  'revolut',
  'cash',
];
