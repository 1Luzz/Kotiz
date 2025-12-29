import { NotificationType } from '@prisma/client';
import { prisma } from '../config/database.js';

export class NotificationService {
  async getUserNotifications(userId: string, limit = 50) {
    return prisma.notification.findMany({
      where: { userId },
      include: {
        team: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotificationError('NOT_FOUND', 'Notification non trouvée');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { success: true };
  }

  async createNotification(data: {
    userId: string;
    teamId?: string;
    type: NotificationType;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        teamId: data.teamId,
        notificationType: data.type,
        title: data.title,
        body: data.body,
        data: (data.metadata || {}) as any,
      },
    });
  }

  async sendPaymentReminder(fineId: string, message?: string) {
    const fine = await prisma.fine.findUnique({
      where: { id: fineId },
      include: {
        team: { select: { name: true } },
        offender: { select: { id: true, displayName: true } },
      },
    });

    if (!fine) {
      throw new NotificationError('FINE_NOT_FOUND', 'Amende non trouvée');
    }

    const notification = await this.createNotification({
      userId: fine.offenderId,
      teamId: fine.teamId,
      type: NotificationType.reminder_unpaid,
      title: `Rappel de paiement - ${fine.team.name}`,
      body: message || `Vous avez une amende impayée de ${fine.amount}€`,
      metadata: { fineId },
    });

    // Update last reminder sent
    await prisma.fine.update({
      where: { id: fineId },
      data: { lastReminderSent: new Date() },
    });

    return notification;
  }

  async sendMemberReminder(teamId: string, memberId: string, message?: string) {
    const [member, team, unpaidFines] = await Promise.all([
      prisma.user.findUnique({ where: { id: memberId } }),
      prisma.team.findUnique({ where: { id: teamId } }),
      prisma.fine.findMany({
        where: { teamId, offenderId: memberId, status: { not: 'paid' } },
      }),
    ]);

    if (!member || !team) {
      throw new NotificationError('NOT_FOUND', 'Membre ou équipe non trouvé');
    }

    if (unpaidFines.length === 0) {
      throw new NotificationError('NO_UNPAID_FINES', 'Aucune amende impayée');
    }

    const totalAmount = unpaidFines.reduce((sum, f) => sum + Number(f.amount) - Number(f.amountPaid), 0);

    const notification = await this.createNotification({
      userId: memberId,
      teamId,
      type: NotificationType.reminder_unpaid,
      title: `Rappel de paiement - ${team.name}`,
      body: message || `Vous avez ${unpaidFines.length} amende(s) impayée(s) pour un total de ${totalAmount.toFixed(2)}€`,
      metadata: { finesCount: unpaidFines.length, totalAmount },
    });

    // Update last reminder sent on all fines
    await prisma.fine.updateMany({
      where: { id: { in: unpaidFines.map((f) => f.id) } },
      data: { lastReminderSent: new Date() },
    });

    return { notification, remindedCount: unpaidFines.length };
  }

  // Notification Settings
  async getSettings(userId: string) {
    let settings = await prisma.userNotificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.userNotificationSettings.create({
        data: { userId },
      });
    }

    return settings;
  }

  async updateSettings(
    userId: string,
    updates: Partial<{
      notificationsEnabled: boolean;
      notifyFineReceived: boolean;
      notifyFinePaid: boolean;
      notifyPaymentRecorded: boolean;
      notifyMemberJoined: boolean;
      notifyMemberLeft: boolean;
      notifyTeamClosed: boolean;
      notifyTeamReopened: boolean;
      notifyReminderUnpaid: boolean;
      reminderIntervalDays: number;
      quietHoursEnabled: boolean;
      quietHoursStart: string;
      quietHoursEnd: string;
    }>
  ) {
    return prisma.userNotificationSettings.upsert({
      where: { userId },
      create: { userId, ...updates },
      update: updates,
    });
  }

  async getTeamSettings(userId: string, teamId: string) {
    let settings = await prisma.userTeamNotificationSettings.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });

    if (!settings) {
      settings = await prisma.userTeamNotificationSettings.create({
        data: { userId, teamId },
      });
    }

    return settings;
  }

  async updateTeamSettings(
    userId: string,
    teamId: string,
    updates: Partial<{
      notificationsEnabled: boolean | null;
      notifyFineReceived: boolean | null;
      notifyFinePaid: boolean | null;
      notifyPaymentRecorded: boolean | null;
      notifyMemberJoined: boolean | null;
      notifyMemberLeft: boolean | null;
      notifyTeamClosed: boolean | null;
      notifyTeamReopened: boolean | null;
      notifyReminderUnpaid: boolean | null;
    }>
  ) {
    return prisma.userTeamNotificationSettings.upsert({
      where: { userId_teamId: { userId, teamId } },
      create: { userId, teamId, ...updates },
      update: updates,
    });
  }
}

export class NotificationError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'NotificationError';
  }
}

export const notificationService = new NotificationService();
