import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

function flattenMessage(message: string | object): string {
  if (typeof message === "string") {
    return message;
  }
  const o = message as Record<string, unknown>;
  const m = o.message;
  if (Array.isArray(m)) {
    return m.map((x) => String(x)).filter(Boolean).join(" ");
  }
  if (typeof m === "string" && m.trim()) {
    return m.trim();
  }
  return "Request could not be completed";
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawMessage =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
          ? exception.message
          : "Internal server error";

    const messageText = flattenMessage(typeof rawMessage === "string" ? rawMessage : rawMessage);

    const body =
      typeof rawMessage === "string"
        ? { statusCode: status, message: messageText, path: request.url }
        : {
            ...(rawMessage as object),
            statusCode: status,
            message: messageText,
            path: request.url,
          };

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(body);
  }
}
