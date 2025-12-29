import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FinePermission, DisputeMode, TeamRole } from '@prisma/client';
import { authenticate } from '../../middleware/authenticate.js';
import { requireTeamAdmin, requireTeamMember } from '../../middleware/authorize.js';
import { teamService, TeamError } from '../../services/team.service.js';
import { serializeDecimal } from '../../utils/serializer.js';

// Schemas
const createTeamSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  sport: z.string().max(50).optional(),
  allowCustomFines: z.boolean().optional(),
  finePermission: z.nativeEnum(FinePermission).optional(),
  disputeEnabled: z.boolean().optional(),
  disputeMode: z.nativeEnum(DisputeMode).optional(),
  disputeVotesRequired: z.number().int().min(1).max(100).optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(500).nullable().optional(),
  sport: z.string().max(50).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  allowCustomFines: z.boolean().optional(),
  finePermission: z.nativeEnum(FinePermission).optional(),
  isClosed: z.boolean().optional(),
  disputeEnabled: z.boolean().optional(),
  disputeMode: z.nativeEnum(DisputeMode).nullable().optional(),
  disputeVotesRequired: z.number().int().min(1).max(100).nullable().optional(),
});

const joinTeamSchema = z.object({
  inviteCode: z.string().min(1),
});

const updateMemberSchema = z.object({
  role: z.nativeEnum(TeamRole),
});

export async function teamRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // GET /teams - List user's teams
  fastify.get('/', async (request, reply) => {
    const teams = await teamService.getUserTeams(request.user!.userId);
    return reply.send(teams);
  });

  // POST /teams - Create team
  fastify.post('/', async (request, reply) => {
    try {
      const body = createTeamSchema.parse(request.body);
      const team = await teamService.createTeamWithAdmin(request.user!.userId, body);
      return reply.status(201).send({ teamId: team.id, team });
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

  // POST /teams/join - Join team by invite code
  fastify.post('/join', async (request, reply) => {
    try {
      const body = joinTeamSchema.parse(request.body);
      const team = await teamService.joinTeamByCode(request.user!.userId, body.inviteCode);
      return reply.send({ teamId: team.id, team });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: error.errors[0].message,
        });
      }
      if (error instanceof TeamError) {
        return reply.status(400).send({
          error: error.code,
          message: error.message,
        });
      }
      throw error;
    }
  });

  // GET /teams/:teamId - Get team details
  fastify.get(
    '/:teamId',
    { preHandler: [requireTeamMember()] },
    async (request, reply) => {
      const { teamId } = request.params as { teamId: string };
      const team = await teamService.getTeam(teamId);

      if (!team) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Équipe non trouvée',
        });
      }

      return reply.send(team);
    }
  );

  // PATCH /teams/:teamId - Update team
  fastify.patch(
    '/:teamId',
    { preHandler: [requireTeamAdmin()] },
    async (request, reply) => {
      try {
        const { teamId } = request.params as { teamId: string };
        const body = updateTeamSchema.parse(request.body);
        const team = await teamService.updateTeam(teamId, body);
        return reply.send(team);
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

  // DELETE /teams/:teamId - Delete team
  fastify.delete(
    '/:teamId',
    { preHandler: [requireTeamAdmin()] },
    async (request, reply) => {
      try {
        const { teamId } = request.params as { teamId: string };
        await teamService.deleteTeam(teamId, request.user!.userId);
        return reply.send({ success: true });
      } catch (error) {
        if (error instanceof TeamError) {
          return reply.status(403).send({
            error: error.code,
            message: error.message,
          });
        }
        throw error;
      }
    }
  );

  // POST /teams/:teamId/regenerate-code - Regenerate invite code
  fastify.post(
    '/:teamId/regenerate-code',
    { preHandler: [requireTeamAdmin()] },
    async (request, reply) => {
      const { teamId } = request.params as { teamId: string };
      const code = await teamService.regenerateInviteCode(teamId);
      return reply.send({ code });
    }
  );

  // GET /teams/:teamId/members - List team members
  fastify.get(
    '/:teamId/members',
    { preHandler: [requireTeamMember()] },
    async (request, reply) => {
      const { teamId } = request.params as { teamId: string };
      const members = await teamService.getTeamMembers(teamId);
      return reply.send(serializeDecimal(members));
    }
  );

  // PATCH /teams/:teamId/members/:userId - Update member role
  fastify.patch(
    '/:teamId/members/:userId',
    { preHandler: [requireTeamAdmin()] },
    async (request, reply) => {
      try {
        const { teamId, userId } = request.params as { teamId: string; userId: string };
        const body = updateMemberSchema.parse(request.body);
        const member = await teamService.updateMemberRole(teamId, userId, body.role);
        return reply.send(member);
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

  // DELETE /teams/:teamId/members/:userId - Remove member
  fastify.delete(
    '/:teamId/members/:userId',
    { preHandler: [requireTeamMember()] },
    async (request, reply) => {
      const { teamId, userId } = request.params as { teamId: string; userId: string };
      const actorId = request.user!.userId;

      // Can only remove self or if admin
      if (userId !== actorId && request.teamMembership?.role !== TeamRole.admin) {
        return reply.status(403).send({
          error: 'FORBIDDEN',
          message: 'Seul un admin peut retirer d\'autres membres',
        });
      }

      await teamService.removeMember(teamId, userId, actorId);
      return reply.send({ success: true });
    }
  );

  // GET /teams/:teamId/stats - Get team statistics
  fastify.get(
    '/:teamId/stats',
    { preHandler: [requireTeamMember()] },
    async (request, reply) => {
      const { teamId } = request.params as { teamId: string };
      const stats = await teamService.getTeamStats(teamId);
      return reply.send(serializeDecimal(stats));
    }
  );

  // GET /teams/:teamId/leaderboard - Get team leaderboard
  fastify.get(
    '/:teamId/leaderboard',
    { preHandler: [requireTeamMember()] },
    async (request, reply) => {
      const { teamId } = request.params as { teamId: string };
      const query = request.query as { limit?: string };
      const limit = query.limit ? parseInt(query.limit, 10) : 10;
      const leaderboard = await teamService.getTeamLeaderboard(teamId, limit);
      return reply.send(serializeDecimal(leaderboard));
    }
  );

  // GET /teams/:teamId/members/:userId/balance - Get member balance
  fastify.get(
    '/:teamId/members/:userId/balance',
    { preHandler: [requireTeamMember()] },
    async (request, reply) => {
      const { teamId, userId } = request.params as { teamId: string; userId: string };
      const balance = await teamService.getMemberBalance(teamId, userId);
      return reply.send(serializeDecimal(balance));
    }
  );
}
