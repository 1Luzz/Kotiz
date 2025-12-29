import { FineStatus, ActivityType } from '@prisma/client';
import { prisma } from '../config/database.js';
import { teamService } from './team.service.js';

export interface CreateFineInput {
  teamId: string;
  offenderId: string;
  ruleId?: string;
  customLabel?: string;
  amount?: number;
  note?: string;
}

export interface RecordPaymentInput {
  teamId: string;
  fineId?: string;
  userId: string;
  amount: number;
  method?: string;
  note?: string;
}

export class FineService {
  // ============================================================================
  // FINE RULES
  // ============================================================================

  async getFineRules(teamId: string, activeOnly = true) {
    return prisma.fineRule.findMany({
      where: {
        teamId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: [{ category: 'asc' }, { label: 'asc' }],
    });
  }

  async createFineRule(
    teamId: string,
    createdById: string,
    data: { label: string; amount: number; category?: string }
  ) {
    return prisma.fineRule.create({
      data: {
        teamId,
        createdById,
        label: data.label,
        amount: data.amount,
        category: (data.category as any) ?? 'autre',
      },
    });
  }

  async updateFineRule(ruleId: string, data: { label?: string; amount?: number; category?: string; isActive?: boolean }) {
    return prisma.fineRule.update({
      where: { id: ruleId },
      data: {
        ...(data.label && { label: data.label }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.category && { category: data.category as any }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async deleteFineRule(ruleId: string) {
    // Soft delete by deactivating
    return prisma.fineRule.update({
      where: { id: ruleId },
      data: { isActive: false },
    });
  }

  // ============================================================================
  // FINES
  // ============================================================================

  async getTeamFines(teamId: string) {
    return prisma.fine.findMany({
      where: { teamId },
      include: {
        offender: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        issuedBy: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        rule: {
          select: { id: true, label: true, category: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserFines(teamId: string, userId: string) {
    return prisma.fine.findMany({
      where: { teamId, offenderId: userId },
      include: {
        offender: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        issuedBy: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        rule: {
          select: { id: true, label: true, category: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFine(fineId: string) {
    return prisma.fine.findUnique({
      where: { id: fineId },
      include: {
        offender: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        issuedBy: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        rule: {
          select: { id: true, label: true, category: true },
        },
      },
    });
  }

  async createFine(issuedById: string, input: CreateFineInput) {
    const { teamId, offenderId, ruleId, customLabel, amount, note } = input;

    // Check permission
    const canCreate = await teamService.canCreateFine(teamId, issuedById);
    if (!canCreate) {
      throw new FineError('FORBIDDEN', 'Vous n\'avez pas la permission de créer des amendes');
    }

    // Check offender is a team member
    const offenderMembership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: offenderId } },
    });
    if (!offenderMembership || offenderMembership.isDeleted) {
      throw new FineError('INVALID_OFFENDER', 'L\'utilisateur n\'est pas membre de l\'équipe');
    }

    let fineAmount: number;
    let fineLabel: string;

    if (ruleId) {
      // Fine from rule
      const rule = await prisma.fineRule.findUnique({ where: { id: ruleId } });
      if (!rule || rule.teamId !== teamId) {
        throw new FineError('INVALID_RULE', 'Règle invalide');
      }
      fineAmount = amount ?? Number(rule.amount);
      fineLabel = rule.label;
    } else if (customLabel && amount) {
      // Custom fine
      fineAmount = amount;
      fineLabel = customLabel;
    } else {
      throw new FineError('INVALID_INPUT', 'Une règle ou un label/montant personnalisé est requis');
    }

    const fine = await prisma.$transaction(async (tx) => {
      const newFine = await tx.fine.create({
        data: {
          teamId,
          offenderId,
          issuedById,
          ruleId,
          customLabel: ruleId ? null : customLabel,
          amount: fineAmount,
          note,
        },
        include: {
          offender: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
          issuedBy: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
          rule: {
            select: { id: true, label: true, category: true },
          },
        },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          teamId,
          userId: issuedById,
          activityType: ActivityType.fine_issued,
          targetUserId: offenderId,
          metadata: {
            fineId: newFine.id,
            amount: fineAmount,
            label: fineLabel,
          },
        },
      });

      return newFine;
    });

    return fine;
  }

  async deleteFine(fineId: string) {
    return prisma.fine.delete({
      where: { id: fineId },
    });
  }

  // ============================================================================
  // PAYMENTS
  // ============================================================================

  async getTeamPayments(teamId: string) {
    return prisma.payment.findMany({
      where: { teamId },
      include: {
        user: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        recordedBy: {
          select: { id: true, displayName: true },
        },
        fine: {
          select: { id: true, customLabel: true, rule: { select: { label: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async recordPayment(recordedById: string, input: RecordPaymentInput) {
    const { teamId, fineId, userId, amount, method, note } = input;

    if (fineId) {
      // Payment for specific fine
      return this.recordFinePayment(recordedById, {
        fineId,
        amount,
        method,
        note,
      });
    }

    // Payment for user (distribute across unpaid fines)
    return this.recordMemberPayment(recordedById, {
      teamId,
      userId,
      amount,
      method,
      note,
    });
  }

  private async recordFinePayment(
    recordedById: string,
    input: { fineId: string; amount: number; method?: string; note?: string }
  ) {
    const { fineId, amount, method, note } = input;

    const fine = await prisma.fine.findUnique({ where: { id: fineId } });
    if (!fine) {
      throw new FineError('FINE_NOT_FOUND', 'Amende non trouvée');
    }

    const remainingAmount = Number(fine.amount) - Number(fine.amountPaid);
    const actualPayment = Math.min(amount, remainingAmount);

    if (actualPayment <= 0) {
      throw new FineError('ALREADY_PAID', 'Cette amende est déjà payée');
    }

    const payment = await prisma.$transaction(async (tx) => {
      // Create payment
      const newPayment = await tx.payment.create({
        data: {
          teamId: fine.teamId,
          fineId,
          userId: fine.offenderId,
          amount: actualPayment,
          method,
          note,
          recordedById,
        },
      });

      // Update fine
      const newAmountPaid = Number(fine.amountPaid) + actualPayment;
      const newStatus = this.calculateFineStatus(Number(fine.amount), newAmountPaid);

      await tx.fine.update({
        where: { id: fineId },
        data: {
          amountPaid: newAmountPaid,
          status: newStatus,
        },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          teamId: fine.teamId,
          userId: recordedById,
          activityType: ActivityType.payment_recorded,
          targetUserId: fine.offenderId,
          metadata: {
            paymentId: newPayment.id,
            amount: actualPayment,
            fineId,
          },
        },
      });

      return newPayment;
    });

    return payment;
  }

  private async recordMemberPayment(
    recordedById: string,
    input: { teamId: string; userId: string; amount: number; method?: string; note?: string }
  ) {
    const { teamId, userId, amount, method, note } = input;

    // Get unpaid fines ordered by date
    const unpaidFines = await prisma.fine.findMany({
      where: {
        teamId,
        offenderId: userId,
        status: { not: FineStatus.paid },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (unpaidFines.length === 0) {
      throw new FineError('NO_UNPAID_FINES', 'Aucune amende impayée');
    }

    let remainingPayment = amount;
    const payments: any[] = [];

    await prisma.$transaction(async (tx) => {
      for (const fine of unpaidFines) {
        if (remainingPayment <= 0) break;

        const fineRemaining = Number(fine.amount) - Number(fine.amountPaid);
        const paymentForFine = Math.min(remainingPayment, fineRemaining);

        // Create payment
        const payment = await tx.payment.create({
          data: {
            teamId,
            fineId: fine.id,
            userId,
            amount: paymentForFine,
            method,
            note,
            recordedById,
          },
        });
        payments.push(payment);

        // Update fine
        const newAmountPaid = Number(fine.amountPaid) + paymentForFine;
        const newStatus = this.calculateFineStatus(Number(fine.amount), newAmountPaid);

        await tx.fine.update({
          where: { id: fine.id },
          data: {
            amountPaid: newAmountPaid,
            status: newStatus,
          },
        });

        remainingPayment -= paymentForFine;
      }

      // If there's remaining payment, create a credit payment (no fine linked)
      if (remainingPayment > 0) {
        const creditPayment = await tx.payment.create({
          data: {
            teamId,
            userId,
            amount: remainingPayment,
            method,
            note: note ? `${note} (crédit)` : 'Crédit',
            recordedById,
          },
        });
        payments.push(creditPayment);

        // Update member credit
        await tx.teamMember.update({
          where: { teamId_userId: { teamId, userId } },
          data: { credit: { increment: remainingPayment } },
        });
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          teamId,
          userId: recordedById,
          activityType: ActivityType.payment_recorded,
          targetUserId: userId,
          metadata: {
            totalAmount: amount,
            paymentsCount: payments.length,
          },
        },
      });
    });

    return { payments, totalApplied: amount - remainingPayment };
  }

  private calculateFineStatus(amount: number, amountPaid: number): FineStatus {
    if (amountPaid >= amount) return FineStatus.paid;
    if (amountPaid > 0) return FineStatus.partially_paid;
    return FineStatus.unpaid;
  }
}

export class FineError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'FineError';
  }
}

export const fineService = new FineService();
