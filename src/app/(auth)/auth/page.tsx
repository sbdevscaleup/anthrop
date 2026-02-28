import { AUTH_PERSONAS } from "@/modules/auth/domain/personas";
import { PersonaChooserCard } from "@/app/(auth)/auth/_components/persona-chooser-card";

export default function AuthChooserPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(241,245,249,1)_55%,_rgba(226,232,240,1))] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="max-w-3xl space-y-4 py-8">
          <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            Persona-specific access
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Choose the experience that matches how you use the platform
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Buyers and renters get marketplace-oriented entrypoints. Sellers and agents
            move directly into listing and organization workflows. New accounts
            default to renter when no explicit persona is chosen.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {AUTH_PERSONAS.map((persona) => (
            <PersonaChooserCard key={persona} persona={persona} />
          ))}
        </section>
      </div>
    </main>
  );
}
