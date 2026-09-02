import type { Request } from "express";

export function extractBearerToken(request: Request): string | null {
  const value = request.headers.authorization;
  if (!value) return null;
  const [scheme, token, extra] = value.trim().split(/\s+/);
  if (scheme !== "Bearer" || !token || extra) return null;
  return token;
}

