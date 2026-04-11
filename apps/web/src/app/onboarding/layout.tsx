export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-background to-background">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-10 sm:px-6">{children}</div>
    </div>
  );
}
