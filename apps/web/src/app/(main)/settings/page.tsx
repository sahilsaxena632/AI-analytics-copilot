import { AppHeader } from "@/components/app-header";
import { PageMain } from "@/components/page-main";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <>
      <AppHeader title="Settings" subtitle="Workspace preferences and organization options." />
      <PageMain gapClassName="gap-6">
        <Card className="border-border bg-card/40 shadow-sm">
          <CardHeader>
            <CardTitle>Coming soon</CardTitle>
            <CardDescription>
              We’ll add team-friendly options here—such as renaming your workspace, invitations, and safer handling of
              credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted">
            For demos, use the sidebar to manage connections and run analytics. Production deployments should store secrets
            in a vault, not in the app database.
          </CardContent>
        </Card>
      </PageMain>
    </>
  );
}
