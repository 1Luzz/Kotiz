-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('admin', 'treasurer', 'member');

-- CreateEnum
CREATE TYPE "FineStatus" AS ENUM ('unpaid', 'partially_paid', 'paid');

-- CreateEnum
CREATE TYPE "FineCategory" AS ENUM ('retard', 'absence', 'materiel', 'comportement', 'performance', 'autre');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('team_created', 'member_joined', 'member_left', 'rule_created', 'rule_updated', 'fine_issued', 'fine_updated', 'fine_deleted', 'payment_recorded', 'expense_recorded', 'dispute_created', 'dispute_resolved');

-- CreateEnum
CREATE TYPE "FinePermission" AS ENUM ('admin_only', 'treasurer', 'everyone');

-- CreateEnum
CREATE TYPE "DisputeMode" AS ENUM ('simple', 'community');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('pending', 'approved', 'rejected', 'auto_approved');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('bank_transfer', 'paypal', 'lydia', 'cash', 'paylib', 'revolut');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('fine_received', 'fine_paid', 'payment_recorded', 'member_joined', 'member_left', 'team_closed', 'team_reopened', 'reminder_unpaid', 'dispute_created', 'dispute_resolved');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('nourriture', 'boisson', 'materiel', 'evenement', 'autre');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sport" TEXT,
    "photo_url" TEXT,
    "invite_code" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "allow_custom_fines" BOOLEAN NOT NULL DEFAULT true,
    "fine_permission" "FinePermission" NOT NULL DEFAULT 'everyone',
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "dispute_enabled" BOOLEAN NOT NULL DEFAULT false,
    "dispute_mode" "DisputeMode",
    "dispute_votes_required" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'member',
    "credit" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fine_rules" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" "FineCategory" NOT NULL DEFAULT 'autre',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fine_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fines" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "rule_id" TEXT,
    "offender_id" TEXT NOT NULL,
    "issued_by_id" TEXT NOT NULL,
    "custom_label" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "FineStatus" NOT NULL DEFAULT 'unpaid',
    "note" TEXT,
    "last_reminder_sent" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "fine_id" TEXT,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" TEXT,
    "note" TEXT,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT,
    "activity_type" "ActivityType" NOT NULL,
    "target_user_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_payment_methods" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "method_type" "PaymentMethodType" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "display_name" TEXT,
    "instructions" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fine_disputes" (
    "id" TEXT NOT NULL,
    "fine_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "disputed_by" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'pending',
    "resolved_by" TEXT,
    "resolution_note" TEXT,
    "votes_count" INTEGER NOT NULL DEFAULT 0,
    "votes_required" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "fine_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fine_dispute_votes" (
    "id" TEXT NOT NULL,
    "dispute_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vote" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fine_dispute_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "team_id" TEXT,
    "notification_type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notification_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "notify_fine_received" BOOLEAN NOT NULL DEFAULT true,
    "notify_fine_paid" BOOLEAN NOT NULL DEFAULT true,
    "notify_payment_recorded" BOOLEAN NOT NULL DEFAULT true,
    "notify_member_joined" BOOLEAN NOT NULL DEFAULT true,
    "notify_member_left" BOOLEAN NOT NULL DEFAULT true,
    "notify_team_closed" BOOLEAN NOT NULL DEFAULT true,
    "notify_team_reopened" BOOLEAN NOT NULL DEFAULT true,
    "notify_reminder_unpaid" BOOLEAN NOT NULL DEFAULT true,
    "reminder_interval_days" INTEGER NOT NULL DEFAULT 7,
    "quiet_hours_enabled" BOOLEAN NOT NULL DEFAULT false,
    "quiet_hours_start" TEXT NOT NULL DEFAULT '22:00',
    "quiet_hours_end" TEXT NOT NULL DEFAULT '08:00',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_team_notification_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "notifications_enabled" BOOLEAN,
    "notify_fine_received" BOOLEAN,
    "notify_fine_paid" BOOLEAN,
    "notify_payment_recorded" BOOLEAN,
    "notify_member_joined" BOOLEAN,
    "notify_member_left" BOOLEAN,
    "notify_team_closed" BOOLEAN,
    "notify_team_reopened" BOOLEAN,
    "notify_reminder_unpaid" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_team_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'autre',
    "recorded_by" TEXT NOT NULL,
    "receipt_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "teams_invite_code_key" ON "teams"("invite_code");

-- CreateIndex
CREATE INDEX "teams_invite_code_idx" ON "teams"("invite_code");

-- CreateIndex
CREATE INDEX "teams_created_by_idx" ON "teams"("created_by");

-- CreateIndex
CREATE INDEX "team_members_team_id_idx" ON "team_members"("team_id");

-- CreateIndex
CREATE INDEX "team_members_user_id_idx" ON "team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");

