import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { AuthApplicationService } from "../../../application/auth/auth.application-service";
import { TOKENS } from "../../../app.tokens";
import { UserRole } from "../../../domain/auth/auth.models";
import type { AuthenticatedRequest } from "../authenticated-request";
import { Roles } from "../decorators/roles.decorator";
import {
  UpdateActivityDto,
  UpdateSubscriptionExpirationDto,
} from "../dto/auth.dto";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    @Inject(TOKENS.authApplication)
    private readonly auth: AuthApplicationService,
  ) {}

  @Get("me")
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.getCurrentUser(request.user.id);
  }

  @Get()
  @Roles(UserRole.Admin)
  @UseGuards(RolesGuard)
  list() {
    return this.auth.listUsers();
  }

  @Get(":id")
  @Roles(UserRole.Admin)
  @UseGuards(RolesGuard)
  get(@Param("id") id: string) {
    return this.auth.getUser(id);
  }

  @Patch(":id/activity")
  @Roles(UserRole.Admin)
  @UseGuards(RolesGuard)
  updateActivity(
    @Param("id") id: string,
    @Body() dto: UpdateActivityDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.auth.updateActivity(id, dto.isActive, request.user.id);
  }

  @Patch(":id/subscription-expiration")
  @Roles(UserRole.Admin)
  @UseGuards(RolesGuard)
  updateExpiration(
    @Param("id") id: string,
    @Body() dto: UpdateSubscriptionExpirationDto,
  ) {
    return this.auth.updateSubscriptionExpiration(
      id,
      new Date(dto.subscriptionExpirationDate),
    );
  }
}

