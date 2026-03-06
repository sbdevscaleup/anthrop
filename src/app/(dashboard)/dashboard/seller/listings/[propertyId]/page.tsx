import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/infrastructure/db/client";
import { property } from "@/infrastructure/db/schema";
import { getDashboardRouteContext } from "@/app/(dashboard)/dashboard/_lib/context";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export default async function SellerListingDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const { session } = await getDashboardRouteContext();

  const listing = await db.query.property.findFirst({
    where: and(
      eq(property.id, propertyId),
      eq(property.ownerUserId, session.user.id),
      isNull(property.deletedAt),
    ),
  });

  if (!listing) {
    notFound();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{listing.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>Workflow: {listing.workflowStatus}</p>
        <p>Listing Type: {listing.listingType}</p>
        <p>Price: {listing.priceMinor ?? "N/A"} {listing.currencyCode}</p>
      </CardContent>
    </Card>
  );
}
