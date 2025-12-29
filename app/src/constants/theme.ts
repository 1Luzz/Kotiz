// Theme Kotiz
// Design moderne, fun et adapté aux équipes sportives

export const Colors = {
  // Couleurs principales
  primary: '#6366F1', // Indigo vif
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',

  // Couleurs secondaires
  secondary: '#F59E0B', // Ambre/Or pour les "amendes"
  secondaryLight: '#FBBF24',
  secondaryDark: '#D97706',

  // Couleurs de succès/erreur
  success: '#10B981',
  successLight: '#34D399',
  error: '#EF4444',
  errorLight: '#F87171',
  warning: '#F59E0B',

  // Couleurs de fond
  background: '#0F172A', // Bleu très sombre
  backgroundLight: '#1E293B',
  backgroundCard: '#1E293B',
  surface: '#334155',

  // Textes
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  // Bordures
  border: '#334155',
  borderLight: '#475569',

  // Statuts des amendes
  statusUnpaid: '#EF4444',
  statusPartial: '#F59E0B',
  statusPaid: '#10B981',

  // Catégories d'amendes
  categoryRetard: '#F59E0B',
  categoryAbsence: '#EF4444',
  categoryMateriel: '#3B82F6',
  categoryComportement: '#8B5CF6',
  categoryPerformance: '#EC4899',
  categoryAutre: '#6B7280',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Helper pour les couleurs de catégories
export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    retard: Colors.categoryRetard,
    absence: Colors.categoryAbsence,
    materiel: Colors.categoryMateriel,
    comportement: Colors.categoryComportement,
    performance: Colors.categoryPerformance,
    autre: Colors.categoryAutre,
  };
  return colors[category] || Colors.categoryAutre;
};

// Helper pour les couleurs de statut
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    unpaid: Colors.statusUnpaid,
    partially_paid: Colors.statusPartial,
    paid: Colors.statusPaid,
  };
  return colors[status] || Colors.textMuted;
};

// Labels traduits
export const StatusLabels: Record<string, string> = {
  unpaid: 'Non payé',
  partially_paid: 'Partiel',
  paid: 'Payé',
};

export const CategoryLabels: Record<string, string> = {
  retard: 'Retard',
  absence: 'Absence',
  materiel: 'Matériel',
  comportement: 'Comportement',
  performance: 'Performance',
  autre: 'Autre',
};
