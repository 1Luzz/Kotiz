import { PaymentMethodType } from '@prisma/client';
import { prisma } from '../config/database.js';

export class PaymentMethodService {
  async getTeamPaymentMethods(teamId: string, enabledOnly = false) {
    return prisma.teamPaymentMethod.findMany({
      where: {
        teamId,
        ...(enabledOnly ? { isEnabled: true } : {}),
      },
      orderBy: { methodType: 'asc' },
    });
  }

  async upsertPaymentMethod(
    teamId: string,
    userId: string,
    data: {
      methodType: PaymentMethodType;
      isEnabled: boolean;
      displayName?: string;
      instructions?: string;
      config: Record<string, unknown>;
    }
  ) {
    return prisma.teamPaymentMethod.upsert({
      where: {
        teamId_methodType: {
          teamId,
          methodType: data.methodType,
        },
      },
      create: {
        teamId,
        methodType: data.methodType,
        isEnabled: data.isEnabled,
        displayName: data.displayName || null,
        instructions: data.instructions || null,
        config: data.config as any,
        createdById: userId,
      },
      update: {
        isEnabled: data.isEnabled,
        displayName: data.displayName || null,
        instructions: data.instructions || null,
        config: data.config as any,
      },
    });
  }

  async deletePaymentMethod(teamId: string, methodType: PaymentMethodType) {
    return prisma.teamPaymentMethod.delete({
      where: {
        teamId_methodType: {
          teamId,
          methodType,
        },
      },
    });
  }
}

export const paymentMethodService = new PaymentMethodService();
