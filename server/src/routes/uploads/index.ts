import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { requireTeamAdmin } from '../../middleware/authorize.js';
import { uploadService } from '../../services/upload.service.js';
import { config } from '../../config/index.js';

export async function uploadRoutes(fastify: FastifyInstance) {
  // GET /uploads/:id - Serve uploaded file from database (public, no auth)
  fastify.get('/uploads/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const upload = await uploadService.getUpload(id);

    if (!upload) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Fichier non trouvé',
      });
    }

    return reply
      .header('Content-Type', upload.mimeType)
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .send(upload.data);
  });

  // POST /users/me/avatar - Upload user avatar (authenticated)
  fastify.post('/users/me/avatar', { preHandler: [authenticate] }, async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({
        error: 'NO_FILE',
        message: 'Aucun fichier fourni',
      });
    }

    if (!config.uploads.allowedMimeTypes.includes(data.mimetype)) {
      return reply.status(400).send({
        error: 'INVALID_FILE_TYPE',
        message: 'Type de fichier non autorisé',
      });
    }

    const buffer = await data.toBuffer();

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

  // POST /teams/:teamId/photo - Upload team photo (authenticated + admin)
  fastify.post(
    '/teams/:teamId/photo',
    { preHandler: [authenticate, requireTeamAdmin()] },
    async (request, reply) => {
      const { teamId } = request.params as { teamId: string };
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          error: 'NO_FILE',
          message: 'Aucun fichier fourni',
        });
      }

      if (!config.uploads.allowedMimeTypes.includes(data.mimetype)) {
        return reply.status(400).send({
          error: 'INVALID_FILE_TYPE',
          message: 'Type de fichier non autorisé',
        });
      }

      const buffer = await data.toBuffer();

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

  // POST /uploads/receipt - Upload receipt image (authenticated)
  fastify.post('/uploads/receipt', { preHandler: [authenticate] }, async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({
        error: 'NO_FILE',
        message: 'Aucun fichier fourni',
      });
    }

    if (!config.uploads.allowedMimeTypes.includes(data.mimetype)) {
      return reply.status(400).send({
        error: 'INVALID_FILE_TYPE',
        message: 'Type de fichier non autorisé',
      });
    }

    const buffer = await data.toBuffer();

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
