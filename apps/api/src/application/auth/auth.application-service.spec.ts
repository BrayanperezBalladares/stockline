import { describe, expect, it } from "vitest";
import { AuthApplicationService } from "./auth.application-service";
import { ApplicationError } from "../../domain/common/application-error";
import {
  UserRole,
  type AccessTokenPayload,
  type User,
} from "../../domain/auth/auth.models";
import type {
  AccessTokenService,
  Clock,
  CreateRefreshSessionData,
  CreateUserData,
  PasswordHasher,
  RefreshSessionRepository,
  RefreshTokenService,
  UserRepository,
} from "../../domain/auth/auth.ports";

class FakeUsers implements UserRepository {
  readonly records: User[] = [];
  async findByEmail(email: string) { return this.records.find((user) => user.email === email) ?? null; }
  async findById(id: string) { return this.records.find((user) => user.id === id) ?? null; }
  async create(data: CreateUserData) {
    const user: User = { ...data, id: `user-${this.records.length + 1}`, createdAt: new Date("2026-09-01T00:00:00Z") };
    this.records.push(user);
    return user;
  }
  async list() { return [...this.records]; }
  async countAdmins() { return this.records.filter((user) => user.role === UserRole.Admin).length; }
  async countActiveAdmins() { return this.records.filter((user) => user.role === UserRole.Admin && user.isActive).length; }
  async updateActivity(id: string, isActive: boolean) { const user = (await this.findById(id))!; user.isActive = isActive; return user; }
  async updateSubscriptionExpiration(id: string, expiresAt: Date) { const user = (await this.findById(id))!; user.subscriptionExpirationDate = expiresAt; return user; }
}

class FakeSessions implements RefreshSessionRepository {
  records: Array<CreateRefreshSessionData & { id: string; revokedAt: Date | null }> = [];
  async create(data: CreateRefreshSessionData) { const record = { ...data, id: `session-${this.records.length + 1}`, revokedAt: null }; this.records.push(record); return record; }
  async findActiveByTokenHash(tokenHash: string) { return this.records.find((record) => record.tokenHash === tokenHash && !record.revokedAt) ?? null; }
  async rotate(currentSessionId: string, replacement: CreateRefreshSessionData) { const current = this.records.find((record) => record.id === currentSessionId); if (!current || current.revokedAt) throw new ApplicationError("UNAUTHORIZED", "Invalid refresh token."); current.revokedAt = new Date(); await this.create(replacement); }
  async revokeAllForUser(userId: string) { this.records.filter((record) => record.userId === userId && !record.revokedAt).forEach((record) => { record.revokedAt = new Date(); }); }
}

const passwords: PasswordHasher = { hash: async (value) => `hash:${value}`, compare: async (value, digest) => digest === `hash:${value}` };
const accessTokens: AccessTokenService = {
  issue: (payload) => Buffer.from(JSON.stringify(payload)).toString("base64url"),
  verify: (token) => JSON.parse(Buffer.from(token, "base64url").toString()) as AccessTokenPayload,
};
class FakeRefreshTokens implements RefreshTokenService { private count = 0; issue() { this.count += 1; return `refresh-${this.count}`; } hash(token: string) { return `hash:${token}`; } }
const clock: Clock = { now: () => new Date("2026-09-01T00:00:00Z") };

function setup() {
  const users = new FakeUsers();
  const sessions = new FakeSessions();
  const service = new AuthApplicationService(users, sessions, passwords, accessTokens, new FakeRefreshTokens(), clock, 14);
  return { service, users, sessions };
}

describe("AuthApplicationService", () => {
  it("registers an active Subscription_L1 for approximately one year", async () => {
    const { service } = setup();
    const user = await service.register(" Student@Example.com ", "learn123");
    expect(user.email).toBe("student@example.com");
    expect(user.role).toBe(UserRole.SubscriptionL1);
    expect(user.isActive).toBe(true);
    expect(user.subscriptionExpirationDate).toBe("2027-09-01T00:00:00.000Z");
  });

  it("rejects passwords that do not contain both a letter and a number", async () => {
    const { service } = setup();
    await expect(service.register("student@example.com", "letters")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rotates refresh tokens so an old token cannot be reused", async () => {
    const { service } = setup();
    await service.register("student@example.com", "learn123");
    const first = await service.login("student@example.com", "learn123");
    const second = await service.refresh(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    await expect(service.refresh(first.refreshToken)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns forbidden for an expired Subscription_L1 access token", async () => {
    const { service, users } = setup();
    await service.register("student@example.com", "learn123");
    const tokens = await service.login("student@example.com", "learn123");
    users.records[0]!.subscriptionExpirationDate = new Date("2026-08-31T00:00:00Z");
    await expect(service.authenticateAccessToken(tokens.accessToken)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows the first admin bootstrap but protects self-deactivation", async () => {
    const { service } = setup();
    const admin = await service.registerAdmin("admin@example.com", "admin123", null);
    await expect(service.updateActivity(admin.id, false, admin.id)).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

