import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireTeamMember } from '../../middleware/authorize.js';

export async function activityRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // GET /teams/:teamId/activity - Get team activity log
  fastify.get(
    '/teams/:teamId/activity',
    { preHandler: [requireTeamMember()] },
    async (request, reply) => {
      const { teamId } = request.params as { teamId: string };
      const query = request.query as { limit?: string };
      const limit = query.limit ? parseInt(query.limit, 10) : 50;

      const activities = await prisma.activityLog.findMany({
        where: { teamId },
        include: {
          actor: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
          targetUser: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return reply.send(activities);
    }
  );
}
