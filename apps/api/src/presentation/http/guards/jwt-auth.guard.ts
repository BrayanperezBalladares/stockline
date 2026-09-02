import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { AuthApplicationService } from "../../../application/auth/auth.application-service";
import { ApplicationError } from "../../../domain/common/application-error";
import { TOKENS } from "../../../app.tokens";
import type { AuthenticatedRequest } from "../authenticated-request";
import { extractBearerToken } from "./bearer-token";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKENS.authApplication)
    private readonly auth: AuthApplicationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request);
    if (!token) {
      throw new ApplicationError("UNAUTHORIZED", "Access token is required.");
    }
    request.user = await this.auth.authenticateAccessToken(token);
    return true;
  }
}

