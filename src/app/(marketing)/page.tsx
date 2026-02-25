import MapDemo from "@/modules/properties/ui/map-demo";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <section className="mb-8 text-center md:mb-10">
        <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
          Find your next home in Mongolia
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl">
          Discover listings to buy or rent, connect with trusted agents, and
          manage your property journey in one place.
        </p>
      </section>
      <MapDemo />
    </main>
  );
}
