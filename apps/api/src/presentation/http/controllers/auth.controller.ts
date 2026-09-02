import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { AuthApplicationService } from "../../../application/auth/auth.application-service";
import { TOKENS } from "../../../app.tokens";
import type { AuthenticatedUser } from "../../../domain/auth/auth.models";
import type {
  AuthenticatedRequest,
  OptionallyAuthenticatedRequest,
} from "../authenticated-request";
import { LoginDto, RefreshDto, RegisterDto } from "../dto/auth.dto";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { OptionalJwtGuard } from "../guards/optional-jwt.guard";

@Controller()
export class AuthController {
  constructor(
    @Inject(TOKENS.authApplication)
    private readonly auth: AuthApplicationService,
  ) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password);
  }

  @Post("admin/register")
  @UseGuards(OptionalJwtGuard)
  registerAdmin(
    @Body() dto: RegisterDto,
    @Req() request: OptionallyAuthenticatedRequest,
  ) {
    return this.auth.registerAdmin(dto.email, dto.password, request.user ?? null);
  }

  @Post("login")
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post("refresh")
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() request: AuthenticatedRequest): Promise<void> {
    await this.auth.logout(request.user.id);
  }
}

