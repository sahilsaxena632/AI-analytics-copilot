"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  Bell,
  Bot,
  Database,
  Eye,
  Palette,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  UserRound,
  Warehouse,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { FormField } from "@/components/form-field";
import { LoadingState } from "@/components/loading-state";
import { PageMain } from "@/components/page-main";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { friendlyApiMessage } from "@/lib/friendly-api-message";
import { cn } from "@/lib/utils";

type UserSettings = {
  displayName: string;
  email: string;
  role: string;
  theme: "light" | "dark" | "system";
  locale: string;
  density: "comfortable" | "compact";
  updatedAt: string;
};

type NotificationPreferences = {
  anomalyAlerts: boolean;
  scheduledReports: boolean;
  dashboardRefresh: boolean;
  inApp: boolean;
  email: boolean;
};

type DashboardDefaults = {
  defaultLayout: "balanced" | "compact" | "spacious";
  refreshInterval: "manual" | "5m" | "15m" | "1h";
};

type WorkspaceSettings = {
  organizationName: string;
  timezone: string;
  defaultDatabaseConnectionId: string | null;
  defaultQueryRowLimit: number;
  defaultSchemaContextMode: "selected_tables" | "full_schema";
  showSqlByDefault: boolean;
  showExplanationByDefault: boolean;
  autoRunGeneratedSql: boolean;
  autoChart: boolean;
  defaultChartType: "auto" | "bar" | "line" | "area" | "pie" | "table" | "kpi";
  kpiFirst: boolean;
  chartCollapsedByDefault: boolean;
  chartDensity: "comfortable" | "compact";
  clarificationMode: "automatic" | "ask_when_unsure";
  lowConfidenceWarning: boolean;
  preferredLlmProvider: "automatic" | "groq" | "gemini";
  preferredLlmModel: string | null;
  notifications: NotificationPreferences;
  dashboardDefaults: DashboardDefaults;
  updatedAt: string;
};

type SettingsDatabase = {
  id: string;
  name: string;
  type: "postgres" | "mysql";
  host: string | null;
  database: string | null;
  isActive: boolean;
  isDefault: boolean;
  lastTestStatus: string;
  updatedAt: string;
};

type SettingsPayload = {
  user: UserSettings;
  workspace: WorkspaceSettings;
  databases: SettingsDatabase[];
};

const sections = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "workspace", label: "Workspace", icon: Warehouse },
  { id: "query", label: "Query Defaults", icon: SlidersHorizontal },
  { id: "visualization", label: "Visualization", icon: Eye },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "databases", label: "Databases", icon: Database },
  { id: "ai", label: "AI / LLM", icon: Bot },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "danger", label: "Danger Zone", icon: ShieldAlert },
];

