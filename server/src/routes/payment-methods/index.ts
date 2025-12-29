import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PaymentMethodType } from '@prisma/client';
import { authenticate } from '../../middleware/authenticate.js';
import { requireTeamMember, requireTeamAdmin } from '../../middleware/authorize.js';
import { paymentMethodService } from '../../services/payment-method.service.js';

// Schemas
const upsertPaymentMethodSchema = z.object({
  methodType: z.nativeEnum(PaymentMethodType),
  isEnabled: z.boolean(),
  displayName: z.string().max(100).optional(),
  instructions: z.string().max(500).optional(),
  config: z.record(z.unknown()),
});

export async function paymentMethodRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // GET /teams/:teamId/payment-methods - List team payment methods
  fastify.get(
    '/teams/:teamId/payment-methods',
    { preHandler: [requireTeamMember()] },
    async (request, reply) => {
      const { teamId } = request.params as { teamId: string };
      const query = request.query as { enabledOnly?: string };
      const enabledOnly = query.enabledOnly === 'true';

      const methods = await paymentMethodService.getTeamPaymentMethods(teamId, enabledOnly);
      return reply.send(methods);
    }
  );

  // PUT /teams/:teamId/payment-methods - Upsert payment method
  fastify.put(
    '/teams/:teamId/payment-methods',
    { preHandler: [requireTeamAdmin()] },
    async (request, reply) => {
      try {
        const { teamId } = request.params as { teamId: string };
        const body = upsertPaymentMethodSchema.parse(request.body);

        const method = await paymentMethodService.upsertPaymentMethod(
          teamId,
          request.user!.userId,
          body
        );

        return reply.send(method);
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

  // DELETE /teams/:teamId/payment-methods/:methodType - Delete payment method
  fastify.delete(
    '/teams/:teamId/payment-methods/:methodType',
    { preHandler: [requireTeamAdmin()] },
    async (request, reply) => {
      const { teamId, methodType } = request.params as {
        teamId: string;
        methodType: PaymentMethodType;
      };

      await paymentMethodService.deletePaymentMethod(teamId, methodType);
      return reply.send({ success: true });
    }
  );
}
