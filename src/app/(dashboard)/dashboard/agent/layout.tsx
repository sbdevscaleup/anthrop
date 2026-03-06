import Link from "next/link";
import { requireAgentDashboardContext } from "@/app/(dashboard)/dashboard/_lib/context";

const links = [
  { href: "/dashboard/agent", label: "Overview" },
  { href: "/dashboard/agent/listings", label: "Listings" },
  { href: "/dashboard/agent/leads", label: "Leads" },
  { href: "/dashboard/agent/messages", label: "Messages" },
  { href: "/dashboard/agent/applications", label: "Applications" },
  { href: "/dashboard/agent/organization", label: "Organization" },
];

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAgentDashboardContext();

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Agent Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </section>
  );
}
