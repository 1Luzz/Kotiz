import { FastifyRequest, FastifyReply } from 'fastify';
import { TeamRole } from '@prisma/client';
import { prisma } from '../config/database.js';

interface AuthorizeOptions {
  teamIdParam?: string;
  requireRole?: TeamRole[];
}

export function authorize(options: AuthorizeOptions = {}) {
  const { teamIdParam = 'teamId', requireRole } = options;

  return async function (request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.userId;

    if (!userId) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Authentification requise',
      });
    }

    const teamId = (request.params as Record<string, string>)[teamIdParam];

    if (!teamId) {
      // No team authorization needed
      return;
    }

    // Check team membership
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
    });

    if (!membership || membership.isDeleted) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Vous n\'êtes pas membre de cette équipe',
      });
    }

    // Check role requirement
    if (requireRole && requireRole.length > 0) {
      if (!requireRole.includes(membership.role)) {
        return reply.status(403).send({
          error: 'FORBIDDEN',
          message: `Cette action nécessite l'un des rôles suivants: ${requireRole.join(', ')}`,
        });
      }
    }

    // Attach membership to request for downstream use
    request.teamMembership = {
      ...membership,
      credit: Number(membership.credit),
    };
  };
}

// Convenience middleware factories
export const requireTeamMember = () => authorize({});
export const requireTeamAdmin = () => authorize({ requireRole: [TeamRole.admin] });
export const requireTeamAdminOrTreasurer = () =>
  authorize({ requireRole: [TeamRole.admin, TeamRole.treasurer] });
