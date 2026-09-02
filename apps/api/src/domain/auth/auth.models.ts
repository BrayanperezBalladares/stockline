export enum UserRole {
  Admin = "ADMIN",
  SubscriptionL1 = "SUBSCRIPTION_L1",
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  subscriptionExpirationDate: Date | null;
  createdAt: Date;
}

export interface RefreshSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  subscriptionExpirationDate: Date | null;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

