// Types générés depuis le schéma Supabase

export type TeamRole = 'admin' | 'treasurer' | 'member';
export type FineStatus = 'unpaid' | 'partially_paid' | 'paid';
export type FineCategory = 'retard' | 'absence' | 'materiel' | 'comportement' | 'performance' | 'autre';
export type PaymentMethodType = 'bank_transfer' | 'paypal' | 'lydia' | 'cash' | 'paylib' | 'revolut';
export type ActivityType =
  | 'team_created'
  | 'member_joined'
  | 'member_left'
  | 'rule_created'
  | 'rule_updated'
  | 'fine_issued'
  | 'fine_updated'
  | 'payment_recorded';

// Tables de base
export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type FinePermission = 'admin_only' | 'treasurer' | 'everyone';
export type DisputeMode = 'simple' | 'community';
export type DisputeStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved';

export interface Team {
  id: string;
  name: string;
  description: string | null;
  sport: string | null;
  photo_url: string | null;
  invite_code: string;
  created_by: string;
  allow_custom_fines: boolean;
  fine_permission: FinePermission;
  is_closed: boolean;
  dispute_enabled: boolean;
  dispute_mode: DisputeMode | null;
  dispute_votes_required: number | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
  credit: number;
  is_deleted: boolean;
}

export interface FineRule {
  id: string;
  team_id: string;
  label: string;
  amount: number;
  category: FineCategory;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Fine {
  id: string;
  team_id: string;
  rule_id: string | null;
  offender_id: string;
  issued_by_id: string;
  custom_label: string | null;
  amount: number;
  amount_paid: number;
  status: FineStatus;
  note: string | null;
  last_reminder_sent: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  team_id: string;
  fine_id: string | null;
  user_id: string;
  amount: number;
  method: string | null;
  note: string | null;
  recorded_by: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  team_id: string;
  user_id: string | null;
  activity_type: ActivityType;
  target_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Contestation d'amendes
export interface FineDispute {
  id: string;
  fine_id: string;
  team_id: string;
  disputed_by: string;
  reason: string;
  status: DisputeStatus;
  resolved_by: string | null;
  resolution_note: string | null;
  votes_count: number;
  votes_required: number;
  created_at: string;
  resolved_at: string | null;
}

export interface FineDisputeVote {
  id: string;
  dispute_id: string;
  user_id: string;
  vote: boolean;
  created_at: string;
}

export interface FineDisputeWithDetails extends FineDispute {
  fine_amount: number;
  fine_label: string | null;
  disputed_by_name: string;
  disputed_by_avatar: string | null;
  offender_name: string;
  offender_avatar: string | null;
  resolved_by_name: string | null;
  team_dispute_mode: DisputeMode;
}

// Configuration spécifique par type de méthode de paiement
export interface BankTransferConfig {
  beneficiary_name: string;
  iban: string;
  bic?: string;
}

export interface PaypalConfig {
  email?: string;
  link?: string;
  username?: string;
}

export interface LydiaConfig {
  phone?: string;
  link?: string;
}

export interface CashConfig {
  location?: string;
  contact_person?: string;
}

export interface PaylibConfig {
  phone: string;
}

export interface RevolutConfig {
  username?: string;
  link?: string;
}

export type PaymentMethodConfig =
  | BankTransferConfig
  | PaypalConfig
  | LydiaConfig
  | CashConfig
  | PaylibConfig
  | RevolutConfig;

export interface TeamPaymentMethod {
  id: string;
  team_id: string;
  method_type: PaymentMethodType;
  is_enabled: boolean;
  display_name: string | null;
  instructions: string | null;
  config: PaymentMethodConfig;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Vues et types enrichis
export interface FineWithDetails extends Fine {
  offender_name: string;
  offender_avatar: string | null;
  issued_by_name: string;
  issued_by_avatar: string | null;
  rule_label: string | null;
  rule_category: FineCategory | null;
}

export interface TeamMemberWithDetails extends TeamMember {
  display_name: string;
  avatar_url: string | null;
  email: string;
  is_deleted: boolean;
}

export interface ActivityLogWithDetails extends ActivityLog {
  actor_name: string | null;
  actor_avatar: string | null;
  target_name: string | null;
  target_avatar: string | null;
}

export interface TeamBalance {
  team_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: TeamRole;
  total_fines: number;
  total_paid: number;
  balance: number;
  fines_count: number;
  unpaid_count: number;
}

// Types pour les fonctions RPC
export interface UserBalance {
  total_fines: number;
  total_paid: number;
  balance: number;
  fines_count: number;
  unpaid_count: number;
}

export interface TeamStats {
  total_pot: number;
  total_collected: number;
  total_pending: number;
  total_fines: number;
  total_members: number;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_fines: number;
  fines_count: number;
  amount_paid: number;
  credit: number;
  is_deleted: boolean;
}

// Types Supabase Database
// Note: Ce typage est simplifié pour permettre les opérations CRUD et RPC
// sans erreurs de compilation. Les types réels sont validés côté serveur.
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Partial<User>;
        Update: Partial<User>;
      };
      teams: {
        Row: Team;
        Insert: Partial<Team>;
        Update: Partial<Team>;
      };
      team_members: {
        Row: TeamMember;
        Insert: Partial<TeamMember>;
        Update: Partial<TeamMember>;
      };
      fine_rules: {
        Row: FineRule;
        Insert: Partial<FineRule>;
        Update: Partial<FineRule>;
      };
      fines: {
        Row: Fine;
        Insert: Partial<Fine>;
        Update: Partial<Fine>;
      };
      payments: {
        Row: Payment;
        Insert: Partial<Payment>;
        Update: Partial<Payment>;
      };
      activity_log: {
        Row: ActivityLog;
        Insert: Partial<ActivityLog>;
        Update: Partial<ActivityLog>;
      };
      team_payment_methods: {
        Row: TeamPaymentMethod;
        Insert: Partial<TeamPaymentMethod>;
        Update: Partial<TeamPaymentMethod>;
      };
      fine_disputes: {
        Row: FineDispute;
        Insert: Partial<FineDispute>;
        Update: Partial<FineDispute>;
      };
      fine_dispute_votes: {
        Row: FineDisputeVote;
        Insert: Partial<FineDisputeVote>;
        Update: Partial<FineDisputeVote>;
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification>;
        Update: Partial<Notification>;
      };
      user_notification_settings: {
        Row: UserNotificationSettings;
        Insert: Partial<UserNotificationSettings>;
        Update: Partial<UserNotificationSettings>;
      };
      user_team_notification_settings: {
        Row: UserTeamNotificationSettings;
        Insert: Partial<UserTeamNotificationSettings>;
        Update: Partial<UserTeamNotificationSettings>;
      };
      expenses: {
        Row: Expense;
        Insert: Partial<Expense>;
        Update: Partial<Expense>;
      };
    };
    Views: {
      fines_with_details: {
        Row: FineWithDetails;
      };
      team_members_with_details: {
        Row: TeamMemberWithDetails;
      };
      activity_log_with_details: {
        Row: ActivityLogWithDetails;
      };
      team_balances: {
        Row: TeamBalance;
      };
      fine_disputes_with_details: {
        Row: FineDisputeWithDetails;
      };
      expenses_with_details: {
        Row: ExpenseWithDetails;
      };
    };
    Functions: Record<string, {
      Args: Record<string, unknown>;
      Returns: unknown;
    }>;
  };
}

