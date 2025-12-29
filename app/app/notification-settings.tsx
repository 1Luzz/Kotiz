import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
  NotificationTypeLabels,
  NotificationTypeDescriptions,
} from '@/hooks/useNotifications';
import { LoadingScreen, useToast } from '@/components/ui';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

type NotificationSettingKey =
  | 'notify_fine_received'
  | 'notify_fine_paid'
  | 'notify_payment_recorded'
  | 'notify_member_joined'
  | 'notify_member_left'
  | 'notify_team_closed'
  | 'notify_team_reopened'
  | 'notify_reminder_unpaid';

const NOTIFICATION_SETTINGS: {
  key: NotificationSettingKey;
  type: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { key: 'notify_fine_received', type: 'fine_received', icon: 'warning', color: Colors.error },
  { key: 'notify_fine_paid', type: 'fine_paid', icon: 'checkmark-circle', color: Colors.success },
  { key: 'notify_payment_recorded', type: 'payment_recorded', icon: 'cash', color: Colors.success },
  { key: 'notify_member_joined', type: 'member_joined', icon: 'person-add', color: Colors.primary },
  { key: 'notify_member_left', type: 'member_left', icon: 'person-remove', color: Colors.warning },
  { key: 'notify_team_closed', type: 'team_closed', icon: 'lock-closed', color: Colors.warning },
  { key: 'notify_team_reopened', type: 'team_reopened', icon: 'lock-open', color: Colors.success },
  { key: 'notify_reminder_unpaid', type: 'reminder_unpaid', icon: 'alarm', color: Colors.secondary },
];

export default function NotificationSettingsScreen() {
  const { data: settings, isLoading } = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();
  const toast = useToast();

  const handleToggleMaster = async (value: boolean) => {
    try {
      await updateSettings.mutateAsync({ notifications_enabled: value });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur';
      toast.showError(message);
    }
  };

  const handleToggleSetting = async (key: NotificationSettingKey, value: boolean) => {
    try {
      await updateSettings.mutateAsync({ [key]: value });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur';
      toast.showError(message);
    }
  };

  const handleToggleQuietHours = async (value: boolean) => {
    try {
      await updateSettings.mutateAsync({ quiet_hours_enabled: value });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur';
      toast.showError(message);
    }
  };

  const handleChangeReminderInterval = async (days: number) => {
    try {
      await updateSettings.mutateAsync({ reminder_interval_days: days });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur';
      toast.showError(message);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Chargement..." />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Notifications',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* MASTER SWITCH */}
        <View style={styles.masterSection}>
          <View style={styles.masterRow}>
            <View style={styles.masterIcon}>
              <Ionicons name="notifications" size={24} color={Colors.primary} />
            </View>
            <View style={styles.masterInfo}>
              <Text style={styles.masterLabel}>Notifications</Text>
              <Text style={styles.masterDesc}>
                {settings?.notifications_enabled
                  ? 'Les notifications sont activees'
                  : 'Les notifications sont desactivees'}
              </Text>
            </View>
            <Switch
              value={settings?.notifications_enabled ?? true}
              onValueChange={handleToggleMaster}
              trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
              thumbColor={settings?.notifications_enabled ? Colors.primary : Colors.textMuted}
            />
          </View>
        </View>

        {/* NOTIFICATION TYPES */}
        {settings?.notifications_enabled && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Types de notifications</Text>
              <Text style={styles.sectionSubtitle}>
                Ces reglages s'appliquent a toutes vos cagnottes par defaut.
                Vous pouvez les personnaliser pour chaque cagnotte dans ses parametres.
              </Text>

              <View style={styles.settingsList}>
                {NOTIFICATION_SETTINGS.map((setting) => (
                  <View key={setting.key} style={styles.settingRow}>
                    <View style={[styles.settingIcon, { backgroundColor: setting.color + '20' }]}>
                      <Ionicons name={setting.icon} size={20} color={setting.color} />
                    </View>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>
                        {NotificationTypeLabels[setting.type]}
                      </Text>
                      <Text style={styles.settingDesc}>
                        {NotificationTypeDescriptions[setting.type]}
                      </Text>
                    </View>
                    <Switch
                      value={settings?.[setting.key] ?? true}
                      onValueChange={(value) => handleToggleSetting(setting.key, value)}
                      trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                      thumbColor={settings?.[setting.key] ? Colors.primary : Colors.textMuted}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* REMINDER INTERVAL */}
            {settings?.notify_reminder_unpaid && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Intervalle de rappel</Text>
                <Text style={styles.sectionSubtitle}>
                  Frequence des rappels automatiques pour les amendes impayees
                </Text>

                <View style={styles.intervalCard}>
                  <View style={styles.intervalRow}>
                    <View style={[styles.settingIcon, { backgroundColor: Colors.secondary + '20' }]}>
                      <Ionicons name="time" size={20} color={Colors.secondary} />
                    </View>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Rappel tous les</Text>
                      <Text style={styles.settingDesc}>
                        Delai entre chaque rappel de paiement
                      </Text>
                    </View>
                  </View>

                  <View style={styles.intervalOptions}>
                    {[3, 7, 14, 30].map((days) => (
                      <TouchableOpacity
                        key={days}
                        style={[
                          styles.intervalOption,
                          settings?.reminder_interval_days === days && styles.intervalOptionActive,
                        ]}
                        onPress={() => handleChangeReminderInterval(days)}
                      >
                        <Text
                          style={[
                            styles.intervalOptionText,
                            settings?.reminder_interval_days === days && styles.intervalOptionTextActive,
                          ]}
                        >
                          {days}j
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* QUIET HOURS */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Heures calmes</Text>

              <View style={styles.quietHoursCard}>
                <View style={styles.quietHoursRow}>
                  <View style={[styles.settingIcon, { backgroundColor: Colors.secondary + '20' }]}>
                    <Ionicons name="moon" size={20} color={Colors.secondary} />
                  </View>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Mode silencieux</Text>
                    <Text style={styles.settingDesc}>
                      Pas de notifications pendant ces heures
                    </Text>
                  </View>
                  <Switch
                    value={settings?.quiet_hours_enabled ?? false}
                    onValueChange={handleToggleQuietHours}
                    trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                    thumbColor={settings?.quiet_hours_enabled ? Colors.primary : Colors.textMuted}
                  />
                </View>

                {settings?.quiet_hours_enabled && (
                  <View style={styles.quietHoursTime}>
                    <View style={styles.timeRow}>
                      <Text style={styles.timeLabel}>De</Text>
                      <View style={styles.timeValue}>
                        <Text style={styles.timeText}>
                          {settings?.quiet_hours_start || '22:00'}
                        </Text>
                      </View>
                      <Text style={styles.timeLabel}>a</Text>
                      <View style={styles.timeValue}>
                        <Text style={styles.timeText}>
                          {settings?.quiet_hours_end || '08:00'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </>
        )}

        {/* INFO */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={Colors.primary} />
          <Text style={styles.infoText}>
            Chaque cagnotte peut avoir ses propres reglages de notification.
            Accedez aux parametres de la cagnotte pour les personnaliser.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  headerBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  masterSection: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  masterIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  masterInfo: {
    flex: 1,
  },
  masterLabel: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  masterDesc: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  settingsList: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  settingLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  settingDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  intervalCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  intervalOptions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  intervalOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  intervalOptionActive: {
    backgroundColor: Colors.primary,
  },
  intervalOptionText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  intervalOptionTextActive: {
    color: Colors.background,
  },
  quietHoursCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  quietHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  quietHoursTime: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  timeLabel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  timeValue: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  timeText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primary + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
