import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global exception filter — normalizes all errors into a consistent
 * JSON response format for the frontend.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      message =
        typeof exResponse === 'string'
          ? exResponse
          : (exResponse as { message: string }).message ?? exception.message;
      code = `HTTP_${status}`;
    } else if (exception instanceof Error) {
      // Prisma known errors (e.g. EXCLUDE constraint violation)
      if (
        'code' in exception &&
        typeof (exception as { code: string }).code === 'string' &&
        (exception as { code: string }).code.startsWith('P')
      ) {
        const prismaError = exception as { code: string; meta?: Record<string, unknown> };
        if (prismaError.code === 'P2002') {
          status = HttpStatus.CONFLICT;
          message = 'A record with this value already exists';
          code = 'DUPLICATE_RECORD';
        } else if (prismaError.code === 'P2025') {
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          code = 'NOT_FOUND';
        } else {
          // EXCLUDE constraint violation (P2002 with constraint name)
          // or other Prisma errors
          status = HttpStatus.CONFLICT;
          message = 'Database constraint violation';
          code = 'CONSTRAINT_VIOLATION';
        }
      }

      this.logger.error(
        `${request.method} ${request.url} → ${status}: ${exception.message}`,
        exception.stack,
      );
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}
