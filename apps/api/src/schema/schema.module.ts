import { Module } from "@nestjs/common";
import { SchemaService } from "./schema.service";
import { SchemaController } from "./schema.controller";
import { ConnectionsModule } from "../connections/connections.module";

@Module({
  imports: [ConnectionsModule],
  controllers: [SchemaController],
  providers: [SchemaService],
})
export class SchemaModule {}
