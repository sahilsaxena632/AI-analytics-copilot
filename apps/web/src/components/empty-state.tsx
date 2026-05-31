import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="animate-fade-up flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/20 px-6 py-14 text-center sm:px-10 sm:py-16">
      {Icon ? (
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-card/70 text-primary shadow-soft">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
      ) : null}
      <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-7">{action}</div> : null}
    </div>
  );
}
