import { applyDecorators } from "@nestjs/common";
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

/**
 * Prisma string @id values (e.g. `@default(cuid())`) are not RFC UUIDs — do not use `@IsUUID()`.
 */
export function IsPrismaClientId() {
  return applyDecorators(
    IsString(),
    IsNotEmpty(),
    MinLength(12),
    MaxLength(128),
    Matches(/^[a-zA-Z0-9_-]+$/, {
      message: "must be a valid resource identifier",
    }),
  );
}

/** Same rules when the id is optional (undefined skips validation). */
export function IsOptionalPrismaClientId() {
  return applyDecorators(
    IsOptional(),
    IsString(),
    MinLength(12),
    MaxLength(128),
    Matches(/^[a-zA-Z0-9_-]+$/, {
      message: "must be a valid resource identifier",
    }),
  );
}
