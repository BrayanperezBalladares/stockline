import { Injectable } from "@nestjs/common";
import { ApplicationError } from "../../domain/common/application-error";
import type { RefreshSession } from "../../domain/auth/auth.models";
import type {
  CreateRefreshSessionData,
  RefreshSessionRepository,
} from "../../domain/auth/auth.ports";
import { PrismaService } from "./prisma.service";

@Injectable()
export class PrismaRefreshSessionRepository
  implements RefreshSessionRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRefreshSessionData): Promise<RefreshSession> {
    return this.prisma.refreshSession.create({ data });
  }

  findActiveByTokenHash(tokenHash: string): Promise<RefreshSession | null> {
    return this.prisma.refreshSession.findFirst({
      where: { tokenHash, revokedAt: null },
    });
  }

  async rotate(
    currentSessionId: string,
    replacement: CreateRefreshSessionData,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.refreshSession.updateMany({
        where: { id: currentSessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (revoked.count !== 1) {
        throw new ApplicationError("UNAUTHORIZED", "Invalid refresh token.");
      }
      await transaction.refreshSession.create({ data: replacement });
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

