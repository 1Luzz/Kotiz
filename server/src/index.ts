import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { config } from './config/index.js';
import { registerRoutes } from './routes/index.js';
import path from 'path';
import fs from 'fs';

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: config.isDev ? 'info' : 'warn',
      transport: config.isDev
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    },
  });

  // Register CORS
  await fastify.register(cors, {
    origin: config.cors.origins,
    credentials: true,
  });

  // Register multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: config.uploads.maxFileSize,
    },
  });

  // Serve static files (uploads)
  const uploadsPath = path.resolve(config.uploads.directory);
  await fastify.register(fastifyStatic, {
    root: uploadsPath,
    prefix: '/uploads/',
    decorateReply: false,
  });

  // Global error handler
  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);

    const err = error as Error & { code?: string; statusCode?: number };

    // Prisma errors
    if (err.code === 'P2002') {
      return reply.status(409).send({
        error: 'CONFLICT',
        message: 'Cette ressource existe déjà',
      });
    }

    if (err.code === 'P2025') {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Ressource non trouvée',
      });
    }

    // Default error
    return reply.status(err.statusCode ?? 500).send({
      error: 'INTERNAL_ERROR',
      message: config.isDev ? err.message : 'Une erreur interne est survenue',
    });
  });

  // Register routes
  await registerRoutes(fastify);

  // Serve frontend static files in production
  const frontendPath = path.resolve(config.frontendPath);
  if (config.serveFrontend && fs.existsSync(frontendPath)) {
    // Serve static frontend files
    await fastify.register(fastifyStatic, {
      root: frontendPath,
      prefix: '/',
      decorateReply: false,
      wildcard: false,
    });

    // SPA fallback - serve index.html for all unmatched routes
    fastify.setNotFoundHandler(async (request, reply) => {
      // Don't serve index.html for API routes
      if (request.url.startsWith('/auth/') ||
          request.url.startsWith('/users/') ||
          request.url.startsWith('/teams/') ||
          request.url.startsWith('/disputes/') ||
          request.url.startsWith('/notifications/') ||
          request.url.startsWith('/uploads/')) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Route non trouvée',
        });
      }

      // Serve index.html for SPA routes
      return reply.sendFile('index.html', frontendPath);
    });

    fastify.log.info(`Serving frontend from ${frontendPath}`);
  }

  return fastify;
}

async function start() {
  try {
    const server = await buildServer();

    await server.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Caisse Noire API Server                              ║
║                                                           ║
║   Server running at: http://localhost:${config.port}              ║
║   Environment: ${config.nodeEnv.padEnd(40)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
