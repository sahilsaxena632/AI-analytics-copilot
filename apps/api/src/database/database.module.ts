import { Global, Module } from "@nestjs/common";
import { DatabaseAdapterFactory } from "./database-adapter.factory";
import { ConnectionAdapterResolver } from "./connection-adapter.resolver";

@Global()
@Module({
  providers: [DatabaseAdapterFactory, ConnectionAdapterResolver],
  exports: [DatabaseAdapterFactory, ConnectionAdapterResolver],
})
export class DatabaseModule {}
