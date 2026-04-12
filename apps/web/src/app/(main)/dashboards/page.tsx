import { redirect } from "next/navigation";

export default function DashboardsRedirectPage() {
  redirect("/app/dashboards");
}
