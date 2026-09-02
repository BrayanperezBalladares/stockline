import { Injectable } from "@nestjs/common";
import { ApplicationError } from "../../domain/common/application-error";
import { UserRole, type User } from "../../domain/auth/auth.models";
import type {
  CreateUserData,
  UserRepository,
} from "../../domain/auth/auth.ports";
import { PrismaService } from "./prisma.service";

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });
    return record ? this.toDomain(record) : null;
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async create(data: CreateUserData): Promise<User> {
    try {
      const record = await this.prisma.user.create({ data });
      return this.toDomain(record);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ApplicationError(
          "EMAIL_ALREADY_EXISTS",
          "Email is already registered.",
        );
      }
      throw error;
    }
  }

  async list(): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  countAdmins(): Promise<number> {
    return this.prisma.user.count({ where: { role: "ADMIN" } });
  }

  countActiveAdmins(): Promise<number> {
    return this.prisma.user.count({
      where: { role: "ADMIN", isActive: true },
    });
  }

  async updateActivity(id: string, isActive: boolean): Promise<User> {
    return this.toDomain(
      await this.prisma.user.update({ where: { id }, data: { isActive } }),
    );
  }

  async updateSubscriptionExpiration(
    id: string,
    expiresAt: Date,
  ): Promise<User> {
    return this.toDomain(
      await this.prisma.user.update({
        where: { id },
        data: { subscriptionExpirationDate: expiresAt },
      }),
    );
  }

  private toDomain(record: {
    id: string;
    email: string;
    passwordHash: string;
    role: string;
    isActive: boolean;
    subscriptionExpirationDate: Date | null;
    createdAt: Date;
  }): User {
    return {
      ...record,
      role:
        record.role === "ADMIN" ? UserRole.Admin : UserRole.SubscriptionL1,
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    );
  }
}