export default function SettingsPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [draft, setDraft] = useState<SettingsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeDatabases = useMemo(() => draft?.databases.filter((db) => db.isActive) ?? [], [draft]);

  const loadSettings = useCallback(async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<SettingsPayload>("/settings", { token });
      setSettings(data);
      setDraft(data);
    } catch (err) {
      setError(friendlyApiMessage(err, "Settings could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadSettings();
    }
  }, [token, loadSettings]);

  const setUser = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setDraft((prev) => (prev ? { ...prev, user: { ...prev.user, [key]: value } } : prev));
  };

  const setWorkspace = <K extends keyof WorkspaceSettings>(key: K, value: WorkspaceSettings[K]) => {
    setDraft((prev) => (prev ? { ...prev, workspace: { ...prev.workspace, [key]: value } } : prev));
  };

  const setNotification = <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            workspace: {
              ...prev.workspace,
              notifications: { ...prev.workspace.notifications, [key]: value },
            },
          }
        : prev,
    );
  };

  const setDashboardDefault = <K extends keyof DashboardDefaults>(key: K, value: DashboardDefaults[K]) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            workspace: {
              ...prev.workspace,
              dashboardDefaults: { ...prev.workspace.dashboardDefaults, [key]: value },
            },
          }
        : prev,
    );
  };

  async function saveUserSettings(label = "Profile settings saved.") {
    if (!token || !draft) {
      return;
    }
    setSaving("user");
    setError(null);
    setSuccess(null);
    try {
      const user = await apiFetch<UserSettings>("/settings/user", {
        method: "PUT",
        token,
        body: JSON.stringify(draft.user),
      });
      setDraft((prev) => (prev ? { ...prev, user } : prev));
      setSettings((prev) => (prev ? { ...prev, user } : prev));
      setSuccess(label);
    } catch (err) {
      setError(friendlyApiMessage(err, "Profile settings could not be saved."));
    } finally {
      setSaving(null);
    }
  }

  async function saveWorkspaceSettings(label = "Workspace settings saved.") {
    if (!token || !draft) {
      return;
    }
    setSaving("workspace");
    setError(null);
    setSuccess(null);
    try {
      const workspace = await apiFetch<WorkspaceSettings>("/settings/workspace", {
        method: "PUT",
        token,
        body: JSON.stringify(draft.workspace),
      });
      const databases = await apiFetch<SettingsDatabase[]>("/settings/databases", { token });
      setDraft((prev) => (prev ? { ...prev, workspace, databases } : prev));
      setSettings((prev) => (prev ? { ...prev, workspace, databases } : prev));
      setSuccess(label);
    } catch (err) {
      setError(friendlyApiMessage(err, "Workspace settings could not be saved."));
    } finally {
      setSaving(null);
    }
  }

  async function saveWorkspacePatch(patch: Partial<WorkspaceSettings>, label: string) {
    if (!token || !draft) {
      return;
    }
    const nextWorkspace = { ...draft.workspace, ...patch };
    setDraft((prev) => (prev ? { ...prev, workspace: nextWorkspace } : prev));
    setSaving("workspace");
    setError(null);
    setSuccess(null);
    try {
      const workspace = await apiFetch<WorkspaceSettings>("/settings/workspace", {
        method: "PUT",
        token,
        body: JSON.stringify(nextWorkspace),
      });
      const databases = await apiFetch<SettingsDatabase[]>("/settings/databases", { token });
      setDraft((prev) => (prev ? { ...prev, workspace, databases } : prev));
      setSettings((prev) => (prev ? { ...prev, workspace, databases } : prev));
      setSuccess(label);
    } catch (err) {
      setError(friendlyApiMessage(err, "Workspace settings could not be saved."));
    } finally {
      setSaving(null);
    }
  }

  async function resetSettings(scope: "user" | "workspace") {
    if (!token) {
      return;
    }
    setSaving(`reset-${scope}`);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiFetch<SettingsPayload>(`/settings/${scope}`, {
        method: "DELETE",
        token,
      });
      setSettings(data);
      setDraft(data);
      setSuccess(scope === "user" ? "Personal preferences reset." : "Workspace defaults reset.");
    } catch (err) {
      setError(friendlyApiMessage(err, "Settings could not be reset."));
    } finally {
      setSaving(null);
    }
  }

  if (!token) {
    return (
      <>
        <AppHeader title="Settings" subtitle="Control how your analytics workspace behaves." />
        <PageMain>
          <EmptyState title="Sign in required" description="Sign in to manage workspace and personal settings." />
        </PageMain>
      </>
    );
  }

  return (
    <>
      <AppHeader
        title="Settings"
        subtitle="Control default databases, query behavior, AI guidance, visual defaults, and product preferences."
      />
      <PageMain gapClassName="gap-6">
        {error ? <ErrorBanner message={error} /> : null}
        {success ? (
          <Alert variant="success">
            <AlertTitle>Saved</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}

        {loading || !draft ? (
          <Card>
            <CardContent className="flex justify-center py-16">
              <LoadingState label="Loading settings…" />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
            <aside className="h-fit rounded-lg border border-border/70 bg-card/45 p-2 lg:sticky lg:top-24">
              <nav className="space-y-1" aria-label="Settings sections">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      {section.label}
                    </a>
                  );
                })}
              </nav>
            </aside>

            <div className="space-y-6">
              <SectionCard
                id="profile"
                title="Profile"
                description="Personal identity shown inside the analytics workspace."
                action={
                  <SaveButton saving={saving === "user"} onClick={() => void saveUserSettings()} label="Save profile" />
                }
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Display name" id="display-name" hint="Used in workspace activity and saved work.">
                    <Input
                      id="display-name"
                      value={draft.user.displayName}
                      onChange={(e) => setUser("displayName", e.target.value)}
                      placeholder="Your name"
                    />
                  </FormField>
                  <FormField label="Email" id="email" hint="Email is tied to sign-in and is read-only here.">
                    <Input id="email" value={draft.user.email} readOnly className="opacity-80" />
                  </FormField>
                  <FormField label="Role" id="role" hint="Team roles can be expanded later without changing settings.">
                    <Input id="role" value={draft.user.role} readOnly className="opacity-80" />
                  </FormField>
                  <SelectField
                    id="locale"
                    label="Language / locale"
                    value={draft.user.locale}
                    onChange={(value) => setUser("locale", value)}
                    options={[
                      ["en-US", "English (US)"],
                      ["en-GB", "English (UK)"],
                      ["hi-IN", "English / India"],
                    ]}
                    hint="Stored now for future formatting and localization."
                  />
                </div>
              </SectionCard>

              <SectionCard
                id="workspace"
                title="Workspace"
                description="Business-level defaults shared by people using this organization."
                action={
                  <SaveButton
                    saving={saving === "workspace"}
                    onClick={() => void saveWorkspaceSettings()}
                    label="Save workspace"
                  />
                }
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Workspace name" id="workspace-name" hint="Shown in shared dashboards and settings.">
                    <Input
                      id="workspace-name"
                      value={draft.workspace.organizationName}
                      onChange={(e) => setWorkspace("organizationName", e.target.value)}
                    />
                  </FormField>
                  <SelectField
                    id="timezone"
                    label="Timezone"
                    value={draft.workspace.timezone}
                    onChange={(value) => setWorkspace("timezone", value)}
                    options={[
                      ["UTC", "UTC"],
                      ["Asia/Kolkata", "Asia/Kolkata"],
                      ["America/New_York", "America/New York"],
                      ["Europe/London", "Europe/London"],
                    ]}
                    hint="Used for reports, dashboard refresh labels, and future schedules."
                  />
                </div>
              </SectionCard>

              <SectionCard
                id="query"
                title="Query Defaults"
                description="Choose how Ask behaves before SQL is generated or executed."
                action={
                  <SaveButton
                    saving={saving === "workspace"}
                    onClick={() => void saveWorkspaceSettings("Query defaults saved.")}
                    label="Save query defaults"
                  />
                }
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    id="default-db"
                    label="Default database"
                    value={draft.workspace.defaultDatabaseConnectionId ?? ""}
                    onChange={(value) => setWorkspace("defaultDatabaseConnectionId", value || null)}
                    options={[
                      ["", "No default"],
                      ...activeDatabases.map((db) => [db.id, `${db.name} (${db.type})`] as [string, string]),
                    ]}
                    hint="The database new query sessions should start from."
                  />
                  <FormField label="Default row limit" id="row-limit" hint="Keeps accidental large results manageable.">
                    <Input
                      id="row-limit"
                      type="number"
                      min={10}
                      max={10000}
                      value={draft.workspace.defaultQueryRowLimit}
                      onChange={(e) => setWorkspace("defaultQueryRowLimit", Number(e.target.value))}
                    />
                  </FormField>
                  <SelectField
                    id="schema-mode"
                    label="Schema scope"
                    value={draft.workspace.defaultSchemaContextMode}
                    onChange={(value) =>
                      setWorkspace("defaultSchemaContextMode", value as WorkspaceSettings["defaultSchemaContextMode"])
                    }
                    options={[
                      ["selected_tables", "Selected tables only"],
                      ["full_schema", "Full schema"],
                    ]}
                    hint="Default context mode for LLM-backed SQL generation."
                  />
                  <SelectField
                    id="clarification"
                    label="When context is unclear"
                    value={draft.workspace.clarificationMode}
                    onChange={(value) =>
                      setWorkspace("clarificationMode", value as WorkspaceSettings["clarificationMode"])
                    }
                    options={[
                      ["ask_when_unsure", "Ask for clarification"],
                      ["automatic", "Generate automatically"],
                    ]}
                    hint="A manager-friendly safety default for ambiguous questions."
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <SwitchRow
                    label="Show generated SQL by default"
                    description="Keep SQL visible for review before running."
                    checked={draft.workspace.showSqlByDefault}
                    onCheckedChange={(checked) => setWorkspace("showSqlByDefault", checked)}
                  />
                  <SwitchRow
                    label="Show explanation by default"
                    description="Display the model’s reasoning below generated SQL."
                    checked={draft.workspace.showExplanationByDefault}
                    onCheckedChange={(checked) => setWorkspace("showExplanationByDefault", checked)}
                  />
                  <SwitchRow
                    label="Auto-run after generation"
                    description="Saved as a preference; execution remains manually controlled until wired in."
                    checked={draft.workspace.autoRunGeneratedSql}
                    onCheckedChange={(checked) => setWorkspace("autoRunGeneratedSql", checked)}
                  />
                  <SwitchRow
                    label="Low-confidence warning"
                    description="Warn analysts when the SQL generation confidence is low."
                    checked={draft.workspace.lowConfidenceWarning}
                    onCheckedChange={(checked) => setWorkspace("lowConfidenceWarning", checked)}
                  />
                </div>
              </SectionCard>

              <SectionCard
                id="visualization"
                title="Visualization"
                description="Default chart and KPI behavior for result exploration."
                action={
                  <SaveButton
                    saving={saving === "workspace"}
                    onClick={() => void saveWorkspaceSettings("Visualization defaults saved.")}
                    label="Save visualization"
                  />
                }
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    id="chart-type"
                    label="Ambiguous chart preference"
                    value={draft.workspace.defaultChartType}
                    onChange={(value) => setWorkspace("defaultChartType", value as WorkspaceSettings["defaultChartType"])}
                    options={[
                      ["auto", "Let the app decide"],
                      ["bar", "Bar"],
                      ["line", "Line"],
                      ["area", "Area"],
                      ["pie", "Pie"],
                      ["table", "Table"],
                      ["kpi", "KPI"],
                    ]}
                    hint="Used when results support multiple good visualizations."
                  />
                  <SelectField
                    id="dashboard-layout"
                    label="Dashboard layout style"
                    value={draft.workspace.dashboardDefaults.defaultLayout}
                    onChange={(value) => setDashboardDefault("defaultLayout", value as DashboardDefaults["defaultLayout"])}
                    options={[
                      ["balanced", "Balanced"],
                      ["compact", "Compact"],
                      ["spacious", "Spacious"],
                    ]}
                    hint="Persisted for future dashboard creation defaults."
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <SwitchRow
                    label="Auto-chart query results"
                    description="Suggest a chart automatically after result data loads."
                    checked={draft.workspace.autoChart}
                    onCheckedChange={(checked) => setWorkspace("autoChart", checked)}
                  />
                  <SwitchRow
                    label="Prefer KPI-first cards"
                    description="For single-value results, favor KPI cards over tables."
                    checked={draft.workspace.kpiFirst}
                    onCheckedChange={(checked) => setWorkspace("kpiFirst", checked)}
                  />
                  <SwitchRow
                    label="Collapse charts by default"
                    description="Start result charts collapsed for quieter review."
                    checked={draft.workspace.chartCollapsedByDefault}
                    onCheckedChange={(checked) => setWorkspace("chartCollapsedByDefault", checked)}
                  />
                  <SwitchRow
                    label="Compact chart density"
                    description="Reduce spacing in charts and result visual areas."
                    checked={draft.workspace.chartDensity === "compact"}
                    onCheckedChange={(checked) => setWorkspace("chartDensity", checked ? "compact" : "comfortable")}
                  />
                </div>
              </SectionCard>

              <SectionCard
                id="notifications"
                title="Notifications"
                description="Choose which product moments should create alerts."
                action={
                  <SaveButton
                    saving={saving === "workspace"}
                    onClick={() => void saveWorkspaceSettings("Notification preferences saved.")}
                    label="Save notifications"
                  />
                }
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <SwitchRow
                    label="Anomaly alerts"
                    description="Notify when future monitoring spots unusual changes."
                    checked={draft.workspace.notifications.anomalyAlerts}
                    onCheckedChange={(checked) => setNotification("anomalyAlerts", checked)}
                  />
                  <SwitchRow
                    label="Scheduled reports"
                    description="Notify when scheduled summaries are ready."
                    checked={draft.workspace.notifications.scheduledReports}
                    onCheckedChange={(checked) => setNotification("scheduledReports", checked)}
                  />
                  <SwitchRow
                    label="Dashboard refresh updates"
                    description="Alert when important dashboards refresh."
                    checked={draft.workspace.notifications.dashboardRefresh}
                    onCheckedChange={(checked) => setNotification("dashboardRefresh", checked)}
                  />
                  <SwitchRow
                    label="In-app notifications"
                    description="Show product notifications inside the app."
                    checked={draft.workspace.notifications.inApp}
                    onCheckedChange={(checked) => setNotification("inApp", checked)}
                  />
                  <SwitchRow
                    label="Email notifications"
                    description="Persisted for later email delivery support."
                    checked={draft.workspace.notifications.email}
                    onCheckedChange={(checked) => setNotification("email", checked)}
                  />
                </div>
              </SectionCard>

              <SectionCard
                id="databases"
                title="Connected Databases"
                description="Review workspace connections and choose the default query target."
                action={
                  <Link href="/onboarding/connect-database" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
                    Add connection
                  </Link>
                }
              >
                {draft.databases.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 bg-background/25 p-5 text-sm text-muted-foreground">
                    No database connections yet. Add one to make it available as a default.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {draft.databases.map((db) => (
                      <div
                        key={db.id}
                        className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/25 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{db.name}</p>
                            <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                              {db.type}
                            </span>
                            {db.isDefault ? (
                              <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                Default
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {[db.host, db.database].filter(Boolean).join(" / ") || "Connection details hidden"}
                          </p>
                          <p className="text-xs text-muted-foreground">Status: {db.lastTestStatus}</p>
                        </div>
                        <Button
                          type="button"
                          variant={db.isDefault ? "secondary" : "default"}
                          size="sm"
                          disabled={!db.isActive || saving === "workspace"}
                          onClick={() => {
                            void saveWorkspacePatch(
                              { defaultDatabaseConnectionId: db.id },
                              `${db.name} is now the default database.`,
                            );
                          }}
                        >
                          {db.isDefault ? "Current default" : "Make default"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                id="ai"
                title="AI / LLM"
                description="Set how the SQL assistant behaves without exposing environment-managed secrets."
                action={
                  <SaveButton
                    saving={saving === "workspace"}
                    onClick={() => void saveWorkspaceSettings("AI defaults saved.")}
                    label="Save AI defaults"
                  />
                }
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    id="provider"
                    label="Preferred provider"
                    value={draft.workspace.preferredLlmProvider}
                    onChange={(value) =>
                      setWorkspace("preferredLlmProvider", value as WorkspaceSettings["preferredLlmProvider"])
                    }
                    options={[
                      ["automatic", "Automatic"],
                      ["groq", "Groq"],
                      ["gemini", "Gemini"],
                    ]}
                    hint="API keys remain environment-managed on the server."
                  />
                  <FormField label="Preferred model" id="model" hint="Optional. Leave blank to use the server default.">
                    <Input
                      id="model"
                      value={draft.workspace.preferredLlmModel ?? ""}
                      onChange={(e) => setWorkspace("preferredLlmModel", e.target.value || null)}
                      placeholder="Server default"
                    />
                  </FormField>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/25 px-4 py-3 text-sm text-muted-foreground">
                  Safety checks remain enforced by the API. These settings only control persisted defaults for the product
                  experience.
                </div>
              </SectionCard>

              <SectionCard
                id="appearance"
                title="Appearance"
                description="Keep the app calm and readable for your preferred working style."
                action={
                  <SaveButton
                    saving={saving === "user"}
                    onClick={() => void saveUserSettings("Appearance preferences saved.")}
                    label="Save appearance"
                  />
                }
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    id="theme"
                    label="Theme"
                    value={draft.user.theme}
                    onChange={(value) => setUser("theme", value as UserSettings["theme"])}
                    options={[
                      ["system", "System"],
                      ["dark", "Dark"],
                      ["light", "Light"],
                    ]}
                    hint="Persisted now; can be wired into a theme provider later."
                  />
                  <SelectField
                    id="density"
                    label="Density"
                    value={draft.user.density}
                    onChange={(value) => setUser("density", value as UserSettings["density"])}
                    options={[
                      ["comfortable", "Comfortable"],
                      ["compact", "Compact"],
                    ]}
                    hint="Controls the preferred level of UI spacing."
                  />
                </div>
              </SectionCard>

              <SectionCard
                id="danger"
                title="Danger Zone"
                description="Reset preferences without deleting analytics data, dashboards, queries, or connections."
              >
                <div className="space-y-3">
                  <DangerAction
                    title="Reset workspace settings"
                    description="Restore query, visualization, notification, AI, and database defaults."
                    disabled={saving === "reset-workspace"}
                    onClick={() => void resetSettings("workspace")}
                  />
                  <DangerAction
                    title="Clear personal preferences"
                    description="Reset profile preferences, theme, locale, and density."
                    disabled={saving === "reset-user"}
                    onClick={() => void resetSettings("user")}
                  />
                  <DangerAction
                    title="Disconnect default database preference"
                    description="Keep all database connections, but remove the default query target."
                    disabled={saving === "workspace"}
                    onClick={() => {
                      void saveWorkspacePatch(
                        { defaultDatabaseConnectionId: null },
                        "Default database preference cleared.",
                      );
                    }}
                  />
                </div>
              </SectionCard>

              {settings ? (
                <p className="text-xs text-muted-foreground">
                  Last loaded from saved settings. Workspace updated {new Date(settings.workspace.updatedAt).toLocaleString()}.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </PageMain>
    </>
  );
}

function SectionCard({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-24">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  hint,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: [string, string][];
  hint?: string;
  onChange: (value: string) => void;
}) {
  return (
    <FormField label={label} id={id} hint={hint}>
      <select id={id} className="control-base" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </FormField>
  );
}

function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/70 bg-background/25 p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

function SaveButton({ saving, label, onClick }: { saving: boolean; label: string; onClick: () => void }) {
  return (
    <Button type="button" size="sm" onClick={onClick} disabled={saving}>
      {saving ? <LoadingState label="Saving…" /> : label}
    </Button>
  );
}

function DangerAction({
  title,
  description,
  disabled,
  onClick,
}: {
  title: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-red-900/35 bg-red-950/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-red-100">{title}</p>
        <p className="text-sm text-red-100/75">{description}</p>
      </div>
      <Button type="button" variant="destructive" size="sm" disabled={disabled} onClick={onClick}>
        <RotateCcw className="h-4 w-4" aria-hidden />
        Reset
      </Button>
    </div>
  );
}
