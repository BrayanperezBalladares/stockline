import { Injectable } from "@nestjs/common";
import type { Clock } from "../../domain/auth/auth.ports";

@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

