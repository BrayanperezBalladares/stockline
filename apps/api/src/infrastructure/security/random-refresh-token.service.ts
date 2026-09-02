import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { RefreshTokenService } from "../../domain/auth/auth.ports";

@Injectable()
export class RandomRefreshTokenService implements RefreshTokenService {
  issue(): string {
    return randomBytes(48).toString("base64url");
  }

  hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}

