import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./config/env.validation";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { ConnectionsModule } from "./connections/connections.module";
import { SchemaModule } from "./schema/schema.module";
import { QueryModule } from "./query/query.module";
import { SavedQueriesModule } from "./saved-queries/saved-queries.module";
import { DashboardsModule } from "./dashboards/dashboards.module";
import { AuditModule } from "./audit/audit.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    ConnectionsModule,
    SchemaModule,
    QueryModule,
    SavedQueriesModule,
    DashboardsModule,
  ],
})
export class AppModule {}
