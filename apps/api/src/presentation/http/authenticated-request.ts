import type { Request } from "express";
import type { AuthenticatedUser } from "../../domain/auth/auth.models";

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface OptionallyAuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

