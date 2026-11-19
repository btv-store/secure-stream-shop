import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="bg-gradient-hero">
      <div className="mx-auto flex max-w-md flex-col px-5 py-14">
        <div className="rounded-3xl border border-border bg-card/80 p-7 shadow-soft backdrop-blur">
          <h1 className="text-3xl font-bold">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
