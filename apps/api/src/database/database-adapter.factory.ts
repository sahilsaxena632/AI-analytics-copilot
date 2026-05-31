import { BadRequestException, Injectable } from "@nestjs/common";
import type { DatabaseConnection } from "@prisma/client";
import { ExternalDbProvider } from "@prisma/client";
import { hasStructuredCredentials } from "./credentials.helpers";
import type { ConnectionCredentials } from "./connection-credentials.types";
import type { DatabaseAdapter } from "./adapters/database-adapter.interface";
import { MysqlAdapter } from "./adapters/mysql.adapter";
import { PostgresAdapter } from "./adapters/postgres.adapter";
import { CredentialEncryptionService } from "./credential-encryption.service";

/**
 * Central registry for external DB adapters.
 * Extension: add `ExternalDbProvider.sqlserver` (Prisma) + `SqlServerAdapter` + branch below.
 */
@Injectable()
export class DatabaseAdapterFactory {
  constructor(private readonly credentialEncryption: CredentialEncryptionService) {}

  createFromCredentials(type: ExternalDbProvider, credentials: ConnectionCredentials): DatabaseAdapter {
    if (type === ExternalDbProvider.mysql) {
      return new MysqlAdapter(credentials);
    }
    return new PostgresAdapter({ kind: "credentials", credentials });
  }

  fromPrismaRow(row: DatabaseConnection): DatabaseAdapter {
    if (hasStructuredCredentials(row)) {
      const credentials: ConnectionCredentials = {
        host: row.host!,
        port: row.port!,
        database: row.databaseName!,
        username: row.username!,
        password: this.credentialEncryption.decrypt(row.password)!,
        ssl: row.ssl,
      };
      if (row.databaseType === ExternalDbProvider.mysql) {
        return new MysqlAdapter(credentials);
      }
      return new PostgresAdapter({ kind: "credentials", credentials });
    }

    if (row.databaseType === ExternalDbProvider.mysql) {
      throw new BadRequestException(
        "This MySQL connection is missing structured credentials. Recreate the connection from the onboarding form.",
      );
    }

    const legacy = row.connectionString?.trim();
    if (legacy) {
      const connectionUri = this.credentialEncryption.decrypt(legacy)!;
      return new PostgresAdapter({ kind: "uri", connectionUri });
    }

    throw new BadRequestException("Connection is missing credentials");
  }
}
