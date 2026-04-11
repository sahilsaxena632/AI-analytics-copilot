import { Module } from "@nestjs/common";
import { DashboardsService } from "./dashboards.service";
import { DashboardsController } from "./dashboards.controller";
import { ConnectionsModule } from "../connections/connections.module";

@Module({
  imports: [ConnectionsModule],
  controllers: [DashboardsController],
  providers: [DashboardsService],
})
export class DashboardsModule {}
