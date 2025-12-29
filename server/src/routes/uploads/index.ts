import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { requireTeamAdmin } from '../../middleware/authorize.js';
import { uploadService } from '../../services/upload.service.js';
import { config } from '../../config/index.js';

export async function uploadRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // POST /users/me/avatar - Upload user avatar
  fastify.post('/users/me/avatar', async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({
        error: 'NO_FILE',
        message: 'Aucun fichier fourni',
      });
    }

    // Validate mime type
    if (!config.uploads.allowedMimeTypes.includes(data.mimetype)) {
      return reply.status(400).send({
        error: 'INVALID_FILE_TYPE',
        message: 'Type de fichier non autorisé',
      });
    }

    // Read file buffer
    const buffer = await data.toBuffer();

    // Validate file size
    if (buffer.length > config.uploads.maxFileSize) {
      return reply.status(400).send({
        error: 'FILE_TOO_LARGE',
        message: 'Le fichier est trop volumineux (max 5MB)',
      });
    }

    const url = await uploadService.uploadAvatar(
      request.user!.userId,
      buffer,
      data.mimetype
    );

    return reply.send({ url });
  });

  // POST /teams/:teamId/photo - Upload team photo
  fastify.post(
    '/teams/:teamId/photo',
    { preHandler: [requireTeamAdmin()] },
    async (request, reply) => {
      const { teamId } = request.params as { teamId: string };
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          error: 'NO_FILE',
          message: 'Aucun fichier fourni',
        });
      }

      // Validate mime type
      if (!config.uploads.allowedMimeTypes.includes(data.mimetype)) {
        return reply.status(400).send({
          error: 'INVALID_FILE_TYPE',
          message: 'Type de fichier non autorisé',
        });
      }

      // Read file buffer
      const buffer = await data.toBuffer();

      // Validate file size
      if (buffer.length > config.uploads.maxFileSize) {
        return reply.status(400).send({
          error: 'FILE_TOO_LARGE',
          message: 'Le fichier est trop volumineux (max 5MB)',
        });
      }

      const url = await uploadService.uploadTeamPhoto(teamId, buffer, data.mimetype);

      return reply.send({ url, teamId });
    }
  );

  // POST /uploads/receipt - Upload receipt image
  fastify.post('/uploads/receipt', async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({
        error: 'NO_FILE',
        message: 'Aucun fichier fourni',
      });
    }

    // Validate mime type
    if (!config.uploads.allowedMimeTypes.includes(data.mimetype)) {
      return reply.status(400).send({
        error: 'INVALID_FILE_TYPE',
        message: 'Type de fichier non autorisé',
      });
    }

    // Read file buffer
    const buffer = await data.toBuffer();

    // Validate file size
    if (buffer.length > config.uploads.maxFileSize) {
      return reply.status(400).send({
        error: 'FILE_TOO_LARGE',
        message: 'Le fichier est trop volumineux (max 5MB)',
      });
    }

    const url = await uploadService.uploadReceipt(buffer, data.mimetype);

    return reply.send({ url });
  });
}
