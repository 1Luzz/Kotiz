import { ExpenseCategory, ActivityType } from '@prisma/client';
import { prisma } from '../config/database.js';

export class ExpenseService {
  async getTeamExpenses(teamId: string) {
    return prisma.expense.findMany({
      where: { teamId },
      include: {
        recordedBy: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createExpense(
    userId: string,
    teamId: string,
    data: {
      amount: number;
      description: string;
      category?: ExpenseCategory;
      receiptUrl?: string;
    }
  ) {
    const expense = await prisma.$transaction(async (tx) => {
      const newExpense = await tx.expense.create({
        data: {
          teamId,
          recordedById: userId,
          amount: data.amount,
          description: data.description,
          category: data.category || ExpenseCategory.autre,
          receiptUrl: data.receiptUrl,
        },
        include: {
          recordedBy: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          teamId,
          userId,
          activityType: ActivityType.expense_recorded,
          metadata: {
            expenseId: newExpense.id,
            amount: data.amount,
            description: data.description,
          },
        },
      });

      return newExpense;
    });

    return expense;
  }

  async deleteExpense(expenseId: string, userId: string) {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        team: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!expense) {
      throw new ExpenseError('NOT_FOUND', 'Dépense non trouvée');
    }

    // Check if user is admin
    const membership = expense.team.members[0];
    if (!membership || membership.role !== 'admin') {
      throw new ExpenseError('FORBIDDEN', 'Seul un admin peut supprimer une dépense');
    }

    await prisma.expense.delete({
      where: { id: expenseId },
    });

    return { success: true };
  }
}

export class ExpenseError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ExpenseError';
  }
}

export const expenseService = new ExpenseService();
