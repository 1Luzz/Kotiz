import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DisputeStatus } from '@prisma/client';
import { authenticate } from '../../middleware/authenticate.js';
import { requireTeamMember } from '../../middleware/authorize.js';
import { disputeService, DisputeError } from '../../services/dispute.service.js';
import { serializeDecimal } from '../../utils/serializer.js';

// Schemas
const createDisputeSchema = z.object({
  reason: z.string().min(10).max(1000),
});

const voteSchema = z.object({
  vote: z.boolean(),
});

const resolveSchema = z.object({
  approved: z.boolean(),
  note: z.string().max(500).optional(),
});

export async function disputeRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // GET /teams/:teamId/disputes - List team disputes
  fastify.get(
    '/teams/:teamId/disputes',
    { preHandler: [requireTeamMember()] },
    async (request, reply) => {
      const { teamId } = request.params as { teamId: string };
      const query = request.query as { status?: string };
      const status = query.status as DisputeStatus | undefined;

      const disputes = await disputeService.getTeamDisputes(teamId, status);
      return reply.send(serializeDecimal(disputes));
    }
  );

  // GET /fines/:fineId/dispute - Get dispute for a fine
  fastify.get('/fines/:fineId/dispute', async (request, reply) => {
    const { fineId } = request.params as { fineId: string };
    const dispute = await disputeService.getFineDispute(fineId);

    if (!dispute) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Aucune contestation pour cette amende',
      });
    }

    return reply.send(serializeDecimal(dispute));
  });

  // POST /fines/:fineId/dispute - Create dispute for a fine
  fastify.post('/fines/:fineId/dispute', async (request, reply) => {
    try {
      const { fineId } = request.params as { fineId: string };
      const body = createDisputeSchema.parse(request.body);

      const dispute = await disputeService.createDispute(
        request.user!.userId,
        fineId,
        body.reason
      );

      return reply.status(201).send(serializeDecimal(dispute));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: error.errors[0].message,
        });
      }
      if (error instanceof DisputeError) {
        const status = error.code === 'FORBIDDEN' ? 403 : 400;
        return reply.status(status).send({
          error: error.code,
          message: error.message,
        });
      }
      throw error;
    }
  });

  // POST /disputes/:disputeId/vote - Vote on a dispute
  fastify.post('/disputes/:disputeId/vote', async (request, reply) => {
    try {
      const { disputeId } = request.params as { disputeId: string };
      const body = voteSchema.parse(request.body);

      const vote = await disputeService.voteOnDispute(
        request.user!.userId,
        disputeId,
        body.vote
      );

      return reply.status(201).send(vote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: error.errors[0].message,
        });
      }
      if (error instanceof DisputeError) {
        const status = error.code === 'FORBIDDEN' ? 403 : 400;
        return reply.status(status).send({
          error: error.code,
          message: error.message,
        });
      }
      throw error;
    }
  });

  // POST /disputes/:disputeId/resolve - Resolve a dispute (admin only)
  fastify.post('/disputes/:disputeId/resolve', async (request, reply) => {
    try {
      const { disputeId } = request.params as { disputeId: string };
      const body = resolveSchema.parse(request.body);

      const dispute = await disputeService.resolveDispute(
        request.user!.userId,
        disputeId,
        body.approved,
        body.note
      );

      return reply.send(serializeDecimal(dispute));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: error.errors[0].message,
        });
      }
      if (error instanceof DisputeError) {
        const status = error.code === 'FORBIDDEN' ? 403 : 400;
        return reply.status(status).send({
          error: error.code,
          message: error.message,
        });
      }
      throw error;
    }
  });

  // GET /disputes/:disputeId/votes - Get votes for a dispute
  fastify.get('/disputes/:disputeId/votes', async (request, reply) => {
    const { disputeId } = request.params as { disputeId: string };
    const votes = await disputeService.getDisputeVotes(disputeId);
    return reply.send(votes);
  });

  // GET /disputes/:disputeId/my-vote - Check if current user voted
  fastify.get('/disputes/:disputeId/my-vote', async (request, reply) => {
    const { disputeId } = request.params as { disputeId: string };
    const vote = await disputeService.getUserVote(disputeId, request.user!.userId);
    return reply.send(vote || { voted: false });
  });
}
