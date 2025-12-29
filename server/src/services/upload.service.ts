import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database.js';
import { config } from '../config/index.js';

export class UploadService {
  private uploadsDir: string;
  private baseUrl: string;

  constructor() {
    this.uploadsDir = config.uploads.directory;
    this.baseUrl = config.uploads.baseUrl;

    // Ensure upload directories exist
    this.ensureDir(path.join(this.uploadsDir, 'avatars'));
    this.ensureDir(path.join(this.uploadsDir, 'team-photos'));
    this.ensureDir(path.join(this.uploadsDir, 'receipts'));
  }

  private ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async uploadAvatar(userId: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    const ext = this.getExtension(mimeType);
    const fileName = `${userId}/${uuidv4()}.${ext}`;
    const filePath = path.join(this.uploadsDir, 'avatars', fileName);

    // Ensure user directory exists
    this.ensureDir(path.dirname(filePath));

    // Write file
    await fs.promises.writeFile(filePath, fileBuffer);

    // Generate public URL
    const publicUrl = `${this.baseUrl}/avatars/${fileName}`;

    // Update user avatar_url
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: publicUrl },
    });

    return publicUrl;
  }

  async uploadTeamPhoto(teamId: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    const ext = this.getExtension(mimeType);
    const fileName = `${teamId}/${uuidv4()}.${ext}`;
    const filePath = path.join(this.uploadsDir, 'team-photos', fileName);

    // Ensure team directory exists
    this.ensureDir(path.dirname(filePath));

    // Write file
    await fs.promises.writeFile(filePath, fileBuffer);

    // Generate public URL
    const publicUrl = `${this.baseUrl}/team-photos/${fileName}`;

    // Update team photo_url
    await prisma.team.update({
      where: { id: teamId },
      data: { photoUrl: publicUrl },
    });

    return publicUrl;
  }

  async uploadReceipt(fileBuffer: Buffer, mimeType: string): Promise<string> {
    const ext = this.getExtension(mimeType);
    const fileName = `${uuidv4()}.${ext}`;
    const filePath = path.join(this.uploadsDir, 'receipts', fileName);

    // Write file
    await fs.promises.writeFile(filePath, fileBuffer);

    // Generate public URL
    return `${this.baseUrl}/receipts/${fileName}`;
  }

  private getExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    return map[mimeType] || 'jpg';
  }
}

export const uploadService = new UploadService();
