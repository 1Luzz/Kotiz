import { TeamRole, FineStatus, ActivityType, FinePermission, DisputeMode } from '@prisma/client';
import { prisma } from '../config/database.js';
import { generateInviteCode } from '../utils/invite-code.js';

export interface CreateTeamInput {
  name: string;
  description?: string;
  sport?: string;
  allowCustomFines?: boolean;
  finePermission?: FinePermission;
  disputeEnabled?: boolean;
  disputeMode?: DisputeMode;
  disputeVotesRequired?: number;
}

export interface UpdateTeamInput {
  name?: string;
  description?: string | null;
  sport?: string | null;
  photoUrl?: string | null;
  allowCustomFines?: boolean;
  finePermission?: FinePermission;
  isClosed?: boolean;
  disputeEnabled?: boolean;
  disputeMode?: DisputeMode | null;
  disputeVotesRequired?: number | null;
}

export class TeamService {
  async createTeamWithAdmin(userId: string, input: CreateTeamInput) {
    const inviteCode = generateInviteCode();

    const team = await prisma.$transaction(async (tx) => {
      // Create team
      const newTeam = await tx.team.create({
        data: {
          name: input.name,
          description: input.description,
          sport: input.sport,
          inviteCode,
          createdById: userId,
          allowCustomFines: input.allowCustomFines ?? true,
          finePermission: input.finePermission ?? FinePermission.everyone,
          disputeEnabled: input.disputeEnabled ?? false,
          disputeMode: input.disputeMode,
          disputeVotesRequired: input.disputeVotesRequired,
        },
      });

      // Add creator as admin
      await tx.teamMember.create({
        data: {
          teamId: newTeam.id,
          userId,
          role: TeamRole.admin,
        },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          teamId: newTeam.id,
          userId,
          activityType: ActivityType.team_created,
          metadata: { teamName: newTeam.name },
        },
      });

      return newTeam;
    });

