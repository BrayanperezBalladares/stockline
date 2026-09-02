import { Injectable } from "@nestjs/common";
import { compare, hash } from "bcryptjs";
import type { PasswordHasher } from "../../domain/auth/auth.ports";

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  hash(value: string): Promise<string> {
    return hash(value, 12);
  }

  compare(value: string, digest: string): Promise<boolean> {
    return compare(value, digest);
  }
}

