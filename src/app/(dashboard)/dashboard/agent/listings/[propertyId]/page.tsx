import { and, eq, isNull, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/infrastructure/db/client";
import { property, propertyAgentAssignment } from "@/infrastructure/db/schema";
import { getDashboardRouteContext } from "@/app/(dashboard)/dashboard/_lib/context";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export default async function AgentListingDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const { session } = await getDashboardRouteContext();

  const assignment = await db.query.propertyAgentAssignment.findFirst({
    where: and(
      eq(propertyAgentAssignment.propertyId, propertyId),
      eq(propertyAgentAssignment.agentUserId, session.user.id),
      isNull(propertyAgentAssignment.endedAt),
    ),
    columns: { propertyId: true },
  });

  const listing = await db.query.property.findFirst({
    where: and(
      eq(property.id, propertyId),
      isNull(property.deletedAt),
      or(
        eq(property.agentUserId, session.user.id),
        assignment ? eq(property.id, assignment.propertyId) : undefined,
      ),
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
