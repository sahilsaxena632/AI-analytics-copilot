import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&_svg]:absolute [&_svg]:left-4 [&_svg]:top-4 [&_svg+div]:pl-7",
  {
    variants: {
      variant: {
        default: "border-border bg-card/80 text-foreground",
        success: "border-emerald-900/50 bg-emerald-950/40 text-emerald-50",
        destructive: "border-red-900/50 bg-red-950/40 text-red-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export function Alert({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm opacity-90 [&_p]:leading-relaxed", className)} {...props} />;
}
