import { ApplicationError } from "../../domain/common/application-error";
import {
  UserRole,
  type AccessTokenPayload,
  type AuthenticatedUser,
  type User,
} from "../../domain/auth/auth.models";
import type {
  AccessTokenService,
  Clock,
  PasswordHasher,
  RefreshSessionRepository,
  RefreshTokenService,
  UserRepository,
} from "../../domain/auth/auth.ports";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserView {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  subscriptionExpirationDate: string | null;
  createdAt: string;
}

export class AuthApplicationService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: RefreshSessionRepository,
    private readonly passwords: PasswordHasher,
    private readonly accessTokens: AccessTokenService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly clock: Clock,
    private readonly refreshTokenTtlDays: number,
  ) {}

  async register(email: string, password: string): Promise<UserView> {
    return this.createUser(email, password, UserRole.SubscriptionL1);
  }

  async registerAdmin(
    email: string,
    password: string,
    caller: AuthenticatedUser | null,
  ): Promise<UserView> {
    const adminCount = await this.users.countAdmins();
    if (adminCount > 0 && caller?.role !== UserRole.Admin) {
      throw new ApplicationError(
        "FORBIDDEN",
        "Only an administrator can create another administrator.",
      );
    }

    return this.createUser(email, password, UserRole.Admin);
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.users.findByEmail(this.normalizeEmail(email));
    if (
      !user ||
      !user.isActive ||
      !(await this.passwords.compare(password, user.passwordHash))
    ) {
      throw new ApplicationError("UNAUTHORIZED", "Invalid credentials.");
    }

    return this.issueTokenPair(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.refreshTokens.hash(refreshToken);
    const currentSession = await this.sessions.findActiveByTokenHash(tokenHash);
    const now = this.clock.now();

    if (!currentSession || currentSession.expiresAt <= now) {
      throw new ApplicationError("UNAUTHORIZED", "Invalid refresh token.");
    }

    const user = await this.users.findById(currentSession.userId);
    if (!user || !user.isActive) {
      throw new ApplicationError("UNAUTHORIZED", "Invalid refresh token.");
    }

    const replacementToken = this.refreshTokens.issue();
    await this.sessions.rotate(currentSession.id, {
      userId: user.id,
      tokenHash: this.refreshTokens.hash(replacementToken),
      expiresAt: this.addDays(now, this.refreshTokenTtlDays),
    });

    return {
      accessToken: this.accessTokens.issue(this.toAccessPayload(user)),
      refreshToken: replacementToken,
    };
  }

  async logout(userId: string): Promise<void> {
    await this.sessions.revokeAllForUser(userId);
  }

  async authenticateAccessToken(token: string): Promise<AuthenticatedUser> {
    let payload: AccessTokenPayload;
    try {
      payload = this.accessTokens.verify(token);
    } catch {
      throw new ApplicationError("UNAUTHORIZED", "Invalid access token.");
    }

    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new ApplicationError("UNAUTHORIZED", "Invalid access token.");
    }

    if (
      user.role === UserRole.SubscriptionL1 &&
      (!user.subscriptionExpirationDate ||
        user.subscriptionExpirationDate <= this.clock.now())
    ) {
      throw new ApplicationError("FORBIDDEN", "Subscription has expired.");
    }

    return this.toAuthenticatedUser(user);
  }

  async getCurrentUser(id: string): Promise<UserView> {
    const user = await this.requireUser(id);
    return this.toView(user);
  }

  async listUsers(): Promise<UserView[]> {
    return (await this.users.list()).map((user) => this.toView(user));
  }

  async getUser(id: string): Promise<UserView> {
    return this.toView(await this.requireUser(id));
  }

  async updateActivity(
    targetId: string,
    isActive: boolean,
    callerId: string,
  ): Promise<UserView> {
    const target = await this.requireUser(targetId);

    if (!isActive && target.role === UserRole.Admin) {
      if (target.id === callerId) {
        throw new ApplicationError(
          "CONFLICT",
          "An administrator cannot deactivate their own account.",
        );
      }
      if ((await this.users.countActiveAdmins()) <= 1) {
        throw new ApplicationError(
          "CONFLICT",
          "The last active administrator cannot be deactivated.",
        );
      }
    }

    const updated = await this.users.updateActivity(targetId, isActive);
    if (!isActive) {
      await this.sessions.revokeAllForUser(targetId);
    }
    return this.toView(updated);
  }

  async updateSubscriptionExpiration(
    targetId: string,
    expiresAt: Date,
  ): Promise<UserView> {
    const target = await this.requireUser(targetId);
    if (target.role !== UserRole.SubscriptionL1) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Only Subscription_L1 users have a subscription expiration date.",
      );
    }
    if (Number.isNaN(expiresAt.getTime())) {
      throw new ApplicationError("VALIDATION_ERROR", "Invalid expiration date.");
    }
    return this.toView(
      await this.users.updateSubscriptionExpiration(targetId, expiresAt),
    );
  }

  private async createUser(
    email: string,
    password: string,
    role: UserRole,
  ): Promise<UserView> {
    const normalizedEmail = this.normalizeEmail(email);
    this.assertPasswordPolicy(password);

    if (await this.users.findByEmail(normalizedEmail)) {
      throw new ApplicationError(
        "EMAIL_ALREADY_EXISTS",
        "Email is already registered.",
      );
    }

    const now = this.clock.now();
    const user = await this.users.create({
      email: normalizedEmail,
      passwordHash: await this.passwords.hash(password),
      role,
      isActive: true,
      subscriptionExpirationDate:
        role === UserRole.SubscriptionL1 ? this.addYears(now, 1) : null,
    });
    return this.toView(user);
  }

  private async issueTokenPair(user: User): Promise<AuthTokens> {
    const refreshToken = this.refreshTokens.issue();
    await this.sessions.create({
      userId: user.id,
      tokenHash: this.refreshTokens.hash(refreshToken),
      expiresAt: this.addDays(this.clock.now(), this.refreshTokenTtlDays),
    });
    return {
      accessToken: this.accessTokens.issue(this.toAccessPayload(user)),
      refreshToken,
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private assertPasswordPolicy(password: string): void {
    if (password.length < 6 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Password must contain at least six characters, one letter, and one number.",
      );
    }
  }

  private async requireUser(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new ApplicationError("NOT_FOUND", "User not found.");
    }
    return user;
  }

  private toAuthenticatedUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      subscriptionExpirationDate: user.subscriptionExpirationDate,
    };
  }

  private toAccessPayload(user: User): AccessTokenPayload {
    return { sub: user.id, email: user.email, role: user.role };
  }

  private toView(user: User): UserView {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      subscriptionExpirationDate:
        user.subscriptionExpirationDate?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setUTCFullYear(result.getUTCFullYear() + years);
    return result;
  }
}

