import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth/index.js';
import { userRoutes } from './users/index.js';
import { teamRoutes } from './teams/index.js';
import { fineRoutes } from './fines/index.js';
import { activityRoutes } from './activity/index.js';
import { disputeRoutes } from './disputes/index.js';
import { notificationRoutes } from './notifications/index.js';
import { expenseRoutes } from './expenses/index.js';
import { paymentMethodRoutes } from './payment-methods/index.js';
import { uploadRoutes } from './uploads/index.js';

export async function registerRoutes(fastify: FastifyInstance) {
  // Auth routes
  await fastify.register(authRoutes, { prefix: '/auth' });

  // User routes
  await fastify.register(userRoutes, { prefix: '/users' });

  // Team routes
  await fastify.register(teamRoutes, { prefix: '/teams' });

  // Fine routes (includes rules, fines, payments)
  await fastify.register(fineRoutes);

  // Activity routes
  await fastify.register(activityRoutes);

  // Dispute routes
  await fastify.register(disputeRoutes);

  // Notification routes
  await fastify.register(notificationRoutes);

  // Expense routes
  await fastify.register(expenseRoutes);

  // Payment method routes
  await fastify.register(paymentMethodRoutes);

  // Upload routes
  await fastify.register(uploadRoutes);

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
}
