import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <>
      <AppHeader title="Settings" subtitle="Organization and profile settings — MVP placeholder." />
      <main className="flex flex-1 flex-col gap-6 p-8">
        <Card>
          <CardHeader>
            <CardTitle>TODO</CardTitle>
            <CardDescription>Extend with organization rename, invites, API keys for LLM providers, and secrets management.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            Connection strings should move to an encrypted vault before production use.
          </CardContent>
        </Card>
      </main>
    </>
  );
}
