import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ExpenseCategory } from '@prisma/client';
import { authenticate } from '../../middleware/authenticate.js';
import { requireTeamMember, requireTeamAdmin } from '../../middleware/authorize.js';
import { expenseService, ExpenseError } from '../../services/expense.service.js';
import { serializeDecimal } from '../../utils/serializer.js';

// Schemas
const createExpenseSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(2).max(200),
  category: z.nativeEnum(ExpenseCategory).optional(),
  receiptUrl: z.string().url().optional(),
});

export async function expenseRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // GET /teams/:teamId/expenses - List team expenses
  fastify.get(
    '/teams/:teamId/expenses',
    { preHandler: [requireTeamMember()] },
    async (request, reply) => {
      const { teamId } = request.params as { teamId: string };
      const expenses = await expenseService.getTeamExpenses(teamId);
      return reply.send(serializeDecimal(expenses));
    }
  );

  // POST /teams/:teamId/expenses - Create expense
  fastify.post(
    '/teams/:teamId/expenses',
    { preHandler: [requireTeamAdmin()] },
    async (request, reply) => {
      try {
        const { teamId } = request.params as { teamId: string };
        const body = createExpenseSchema.parse(request.body);

        const expense = await expenseService.createExpense(
          request.user!.userId,
          teamId,
          body
        );

        return reply.status(201).send(serializeDecimal(expense));
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

  // DELETE /teams/:teamId/expenses/:expenseId - Delete expense
  fastify.delete(
    '/teams/:teamId/expenses/:expenseId',
    { preHandler: [requireTeamAdmin()] },
    async (request, reply) => {
      try {
        const { expenseId } = request.params as { expenseId: string };
        const result = await expenseService.deleteExpense(expenseId, request.user!.userId);
        return reply.send(result);
      } catch (error) {
        if (error instanceof ExpenseError) {
          const status = error.code === 'NOT_FOUND' ? 404 : 403;
          return reply.status(status).send({
            error: error.code,
            message: error.message,
          });
        }
        throw error;
      }
    }
  );
}
