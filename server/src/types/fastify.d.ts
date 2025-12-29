import { TeamRole } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      email: string;
    };
    teamMembership?: {
      id: string;
      teamId: string;
      userId: string;
      role: TeamRole;
      credit: number;
      isDeleted: boolean;
      joinedAt: Date;
    };
  }
}
