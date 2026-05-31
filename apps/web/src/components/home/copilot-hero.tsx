"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUGGESTED_PROMPTS } from "@/lib/home-demo-data";

export function CopilotHero() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function ask(question: string) {
    const q = question.trim();
    if (!q) return;
    router.push(`/app/ask?question=${encodeURIComponent(q)}`);
  }

  return (
    <section className="gradient-hero animate-fade-up relative overflow-hidden rounded-2xl border border-border/60 p-6 shadow-elevated sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl" aria-hidden />
      <div className="relative max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          AI Analytics Copilot
        </span>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Ask anything about <span className="gradient-text">your data</span>
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Type a question in plain language. The copilot writes safe, read-only SQL, runs it, and turns the result into a clear
          chart and insight.
        </p>

        <form
          className="mt-5 flex flex-col gap-2.5 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            ask(value);
          }}
        >
          <div className="relative flex-1">
            <Sparkles className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. Show revenue by region for the last 6 months"
              className="h-12 w-full rounded-xl border border-border/70 bg-background/70 pl-10 pr-4 text-sm text-foreground shadow-soft backdrop-blur transition-colors placeholder:text-muted-foreground/80 focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Ask a question about your data"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 shrink-0">
            Ask copilot
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Try:</span>
          {SUGGESTED_PROMPTS.map(({ label, question, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => ask(question)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground"
            >
              <Icon className="h-3.5 w-3.5 text-primary/80" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
