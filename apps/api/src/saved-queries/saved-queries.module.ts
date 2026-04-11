import { Module } from "@nestjs/common";
import { SavedQueriesService } from "./saved-queries.service";
import { SavedQueriesController } from "./saved-queries.controller";
import { ConnectionsModule } from "../connections/connections.module";

@Module({
  imports: [ConnectionsModule],
  controllers: [SavedQueriesController],
  providers: [SavedQueriesService],
  exports: [SavedQueriesService],
})
export class SavedQueriesModule {}
