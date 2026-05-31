import { Global, Module } from "@nestjs/common";
import { DatabaseAdapterFactory } from "./database-adapter.factory";
import { ConnectionAdapterResolver } from "./connection-adapter.resolver";
import { CredentialEncryptionService } from "./credential-encryption.service";

@Global()
@Module({
  providers: [CredentialEncryptionService, DatabaseAdapterFactory, ConnectionAdapterResolver],
  exports: [CredentialEncryptionService, DatabaseAdapterFactory, ConnectionAdapterResolver],
})
export class DatabaseModule {}