-- CreateIndex
CREATE INDEX "fine_rules_team_id_idx" ON "fine_rules"("team_id");

-- CreateIndex
CREATE INDEX "fine_rules_team_id_is_active_idx" ON "fine_rules"("team_id", "is_active");

-- CreateIndex
CREATE INDEX "fines_team_id_idx" ON "fines"("team_id");

-- CreateIndex
CREATE INDEX "fines_offender_id_idx" ON "fines"("offender_id");

-- CreateIndex
CREATE INDEX "fines_issued_by_id_idx" ON "fines"("issued_by_id");

-- CreateIndex
CREATE INDEX "fines_status_idx" ON "fines"("status");

-- CreateIndex
CREATE INDEX "fines_created_at_idx" ON "fines"("created_at");

-- CreateIndex
CREATE INDEX "payments_team_id_idx" ON "payments"("team_id");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_fine_id_idx" ON "payments"("fine_id");

-- CreateIndex
CREATE INDEX "payments_created_at_idx" ON "payments"("created_at");

-- CreateIndex
CREATE INDEX "activity_log_team_id_idx" ON "activity_log"("team_id");

-- CreateIndex
CREATE INDEX "activity_log_created_at_idx" ON "activity_log"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "team_payment_methods_team_id_method_type_key" ON "team_payment_methods"("team_id", "method_type");

-- CreateIndex
CREATE UNIQUE INDEX "fine_disputes_fine_id_key" ON "fine_disputes"("fine_id");

-- CreateIndex
CREATE INDEX "fine_disputes_team_id_idx" ON "fine_disputes"("team_id");

-- CreateIndex
CREATE INDEX "fine_disputes_status_idx" ON "fine_disputes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fine_dispute_votes_dispute_id_user_id_key" ON "fine_dispute_votes"("dispute_id", "user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_settings_user_id_key" ON "user_notification_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_team_notification_settings_user_id_team_id_key" ON "user_team_notification_settings"("user_id", "team_id");

-- CreateIndex
CREATE INDEX "expenses_team_id_idx" ON "expenses"("team_id");

-- CreateIndex
CREATE INDEX "expenses_created_at_idx" ON "expenses"("created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fine_rules" ADD CONSTRAINT "fine_rules_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fine_rules" ADD CONSTRAINT "fine_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "fine_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_offender_id_fkey" FOREIGN KEY ("offender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_fine_id_fkey" FOREIGN KEY ("fine_id") REFERENCES "fines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_payment_methods" ADD CONSTRAINT "team_payment_methods_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_payment_methods" ADD CONSTRAINT "team_payment_methods_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fine_disputes" ADD CONSTRAINT "fine_disputes_fine_id_fkey" FOREIGN KEY ("fine_id") REFERENCES "fines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fine_disputes" ADD CONSTRAINT "fine_disputes_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fine_disputes" ADD CONSTRAINT "fine_disputes_disputed_by_fkey" FOREIGN KEY ("disputed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fine_disputes" ADD CONSTRAINT "fine_disputes_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fine_dispute_votes" ADD CONSTRAINT "fine_dispute_votes_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "fine_disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fine_dispute_votes" ADD CONSTRAINT "fine_dispute_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_settings" ADD CONSTRAINT "user_notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_team_notification_settings" ADD CONSTRAINT "user_team_notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_team_notification_settings" ADD CONSTRAINT "user_team_notification_settings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
