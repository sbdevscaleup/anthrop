import Link from "next/link";
import { requireSellerDashboardContext } from "@/app/(dashboard)/dashboard/_lib/context";

const links = [
  { href: "/dashboard/seller", label: "Overview" },
  { href: "/dashboard/seller/listings", label: "Listings" },
  { href: "/dashboard/seller/leads", label: "Leads" },
  { href: "/dashboard/seller/messages", label: "Messages" },
  { href: "/dashboard/seller/applications", label: "Applications" },
];

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSellerDashboardContext();

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Seller Dashboard</h1>
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
          <Link
            href="/dashboard/seller/listings/new"
            className="rounded-md border px-3 py-1.5 text-sm font-medium"
          >
            New Listing
          </Link>
        </div>
      </div>
      {children}
    </section>
  );
}
