import { Injectable } from "@nestjs/common";
import { sign, verify, type JwtPayload } from "jsonwebtoken";
import {
  UserRole,
  type AccessTokenPayload,
} from "../../domain/auth/auth.models";
import type { AccessTokenService } from "../../domain/auth/auth.ports";

@Injectable()
export class JwtAccessTokenService implements AccessTokenService {
  private readonly secret = process.env.ACCESS_TOKEN_SECRET ?? "";
  private readonly ttlSeconds = Number(
    process.env.ACCESS_TOKEN_TTL_SECONDS ?? 3600,
  );

  constructor() {
    if (this.secret.length < 32) {
      throw new Error("ACCESS_TOKEN_SECRET must contain at least 32 characters.");
    }
  }

  issue(payload: AccessTokenPayload): string {
    return sign(
      { email: payload.email, role: payload.role },
      this.secret,
      {
        subject: payload.sub,
        expiresIn: this.ttlSeconds,
        algorithm: "HS256",
      },
    );
  }

  verify(token: string): AccessTokenPayload {
    const payload = verify(token, this.secret, {
      algorithms: ["HS256"],
    }) as JwtPayload;

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      (payload.role !== UserRole.Admin &&
        payload.role !== UserRole.SubscriptionL1)
    ) {
      throw new Error("Invalid access token payload.");
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}

