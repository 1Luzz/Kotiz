import { prisma } from '../config/database.js';

export class UploadService {
  async uploadAvatar(userId: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    const upload = await prisma.upload.create({
      data: { data: new Uint8Array(fileBuffer), mimeType },
    });

    const publicUrl = `/uploads/${upload.id}`;

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: publicUrl },
    });

    return publicUrl;
  }

  async uploadTeamPhoto(teamId: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    const upload = await prisma.upload.create({
      data: { data: new Uint8Array(fileBuffer), mimeType },
    });

    const publicUrl = `/uploads/${upload.id}`;

    await prisma.team.update({
      where: { id: teamId },
      data: { photoUrl: publicUrl },
    });

    return publicUrl;
  }

  async uploadReceipt(fileBuffer: Buffer, mimeType: string): Promise<string> {
    const upload = await prisma.upload.create({
      data: { data: new Uint8Array(fileBuffer), mimeType },
    });

    return `/uploads/${upload.id}`;
  }

  async getUpload(id: string) {
    return prisma.upload.findUnique({
      where: { id },
    });
  }
}

export const uploadService = new UploadService();
