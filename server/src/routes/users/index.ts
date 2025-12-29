import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authService } from '../../services/auth.service.js';

const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export async function userRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // GET /users/me
  fastify.get('/me', async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return reply.status(404).send({
        error: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    return reply.send(user);
  });

  // PATCH /users/me
  fastify.patch('/me', async (request, reply) => {
    try {
      const body = updateProfileSchema.parse(request.body);
      const userId = request.user!.userId;

      // Check display name availability if being changed
      if (body.displayName) {
        const available = await authService.checkDisplayNameAvailable(body.displayName, userId);
        if (!available) {
          return reply.status(400).send({
            error: 'DISPLAY_NAME_TAKEN',
            message: 'Ce pseudo est déjà utilisé',
          });
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: body,
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return reply.send(user);
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
}
