import { prisma } from '../config/database.js';
import { config } from '../config/index.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, type TokenPayload } from '../utils/token.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  identifier: string; // email or displayName
  password: string;
}

export class AuthService {
  async register(input: RegisterInput) {
    const { email, password, displayName } = input;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      throw new AuthError('EMAIL_EXISTS', 'Cet email est déjà utilisé');
    }

    // Check if display name is available
    const existingName = await prisma.user.findFirst({
      where: { displayName: { equals: displayName, mode: 'insensitive' } },
    });
    if (existingName) {
      throw new AuthError('DISPLAY_NAME_TAKEN', 'Ce pseudo est déjà utilisé');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with notification settings in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          displayName: displayName.trim(),
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Create default notification settings
      await tx.userNotificationSettings.create({
        data: { userId: newUser.id },
      });

      return newUser;
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    return { user, tokens };
  }

  async login(input: LoginInput) {
    const { identifier, password } = input;

    // Find user by email or display name
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase().trim() },
          { displayName: { equals: identifier.trim(), mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      throw new AuthError('INVALID_CREDENTIALS', 'Email/pseudo ou mot de passe incorrect');
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      throw new AuthError('INVALID_CREDENTIALS', 'Email/pseudo ou mot de passe incorrect');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, tokens };
  }

  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    // Verify the refresh token
    let payload: TokenPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AuthError('INVALID_REFRESH_TOKEN', 'Token de rafraîchissement invalide');
    }

    // Find the stored refresh token
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new AuthError('INVALID_REFRESH_TOKEN', 'Token de rafraîchissement invalide');
    }

    if (storedToken.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new AuthError('REFRESH_TOKEN_EXPIRED', 'Token de rafraîchissement expiré');
    }

    // Delete old refresh token (rotation)
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    // Generate new tokens
    return this.generateTokens(payload.userId, payload.email);
  }

  async checkDisplayNameAvailable(displayName: string, excludeUserId?: string): Promise<boolean> {
    const existing = await prisma.user.findFirst({
      where: {
        displayName: { equals: displayName.trim(), mode: 'insensitive' },
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
    });
    return !existing;
  }

  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  private async generateTokens(userId: string, email: string): Promise<AuthTokens> {
    const payload: TokenPayload = { userId, email };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + config.jwt.refreshExpiresInMs),
      },
    });

    // Clean up old refresh tokens for this user (keep max 5)
    const tokens = await prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: 5,
    });

    if (tokens.length > 0) {
      await prisma.refreshToken.deleteMany({
        where: { id: { in: tokens.map((t) => t.id) } },
      });
    }

    return { accessToken, refreshToken };
  }
}

export class AuthError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export const authService = new AuthService();
