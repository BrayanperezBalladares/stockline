import { Module } from "@nestjs/common";
import { AuthApplicationService } from "./application/auth/auth.application-service";
import { InventoryApplicationService } from "./application/inventory/inventory.application-service";
import { TOKENS } from "./app.tokens";
import { PrismaInventoryRepository } from "./infrastructure/prisma/prisma-inventory.repository";
import { PrismaRefreshSessionRepository } from "./infrastructure/prisma/prisma-refresh-session.repository";
import { PrismaService } from "./infrastructure/prisma/prisma.service";
import { PrismaUserRepository } from "./infrastructure/prisma/prisma-user.repository";
import { BcryptPasswordHasher } from "./infrastructure/security/bcrypt-password-hasher";
import { JwtAccessTokenService } from "./infrastructure/security/jwt-access-token.service";
import { RandomRefreshTokenService } from "./infrastructure/security/random-refresh-token.service";
import { SystemClock } from "./infrastructure/time/system-clock";
import { AuthController } from "./presentation/http/controllers/auth.controller";
import { HealthController } from "./presentation/http/controllers/health.controller";
import { InventoryController } from "./presentation/http/controllers/inventory.controller";
import { UsersController } from "./presentation/http/controllers/users.controller";
import { JwtAuthGuard } from "./presentation/http/guards/jwt-auth.guard";
import { OptionalJwtGuard } from "./presentation/http/guards/optional-jwt.guard";
import { RolesGuard } from "./presentation/http/guards/roles.guard";

@Module({
  controllers: [
    HealthController,
    AuthController,
    UsersController,
    InventoryController,
  ],
  providers: [
    PrismaService,
    PrismaUserRepository,
    PrismaRefreshSessionRepository,
    PrismaInventoryRepository,
    BcryptPasswordHasher,
    JwtAccessTokenService,
    RandomRefreshTokenService,
    SystemClock,
    JwtAuthGuard,
    OptionalJwtGuard,
    RolesGuard,
    { provide: TOKENS.userRepository, useExisting: PrismaUserRepository },
    {
      provide: TOKENS.refreshSessionRepository,
      useExisting: PrismaRefreshSessionRepository,
    },
    { provide: TOKENS.passwordHasher, useExisting: BcryptPasswordHasher },
    { provide: TOKENS.accessTokenService, useExisting: JwtAccessTokenService },
    {
      provide: TOKENS.refreshTokenService,
      useExisting: RandomRefreshTokenService,
    },
    { provide: TOKENS.clock, useExisting: SystemClock },
    { provide: TOKENS.inventoryRepository, useExisting: PrismaInventoryRepository },
    {
      provide: TOKENS.authApplication,
      useFactory: (
        users: PrismaUserRepository,
        sessions: PrismaRefreshSessionRepository,
        passwords: BcryptPasswordHasher,
        accessTokens: JwtAccessTokenService,
        refreshTokens: RandomRefreshTokenService,
        clock: SystemClock,
      ) =>
        new AuthApplicationService(
          users,
          sessions,
          passwords,
          accessTokens,
          refreshTokens,
          clock,
          Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 14),
        ),
      inject: [
        TOKENS.userRepository,
        TOKENS.refreshSessionRepository,
        TOKENS.passwordHasher,
        TOKENS.accessTokenService,
        TOKENS.refreshTokenService,
        TOKENS.clock,
      ],
    },
    {
      provide: TOKENS.inventoryApplication,
      useFactory: (inventory: PrismaInventoryRepository) =>
        new InventoryApplicationService(inventory),
      inject: [TOKENS.inventoryRepository],
    },
  ],
})
export class AppModule {}

