import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";
import { ApplicationError } from "../../../domain/common/application-error";

@Catch(ApplicationError)
export class ApplicationErrorFilter implements ExceptionFilter {
  catch(exception: ApplicationError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statuses = {
      VALIDATION_ERROR: HttpStatus.BAD_REQUEST,
      UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
      FORBIDDEN: HttpStatus.FORBIDDEN,
      NOT_FOUND: HttpStatus.NOT_FOUND,
      EMAIL_ALREADY_EXISTS: HttpStatus.BAD_REQUEST,
      CONFLICT: HttpStatus.CONFLICT,
    } as const;
    response.status(statuses[exception.code]).json({
      statusCode: statuses[exception.code],
      code: exception.code,
      message: exception.message,
    });
  }
}

