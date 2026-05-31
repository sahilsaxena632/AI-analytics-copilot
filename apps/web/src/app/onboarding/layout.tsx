export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-backdrop min-h-screen bg-background">
      <div className="animate-fade-up mx-auto flex min-h-screen max-w-lg flex-col px-4 py-10 sm:px-6">{children}</div>
    </div>
  );
}
