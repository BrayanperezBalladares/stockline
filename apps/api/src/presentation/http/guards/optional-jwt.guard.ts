import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { AuthApplicationService } from "../../../application/auth/auth.application-service";
import { TOKENS } from "../../../app.tokens";
import type { OptionallyAuthenticatedRequest } from "../authenticated-request";
import { extractBearerToken } from "./bearer-token";

@Injectable()
export class OptionalJwtGuard implements CanActivate {
  constructor(
    @Inject(TOKENS.authApplication)
    private readonly auth: AuthApplicationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<OptionallyAuthenticatedRequest>();
    const token = extractBearerToken(request);
    if (token) {
      request.user = await this.auth.authenticateAccessToken(token);
    }
    return true;
  }
}

