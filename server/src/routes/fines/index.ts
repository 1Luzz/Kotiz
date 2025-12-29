import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FineCategory } from '@prisma/client';
import { authenticate } from '../../middleware/authenticate.js';
import { requireTeamMember, requireTeamAdmin } from '../../middleware/authorize.js';
import { fineService, FineError } from '../../services/fine.service.js';
import { serializeDecimal } from '../../utils/serializer.js';

// Schemas
const createRuleSchema = z.object({
  label: z.string().min(2).max(100),
  amount: z.number().positive(),
  category: z.nativeEnum(FineCategory).optional(),
});

const updateRuleSchema = z.object({
  label: z.string().min(2).max(100).optional(),
  amount: z.number().positive().optional(),
  category: z.nativeEnum(FineCategory).optional(),
  isActive: z.boolean().optional(),
});

const createFineSchema = z.object({
  offenderId: z.string().uuid(),
  ruleId: z.string().uuid().optional(),
  customLabel: z.string().min(2).max(100).optional(),
  amount: z.number().positive().optional(),
  note: z.string().max(500).optional(),
});

const recordPaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.string().max(50).optional(),
  note: z.string().max(500).optional(),
});

const recordMemberPaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.string().max(50).optional(),
  note: z.string().max(500).optional(),
});

export async function fineRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // ============================================================================
  // FINE RULES
  // ============================================================================

  // GET /teams/:teamId/rules
  fastify.get(
    '/teams/:teamId/rules',
    { preHandler: [requireTeamMember()] },
    async (request, reply) => {
      const { teamId } = request.params as { teamId: string };
      const rules = await fineService.getFineRules(teamId);
      return reply.send(serializeDecimal(rules));
    }
  );

  // POST /teams/:teamId/rules
  fastify.post(
    '/teams/:teamId/rules',
    { preHandler: [requireTeamAdmin()] },
    async (request, reply) => {
      try {
        const { teamId } = request.params as { teamId: string };
        const body = createRuleSchema.parse(request.body);
        const rule = await fineService.createFineRule(teamId, request.user!.userId, body);
        return reply.status(201).send(serializeDecimal(rule));
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

  // PATCH /teams/:teamId/rules/:ruleId
  fastify.patch(
    '/teams/:teamId/rules/:ruleId',
    { preHandler: [requireTeamAdmin()] },
    async (request, reply) => {
      try {
        const { ruleId } = request.params as { ruleId: string };
        const body = updateRuleSchema.parse(request.body);
        const rule = await fineService.updateFineRule(ruleId, body);
        return reply.send(serializeDecimal(rule));
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

  // DELETE /teams/:teamId/rules/:ruleId
  fastify.delete(
    '/teams/:teamId/rules/:ruleId',
    { preHandler: [requireTeamAdmin()] },
    async (request, reply) => {
      const { ruleId } = request.params as { ruleId: string };
      await fineService.deleteFineRule(ruleId);
      return reply.send({ success: true });
    }
  );

  // ============================================================================
  // FINES
  // ============================================================================

  // GET /teams/:teamId/fines
  fastify.get(
    '/teams/:teamId/fines',
    { preHandler: [requireTeamMember()] },
    async (request, reply) => {
      const { teamId } = request.params as { teamId: string };
      const query = request.query as { userId?: string };

      if (query.userId) {
        const fines = await fineService.getUserFines(teamId, query.userId);
        return reply.send(serializeDecimal(fines));
      }

      const fines = await fineService.getTeamFines(teamId);
      return reply.send(serializeDecimal(fines));
    }
  );

  // GET /teams/:teamId/fines/:fineId
  fastify.get(
    '/teams/:teamId/fines/:fineId',
    { preHandler: [requireTeamMember()] },
    async (request, reply) => {
      const { fineId } = request.params as { fineId: string };
      const fine = await fineService.getFine(fineId);

      if (!fine) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Amende non trouvée',
        });
      }

      return reply.send(serializeDecimal(fine));
    }
  );

  // POST /teams/:teamId/fines
  fastify.post(
    '/teams/:teamId/fines',
    { preHandler: [requireTeamMember()] },
    async (request, reply) => {
      try {
        const { teamId } = request.params as { teamId: string };
        const body = createFineSchema.parse(request.body);

        const fine = await fineService.createFine(request.user!.userId, {
          teamId,
          ...body,
        });

        return reply.status(201).send(serializeDecimal(fine));
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'VALIDATION_ERROR',
            message: error.errors[0].message,
          });
        }
        if (error instanceof FineError) {
          return reply.status(error.code === 'FORBIDDEN' ? 403 : 400).send({
            error: error.code,
            message: error.message,
          });
        }
        throw error;
      }
    }
  );

  // DELETE /teams/:teamId/fines/:fineId
  fastify.delete(
    '/teams/:teamId/fines/:fineId',
    { preHandler: [requireTeamAdmin()] },
    async (request, reply) => {
      const { fineId } = request.params as { fineId: string };
      await fineService.deleteFine(fineId);
      return reply.send({ success: true });
    }
  );

  // ============================================================================
  // PAYMENTS
  // ============================================================================

  // GET /teams/:teamId/payments
  fastify.get(
    '/teams/:teamId/payments',
    { preHandler: [requireTeamMember()] },
    async (request, reply) => {
      const { teamId } = request.params as { teamId: string };
      const payments = await fineService.getTeamPayments(teamId);
      return reply.send(serializeDecimal(payments));
    }
  );

  // POST /teams/:teamId/fines/:fineId/payments - Payment for specific fine
  fastify.post(
    '/teams/:teamId/fines/:fineId/payments',
    { preHandler: [requireTeamAdmin()] },
    async (request, reply) => {
      try {
        const { teamId, fineId } = request.params as { teamId: string; fineId: string };
        const body = recordPaymentSchema.parse(request.body);

        const fine = await fineService.getFine(fineId);
        if (!fine || fine.teamId !== teamId) {
          return reply.status(404).send({
            error: 'NOT_FOUND',
            message: 'Amende non trouvée',
          });
        }

        const payment = await fineService.recordPayment(request.user!.userId, {
          teamId,
          fineId,
          userId: fine.offenderId,
          ...body,
        });

        return reply.status(201).send(serializeDecimal(payment));
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'VALIDATION_ERROR',
            message: error.errors[0].message,
          });
        }
        if (error instanceof FineError) {
          return reply.status(400).send({
            error: error.code,
            message: error.message,
          });
        }
        throw error;
      }
    }
  );

  // POST /teams/:teamId/members/:userId/payments - Payment for member (distributed)
  fastify.post(
    '/teams/:teamId/members/:userId/payments',
    { preHandler: [requireTeamAdmin()] },
    async (request, reply) => {
      try {
        const { teamId, userId } = request.params as { teamId: string; userId: string };
        const body = recordMemberPaymentSchema.parse(request.body);

        const result = await fineService.recordPayment(request.user!.userId, {
          teamId,
          userId,
          ...body,
        });

        return reply.status(201).send(serializeDecimal(result));
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'VALIDATION_ERROR',
            message: error.errors[0].message,
          });
        }
        if (error instanceof FineError) {
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
