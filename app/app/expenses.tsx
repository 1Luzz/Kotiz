import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useExpenses, ExpenseCategory, ExpenseCategoryLabels } from '@/hooks/useExpenses';
import { useTeam, useTeamMembers } from '@/hooks/useTeams';
import { useAuthStore } from '@/lib/store';
import { Avatar, EmptyState, LoadingScreen, Card } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

type FilterCategory = ExpenseCategory | 'all';

const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  nourriture: 'fast-food-outline',
  boisson: 'beer-outline',
  materiel: 'football-outline',
  evenement: 'calendar-outline',
  autre: 'ellipsis-horizontal-outline',
};

const FILTER_OPTIONS: { id: FilterCategory; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'nourriture', label: 'Nourriture' },
  { id: 'boisson', label: 'Boissons' },
  { id: 'materiel', label: 'Materiel' },
  { id: 'evenement', label: 'Evenement' },
  { id: 'autre', label: 'Autre' },
];

export default function ExpensesScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { user } = useAuthStore();
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');

  const { data: team, isLoading: teamLoading } = useTeam(teamId);
  const { data: expenses, isLoading: expensesLoading, refetch } = useExpenses(teamId);
  const { data: members } = useTeamMembers(teamId);

  const currentUserRole = members?.find((m) => m.user_id === user?.id)?.role;
  const isAdmin = currentUserRole === 'admin';
  const isTreasurer = currentUserRole === 'treasurer';
  const canAddExpense = isAdmin || isTreasurer;

  const isLoading = teamLoading || expensesLoading;

  // Filtrer par categorie
  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    if (categoryFilter === 'all') return expenses;
    return expenses.filter((e) => e.category === categoryFilter);
  }, [expenses, categoryFilter]);

  // Stats
  const totalExpenses = useMemo(() => {
    return expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  }, [expenses]);

  const expensesByCategory = useMemo(() => {
    if (!expenses) return {};
    return expenses.reduce((acc, e) => {
      const cat = e.category || 'autre';
      acc[cat] = (acc[cat] || 0) + Number(e.amount);
      return acc;
    }, {} as Record<string, number>);
  }, [expenses]);

  if (isLoading) {
    return <LoadingScreen message="Chargement..." />;
  }

  const renderExpenseItem = ({ item }: { item: typeof filteredExpenses[0] }) => {
    const categoryIcon = CATEGORY_ICONS[item.category as ExpenseCategory] || 'ellipsis-horizontal-outline';

    return (
      <View style={styles.expenseItem}>
        <View style={[styles.expenseIcon, { backgroundColor: Colors.secondary + '20' }]}>
          <Ionicons name={categoryIcon as any} size={20} color={Colors.secondary} />
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseDescription} numberOfLines={1}>
            {item.description}
          </Text>
          <View style={styles.expenseMetaRow}>
            <Avatar source={item.recorded_by_avatar} name={item.recorded_by_name || 'Inconnu'} size="xs" />
            <Text style={styles.expenseRecorder}>{item.recorded_by_name || 'Inconnu'}</Text>
            <Text style={styles.expenseDot}>•</Text>
            <Text style={styles.expenseDate}>
              {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>
        <Text style={styles.expenseAmount}>-{Number(item.amount).toFixed(0)}€</Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Depenses',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () =>
            canAddExpense && !team?.is_closed ? (
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/add-expense', params: { teamId } })}
                style={styles.headerBtn}
              >
                <Ionicons name="add" size={28} color={Colors.primary} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpenseItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="wallet-outline"
            title={categoryFilter === 'all' ? 'Aucune depense' : `Aucune depense "${ExpenseCategoryLabels[categoryFilter as ExpenseCategory]}"`}
            description={
              categoryFilter === 'all'
                ? "Les depenses de la cagnotte apparaitront ici."
                : "Aucune depense dans cette categorie."
            }
            actionLabel={categoryFilter !== 'all' ? 'Voir toutes' : canAddExpense ? 'Ajouter une depense' : undefined}
            onAction={
              categoryFilter !== 'all'
                ? () => setCategoryFilter('all')
                : canAddExpense
                ? () => router.push({ pathname: '/add-expense', params: { teamId } })
                : undefined
            }
          />
        }
        ListHeaderComponent={
          <>
            {/* Stats Card */}
            <Card style={styles.statsCard}>
              <View style={styles.statsHeader}>
                <View style={[styles.statsIcon, { backgroundColor: Colors.secondary + '20' }]}>
                  <Ionicons name="trending-down" size={24} color={Colors.secondary} />
                </View>
                <View style={styles.statsInfo}>
                  <Text style={styles.statsLabel}>Total des depenses</Text>
                  <Text style={styles.statsValue}>{totalExpenses.toFixed(0)}€</Text>
                </View>
              </View>

              {/* Breakdown by category */}
              {Object.keys(expensesByCategory).length > 0 && (
                <View style={styles.categoryBreakdown}>
                  {Object.entries(expensesByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, amount]) => (
                      <View key={cat} style={styles.categoryRow}>
                        <Ionicons
                          name={CATEGORY_ICONS[cat as ExpenseCategory] as any}
                          size={16}
                          color={Colors.textSecondary}
                        />
                        <Text style={styles.categoryLabel}>
                          {ExpenseCategoryLabels[cat as ExpenseCategory] || cat}
                        </Text>
                        <Text style={styles.categoryAmount}>{amount.toFixed(0)}€</Text>
                      </View>
                    ))}
                </View>
              )}
            </Card>

            {/* Filter tabs */}
            {expenses && expenses.length > 0 && (
              <View style={styles.filterContainer}>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={FILTER_OPTIONS}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.filterTab, categoryFilter === item.id && styles.filterTabActive]}
                      onPress={() => setCategoryFilter(item.id)}
                    >
                      <Text
                        style={[styles.filterTabText, categoryFilter === item.id && styles.filterTabTextActive]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={styles.filterList}
                />
              </View>
            )}

            {/* Results count */}
            {expenses && expenses.length > 0 && (
              <Text style={styles.resultsCount}>
                {filteredExpenses.length} depense{filteredExpenses.length > 1 ? 's' : ''}
                {categoryFilter !== 'all' && ` • ${ExpenseCategoryLabels[categoryFilter as ExpenseCategory]}`}
              </Text>
            )}
          </>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    padding: Spacing.xs,
    marginHorizontal: Spacing.sm,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    flexGrow: 1,
  },

  // Stats Card
  statsCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.secondary + '08',
    borderWidth: 1,
    borderColor: Colors.secondary + '20',
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsInfo: {
    flex: 1,
  },
  statsLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  statsValue: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.secondary,
  },
  categoryBreakdown: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryLabel: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  categoryAmount: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },

  // Filters
  filterContainer: {
    marginBottom: Spacing.md,
  },
  filterList: {
    gap: Spacing.xs,
  },
  filterTab: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundLight,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  resultsCount: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },

  // Expense Item
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  expenseDescription: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  expenseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  expenseRecorder: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  expenseDot: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  expenseDate: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  expenseAmount: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.secondary,
  },
});
