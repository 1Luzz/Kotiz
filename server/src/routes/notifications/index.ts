import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { requireTeamMember, requireTeamAdmin } from '../../middleware/authorize.js';
import { notificationService, NotificationError } from '../../services/notification.service.js';

// Schemas
const updateSettingsSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  notifyFineReceived: z.boolean().optional(),
  notifyFinePaid: z.boolean().optional(),
  notifyPaymentRecorded: z.boolean().optional(),
  notifyMemberJoined: z.boolean().optional(),
  notifyMemberLeft: z.boolean().optional(),
  notifyTeamClosed: z.boolean().optional(),
  notifyTeamReopened: z.boolean().optional(),
  notifyReminderUnpaid: z.boolean().optional(),
  reminderIntervalDays: z.number().int().min(1).max(30).optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

const updateTeamSettingsSchema = z.object({
  notificationsEnabled: z.boolean().nullable().optional(),
  notifyFineReceived: z.boolean().nullable().optional(),
  notifyFinePaid: z.boolean().nullable().optional(),
  notifyPaymentRecorded: z.boolean().nullable().optional(),
  notifyMemberJoined: z.boolean().nullable().optional(),
  notifyMemberLeft: z.boolean().nullable().optional(),
  notifyTeamClosed: z.boolean().nullable().optional(),
  notifyTeamReopened: z.boolean().nullable().optional(),
  notifyReminderUnpaid: z.boolean().nullable().optional(),
});

const sendReminderSchema = z.object({
  message: z.string().max(500).optional(),
});

export async function notificationRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // GET /notifications - Get user notifications
  fastify.get('/notifications', async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 50;

    const notifications = await notificationService.getUserNotifications(
      request.user!.userId,
      limit
    );

    return reply.send(notifications);
  });

  // GET /notifications/unread-count - Get unread count
  fastify.get('/notifications/unread-count', async (request, reply) => {
    const count = await notificationService.getUnreadCount(request.user!.userId);
    return reply.send({ count });
  });

  // POST /notifications/:id/read - Mark as read
  fastify.post('/notifications/:id/read', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const notification = await notificationService.markAsRead(id, request.user!.userId);
      return reply.send(notification);
    } catch (error) {
      if (error instanceof NotificationError) {
        return reply.status(404).send({
          error: error.code,
          message: error.message,
        });
      }
      throw error;
    }
  });

  // POST /notifications/mark-all-read - Mark all as read
  fastify.post('/notifications/mark-all-read', async (request, reply) => {
    const result = await notificationService.markAllAsRead(request.user!.userId);
    return reply.send(result);
  });

  // GET /notifications/settings - Get notification settings
  fastify.get('/notifications/settings', async (request, reply) => {
    const settings = await notificationService.getSettings(request.user!.userId);
    return reply.send(settings);
  });

  // PATCH /notifications/settings - Update notification settings
  fastify.patch('/notifications/settings', async (request, reply) => {
    try {
      const body = updateSettingsSchema.parse(request.body);
      const settings = await notificationService.updateSettings(request.user!.userId, body);
      return reply.send(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: error.errors[0].message,
        });
      }
      throw error;
    }
  });

  // GET /teams/:teamId/notification-settings - Get team notification settings
  fastify.get(
    '/teams/:teamId/notification-settings',
    { preHandler: [requireTeamMember()] },
    async (request, reply) => {
      const { teamId } = request.params as { teamId: string };
      const settings = await notificationService.getTeamSettings(request.user!.userId, teamId);
      return reply.send(settings);
    }
  );

  // PATCH /teams/:teamId/notification-settings - Update team notification settings
  fastify.patch(
    '/teams/:teamId/notification-settings',
    { preHandler: [requireTeamMember()] },
    async (request, reply) => {
      try {
        const { teamId } = request.params as { teamId: string };
        const body = updateTeamSettingsSchema.parse(request.body);
        const settings = await notificationService.updateTeamSettings(
          request.user!.userId,
          teamId,
          body
        );
        return reply.send(settings);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'VALIDATION_ERROR',
            message: error.errors[0].message,
          });
        }
        throw error;
      }
    }
  );

  // POST /fines/:fineId/reminder - Send payment reminder for a fine
  fastify.post('/fines/:fineId/reminder', async (request, reply) => {
    try {
      const { fineId } = request.params as { fineId: string };
      const body = sendReminderSchema.parse(request.body || {});
      const notification = await notificationService.sendPaymentReminder(fineId, body.message);
      return reply.status(201).send(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: error.errors[0].message,
        });
      }
      if (error instanceof NotificationError) {
        return reply.status(400).send({
          error: error.code,
          message: error.message,
        });
      }
      throw error;
    }
  });

  // POST /teams/:teamId/members/:userId/reminder - Send reminder to member
  fastify.post(
    '/teams/:teamId/members/:userId/reminder',
    { preHandler: [requireTeamAdmin()] },
    async (request, reply) => {
      try {
        const { teamId, userId } = request.params as { teamId: string; userId: string };
        const body = sendReminderSchema.parse(request.body || {});
        const result = await notificationService.sendMemberReminder(teamId, userId, body.message);
        return reply.status(201).send(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'VALIDATION_ERROR',
            message: error.errors[0].message,
          });
        }
        if (error instanceof NotificationError) {
          return reply.status(400).send({
            error: error.code,
            message: error.message,
          });
        }
        throw error;
      }
    }
  );
}
