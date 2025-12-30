import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authService, AuthError } from '../../services/auth.service.js';
import { authenticate } from '../../middleware/authenticate.js';

// Schemas
const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  displayName: z
    .string()
    .min(2, 'Le pseudo doit contenir au moins 2 caractères')
    .max(30, 'Le pseudo ne doit pas dépasser 30 caractères')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Le pseudo ne peut contenir que des lettres, chiffres, tirets et underscores'),
});

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email ou pseudo requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Token de rafraîchissement requis'),
});

export async function authRoutes(fastify: FastifyInstance) {
  // POST /auth/register
  fastify.post('/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);
      const result = await authService.register(body);
      return reply.status(201).send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      if (error instanceof AuthError) {
        return reply.status(400).send({
          error: error.code,
          message: error.message,
        });
      }
      throw error;
    }
  });

  // POST /auth/login
  fastify.post('/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);
      const result = await authService.login(body);
      return reply.send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: error.errors[0].message,
        });
      }
      if (error instanceof AuthError) {
        return reply.status(401).send({
          error: error.code,
          message: error.message,
        });
      }
      throw error;
    }
  });

  // POST /auth/logout
  fastify.post('/logout', async (request, reply) => {
    try {
      const body = refreshSchema.parse(request.body);
      await authService.logout(body.refreshToken);
      return reply.send({ success: true });
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

  // POST /auth/refresh
  fastify.post('/refresh', async (request, reply) => {
    try {
      const body = refreshSchema.parse(request.body);
      const tokens = await authService.refreshAccessToken(body.refreshToken);
      return reply.send(tokens);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: error.errors[0].message,
        });
      }
      if (error instanceof AuthError) {
        return reply.status(401).send({
          error: error.code,
          message: error.message,
        });
      }
      throw error;
    }
  });

  // GET /auth/check-display-name
  fastify.get('/check-display-name', async (request, reply) => {
    const query = request.query as { name?: string; excludeUserId?: string };

    if (!query.name) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Le paramètre "name" est requis',
      });
    }

    const available = await authService.checkDisplayNameAvailable(query.name, query.excludeUserId);
    return reply.send({ available });
  });

  // GET /auth/session - Validate session and return user
  fastify.get('/session', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await authService.getUserById(request.user!.userId);

    if (!user) {
      return reply.status(401).send({
        error: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    return reply.send({ user });
  });

  // GET /auth/health - Health check endpoint for Docker/monitoring
  fastify.get('/health', async (_request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'kotiz-api',
    });
  });
}
