import type {
  AccessTokenPayload,
  RefreshSession,
  User,
  UserRole,
} from "./auth.models";

export interface CreateUserData {
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  subscriptionExpirationDate: Date | null;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  list(): Promise<User[]>;
  countAdmins(): Promise<number>;
  countActiveAdmins(): Promise<number>;
  updateActivity(id: string, isActive: boolean): Promise<User>;
  updateSubscriptionExpiration(id: string, expiresAt: Date): Promise<User>;
}

export interface CreateRefreshSessionData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface RefreshSessionRepository {
  create(data: CreateRefreshSessionData): Promise<RefreshSession>;
  findActiveByTokenHash(tokenHash: string): Promise<RefreshSession | null>;
  rotate(
    currentSessionId: string,
    replacement: CreateRefreshSessionData,
  ): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}

export interface PasswordHasher {
  hash(value: string): Promise<string>;
  compare(value: string, hash: string): Promise<boolean>;
}

export interface AccessTokenService {
  issue(payload: AccessTokenPayload): string;
  verify(token: string): AccessTokenPayload;
}

export interface RefreshTokenService {
  issue(): string;
  hash(token: string): string;
}

export interface Clock {
  now(): Date;
}

