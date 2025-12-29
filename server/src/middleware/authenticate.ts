import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../utils/token.js';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: 'UNAUTHORIZED',
      message: 'Token d\'authentification manquant',
    });
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyAccessToken(token);
    request.user = payload;
  } catch (error) {
    return reply.status(401).send({
      error: 'UNAUTHORIZED',
      message: 'Token invalide ou expiré',
    });
  }
}