    return team;
  }

  async joinTeamByCode(userId: string, inviteCode: string) {
    const normalizedCode = inviteCode.toUpperCase().trim();

    const team = await prisma.team.findUnique({
      where: { inviteCode: normalizedCode },
    });

    if (!team) {
      throw new TeamError('INVALID_CODE', 'Code d\'invitation invalide');
    }

    if (team.isClosed) {
      throw new TeamError('TEAM_CLOSED', 'Cette équipe est fermée aux nouveaux membres');
    }

    // Check if already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId } },
    });

    if (existingMember) {
      if (existingMember.isDeleted) {
        // Reactivate membership
        await prisma.$transaction(async (tx) => {
          await tx.teamMember.update({
            where: { id: existingMember.id },
            data: { isDeleted: false, role: TeamRole.member },
          });

          await tx.activityLog.create({
            data: {
              teamId: team.id,
              userId,
              activityType: ActivityType.member_joined,
            },
          });
        });

        return team;
      }
      throw new TeamError('ALREADY_MEMBER', 'Vous êtes déjà membre de cette équipe');
    }

    await prisma.$transaction(async (tx) => {
      await tx.teamMember.create({
        data: {
          teamId: team.id,
          userId,
          role: TeamRole.member,
        },
      });

      await tx.activityLog.create({
        data: {
          teamId: team.id,
          userId,
          activityType: ActivityType.member_joined,
        },
      });
    });

    return team;
  }

  async getUserTeams(userId: string) {
    const memberships = await prisma.teamMember.findMany({
      where: { userId, isDeleted: false },
      include: {
        team: true,
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.team,
      userRole: m.role,
    }));
  }

  async getTeam(teamId: string) {
    return prisma.team.findUnique({
      where: { id: teamId },
    });
  }

  async updateTeam(teamId: string, input: UpdateTeamInput) {
    return prisma.team.update({
      where: { id: teamId },
      data: input,
    });
  }

  async deleteTeam(teamId: string, userId: string) {
    // Check user is admin
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (!membership || membership.role !== TeamRole.admin) {
      throw new TeamError('FORBIDDEN', 'Seul un admin peut supprimer l\'équipe');
    }

    await prisma.team.delete({
      where: { id: teamId },
    });
  }

  async regenerateInviteCode(teamId: string) {
    const newCode = generateInviteCode();
    const team = await prisma.team.update({
      where: { id: teamId },
      data: { inviteCode: newCode },
    });
    return team.inviteCode;
  }

  async getTeamMembers(teamId: string) {
    return prisma.teamMember.findMany({
      where: { teamId, isDeleted: false },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });
  }

  async updateMemberRole(teamId: string, memberId: string, role: TeamRole) {
    return prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId: memberId } },
      data: { role },
    });
  }

  async removeMember(teamId: string, memberId: string, actorId: string) {
    // Check if member has fines or payments
    const [fines, payments] = await Promise.all([
      prisma.fine.findFirst({ where: { teamId, offenderId: memberId } }),
      prisma.payment.findFirst({ where: { teamId, userId: memberId } }),
    ]);

    const hasHistory = fines || payments;

    await prisma.$transaction(async (tx) => {
      if (hasHistory) {
        // Soft delete
        await tx.teamMember.update({
          where: { teamId_userId: { teamId, userId: memberId } },
          data: { isDeleted: true },
        });
      } else {
        // Hard delete
        await tx.teamMember.delete({
          where: { teamId_userId: { teamId, userId: memberId } },
        });
      }

      await tx.activityLog.create({
        data: {
          teamId,
          userId: actorId,
          activityType: ActivityType.member_left,
          targetUserId: memberId,
        },
      });
    });
  }

  async getTeamStats(teamId: string) {
    const [finesAgg, paymentsAgg, membersCount, expensesAgg] = await Promise.all([
      prisma.fine.aggregate({
        where: { teamId },
        _sum: { amount: true, amountPaid: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { teamId },
        _sum: { amount: true },
      }),
      prisma.teamMember.count({
        where: { teamId, isDeleted: false },
      }),
      prisma.expense.aggregate({
        where: { teamId },
        _sum: { amount: true },
      }),
    ]);

    const totalPot = Number(finesAgg._sum.amount ?? 0);
    const totalCollected = Number(paymentsAgg._sum.amount ?? 0);
    const totalExpenses = Number(expensesAgg._sum.amount ?? 0);

    return {
      totalPot,
      totalCollected,
      totalPending: totalPot - totalCollected,
      totalExpenses,
      availableBalance: totalCollected - totalExpenses,
      totalFines: finesAgg._count,
      totalMembers: membersCount,
    };
  }

  async getTeamLeaderboard(teamId: string, limit = 10) {
    const leaderboard = await prisma.fine.groupBy({
      by: ['offenderId'],
      where: { teamId },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });

    // Get user details
    const userIds = leaderboard.map((l) => l.offenderId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, avatarUrl: true },
    });

    const usersMap = new Map(users.map((u) => [u.id, u]));

    return leaderboard.map((l) => {
      const user = usersMap.get(l.offenderId);
      return {
        userId: l.offenderId,
        displayName: user?.displayName ?? 'Inconnu',
        avatarUrl: user?.avatarUrl ?? null,
        totalFines: Number(l._sum?.amount ?? 0),
        finesCount: l._count?._all ?? 0,
      };
    });
  }

  async getMemberBalance(teamId: string, userId: string) {
    const [finesAgg, unpaidCount] = await Promise.all([
      prisma.fine.aggregate({
        where: { teamId, offenderId: userId },
        _sum: { amount: true, amountPaid: true },
        _count: true,
      }),
      prisma.fine.count({
        where: { teamId, offenderId: userId, status: { not: FineStatus.paid } },
      }),
    ]);

    const totalFines = Number(finesAgg._sum.amount ?? 0);
    const totalPaid = Number(finesAgg._sum.amountPaid ?? 0);

    return {
      totalFines,
      totalPaid,
      balance: totalFines - totalPaid,
      finesCount: finesAgg._count,
      unpaidCount,
    };
  }

  async canCreateFine(teamId: string, userId: string): Promise<boolean> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { userId, isDeleted: false },
        },
      },
    });

    if (!team || team.members.length === 0) {
      return false;
    }

    const membership = team.members[0];

    switch (team.finePermission) {
      case FinePermission.admin_only:
        return membership.role === TeamRole.admin;
      case FinePermission.treasurer:
        return membership.role === TeamRole.admin || membership.role === TeamRole.treasurer;
      case FinePermission.everyone:
        return true;
      default:
        return false;
    }
  }
}

export class TeamError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'TeamError';
  }
}

export const teamService = new TeamService();
