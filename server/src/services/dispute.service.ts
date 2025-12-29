import { DisputeStatus, ActivityType } from '@prisma/client';
import { prisma } from '../config/database.js';

export class DisputeService {
  async getTeamDisputes(teamId: string, status?: DisputeStatus) {
    return prisma.fineDispute.findMany({
      where: {
        teamId,
        ...(status ? { status } : {}),
      },
      include: {
        fine: {
          include: {
            offender: {
              select: { id: true, displayName: true, avatarUrl: true },
            },
            rule: {
              select: { label: true, category: true },
            },
          },
        },
        disputedBy: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        resolvedBy: {
          select: { id: true, displayName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFineDispute(fineId: string) {
    return prisma.fineDispute.findUnique({
      where: { fineId },
      include: {
        fine: {
          include: {
            offender: {
              select: { id: true, displayName: true, avatarUrl: true },
            },
          },
        },
        disputedBy: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        votes: {
          include: {
            user: {
              select: { id: true, displayName: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async createDispute(userId: string, fineId: string, reason: string) {
    // Get the fine and team info
    const fine = await prisma.fine.findUnique({
      where: { id: fineId },
      include: { team: true },
    });

    if (!fine) {
      throw new DisputeError('FINE_NOT_FOUND', 'Amende non trouvée');
    }

    // Check if user is the offender
    if (fine.offenderId !== userId) {
      throw new DisputeError('FORBIDDEN', 'Seul le contrevenant peut contester une amende');
    }

    // Check if dispute already exists
    const existingDispute = await prisma.fineDispute.findUnique({
      where: { fineId },
    });

    if (existingDispute) {
      throw new DisputeError('ALREADY_DISPUTED', 'Cette amende est déjà contestée');
    }

    // Check if team allows disputes
    if (!fine.team.disputeEnabled) {
      throw new DisputeError('DISPUTES_DISABLED', 'Les contestations ne sont pas activées pour cette équipe');
    }

    const votesRequired = fine.team.disputeVotesRequired ?? 3;

    const dispute = await prisma.$transaction(async (tx) => {
      const newDispute = await tx.fineDispute.create({
        data: {
          fineId,
          teamId: fine.teamId,
          disputedById: userId,
          reason,
          votesRequired,
        },
        include: {
          disputedBy: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          teamId: fine.teamId,
          userId,
          activityType: ActivityType.dispute_created,
          metadata: { disputeId: newDispute.id, fineId },
        },
      });

      return newDispute;
    });

    return dispute;
  }

  async voteOnDispute(userId: string, disputeId: string, vote: boolean) {
    const dispute = await prisma.fineDispute.findUnique({
      where: { id: disputeId },
      include: { team: true },
    });

    if (!dispute) {
      throw new DisputeError('DISPUTE_NOT_FOUND', 'Contestation non trouvée');
    }

    if (dispute.status !== DisputeStatus.pending) {
      throw new DisputeError('DISPUTE_CLOSED', 'Cette contestation est déjà résolue');
    }

    // Check if user is team member
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: dispute.teamId, userId } },
    });

    if (!membership || membership.isDeleted) {
      throw new DisputeError('FORBIDDEN', 'Vous devez être membre de l\'équipe pour voter');
    }

    // Check if user already voted
    const existingVote = await prisma.fineDisputeVote.findUnique({
      where: { disputeId_userId: { disputeId, userId } },
    });

    if (existingVote) {
      throw new DisputeError('ALREADY_VOTED', 'Vous avez déjà voté');
    }

    // Can't vote on own dispute
    if (dispute.disputedById === userId) {
      throw new DisputeError('FORBIDDEN', 'Vous ne pouvez pas voter sur votre propre contestation');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create vote
      const newVote = await tx.fineDisputeVote.create({
        data: {
          disputeId,
          userId,
          vote,
        },
      });

      // Update vote count if vote is positive
      if (vote) {
        const newCount = dispute.votesCount + 1;
        await tx.fineDispute.update({
          where: { id: disputeId },
          data: { votesCount: newCount },
        });

        // Check if auto-approve threshold reached (community mode)
        if (dispute.team.disputeMode === 'community' && newCount >= dispute.votesRequired) {
          await this.resolveDisputeInternal(tx, disputeId, true, null, 'Auto-approuvé par vote communautaire');
        }
      }

      return newVote;
    });

    return result;
  }

  async resolveDispute(userId: string, disputeId: string, approved: boolean, note?: string) {
    const dispute = await prisma.fineDispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new DisputeError('DISPUTE_NOT_FOUND', 'Contestation non trouvée');
    }

    if (dispute.status !== DisputeStatus.pending) {
      throw new DisputeError('DISPUTE_CLOSED', 'Cette contestation est déjà résolue');
    }

    // Check if user is admin
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: dispute.teamId, userId } },
    });

    if (!membership || membership.role !== 'admin') {
      throw new DisputeError('FORBIDDEN', 'Seul un admin peut résoudre une contestation');
    }

    return prisma.$transaction(async (tx) => {
      return this.resolveDisputeInternal(tx, disputeId, approved, userId, note);
    });
  }

  private async resolveDisputeInternal(
    tx: any,
    disputeId: string,
    approved: boolean,
    resolvedById: string | null,
    note?: string
  ) {
    const dispute = await tx.fineDispute.update({
      where: { id: disputeId },
      data: {
        status: approved ? DisputeStatus.approved : DisputeStatus.rejected,
        resolvedById,
        resolutionNote: note,
        resolvedAt: new Date(),
      },
      include: {
        fine: true,
      },
    });

    // If approved, delete the fine
    if (approved) {
      await tx.fine.delete({
        where: { id: dispute.fineId },
      });
    }

    // Log activity
    await tx.activityLog.create({
      data: {
        teamId: dispute.teamId,
        userId: resolvedById,
        activityType: ActivityType.dispute_resolved,
        metadata: { disputeId, approved, fineId: dispute.fineId },
      },
    });

    return dispute;
  }

  async getDisputeVotes(disputeId: string) {
    return prisma.fineDisputeVote.findMany({
      where: { disputeId },
      include: {
        user: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserVote(disputeId: string, userId: string) {
    return prisma.fineDisputeVote.findUnique({
      where: { disputeId_userId: { disputeId, userId } },
    });
  }
}

export class DisputeError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'DisputeError';
  }
}

export const disputeService = new DisputeService();
