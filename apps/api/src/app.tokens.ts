export const TOKENS = {
  userRepository: Symbol("UserRepository"),
  refreshSessionRepository: Symbol("RefreshSessionRepository"),
  passwordHasher: Symbol("PasswordHasher"),
  accessTokenService: Symbol("AccessTokenService"),
  refreshTokenService: Symbol("RefreshTokenService"),
  clock: Symbol("Clock"),
  inventoryRepository: Symbol("InventoryRepository"),
  authApplication: Symbol("AuthApplicationService"),
  inventoryApplication: Symbol("InventoryApplicationService"),
} as const;

