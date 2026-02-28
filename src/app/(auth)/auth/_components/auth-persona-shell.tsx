import type { ReactNode } from "react";
import { PERSONA_CONFIG, type AuthPersona } from "@/modules/auth/domain/personas";
import { cn } from "@/shared/lib/utils";

export function AuthPersonaShell({
  persona,
  mode,
  children,
}: {
  persona: AuthPersona;
  mode: "login" | "signup";
  children: ReactNode;
}) {
  const config = PERSONA_CONFIG[persona];
  const title = mode === "login" ? config.loginTitle : config.signupTitle;
  const description =
    mode === "login" ? config.loginDescription : config.signupDescription;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(241,245,249,1)_52%,_rgba(226,232,240,1))] px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section
          className={cn(
            "relative overflow-hidden rounded-[2rem] border border-border/50 bg-slate-950 px-6 py-8 text-slate-50 shadow-2xl sm:px-8 sm:py-10",
            "before:absolute before:inset-0 before:bg-gradient-to-br before:content-['']",
            config.accentClassName,
          )}
        >
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div className="space-y-6">
              <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-white/80">
                {config.label} access
              </div>
              <div className="space-y-3">
                <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
                  {title}
                </h1>
                <p className="max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
                  {description}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {config.signupBenefits.map((benefit) => (
                <div
                  key={benefit}
                  className="rounded-2xl border border-white/15 bg-white/8 p-4 text-sm text-slate-100 backdrop-blur"
                >
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">{children}</section>
      </div>
    </main>
  );
}
