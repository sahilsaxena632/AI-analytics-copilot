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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/30 px-6 py-14 text-center sm:px-10 sm:py-16">
      {Icon ? <Icon className="mb-3 h-10 w-10 text-muted/90" aria-hidden /> : null}
      <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
}