// Type pour les dépenses (utilisé dans useExpenses.ts)
export type ExpenseCategory = 'nourriture' | 'boisson' | 'materiel' | 'evenement' | 'autre';

export interface Expense {
  id: string;
  team_id: string;
  amount: number;
  description: string;
  category: ExpenseCategory;
  recorded_by: string;
  receipt_url: string | null;
  created_at: string;
}

export interface ExpenseWithDetails extends Expense {
  recorded_by_name: string;
  recorded_by_avatar: string | null;
}

// Notification types
export type NotificationType =
  | 'fine_received'
  | 'fine_paid'
  | 'payment_recorded'
  | 'member_joined'
  | 'member_left'
  | 'team_closed'
  | 'team_reopened'
  | 'reminder_unpaid';

export interface UserNotificationSettings {
  id: string;
  user_id: string;
  notifications_enabled: boolean;
  notify_fine_received: boolean;
  notify_fine_paid: boolean;
  notify_payment_recorded: boolean;
  notify_member_joined: boolean;
  notify_member_left: boolean;
  notify_team_closed: boolean;
  notify_team_reopened: boolean;
  notify_reminder_unpaid: boolean;
  reminder_interval_days: number;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at: string;
  updated_at: string;
}

export interface UserTeamNotificationSettings {
  id: string;
  user_id: string;
  team_id: string;
  notifications_enabled: boolean | null;
  notify_fine_received: boolean | null;
  notify_fine_paid: boolean | null;
  notify_payment_recorded: boolean | null;
  notify_member_joined: boolean | null;
  notify_member_left: boolean | null;
  notify_team_closed: boolean | null;
  notify_team_reopened: boolean | null;
  notify_reminder_unpaid: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  team_id: string | null;
  notification_type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationWithTeam extends Notification {
  team_name?: string;
}
