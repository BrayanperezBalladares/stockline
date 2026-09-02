import {
  IsBoolean,
  IsEmail,
  IsISO8601,
  IsString,
  Matches,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  @Matches(/[A-Za-z]/, { message: "password must contain a letter" })
  @Matches(/\d/, { message: "password must contain a number" })
  password!: string;
}

export class LoginDto extends RegisterDto {}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class UpdateActivityDto {
  @IsBoolean()
  isActive!: boolean;
}

export class UpdateSubscriptionExpirationDto {
  @IsISO8601({ strict: true })
  subscriptionExpirationDate!: string;
}

