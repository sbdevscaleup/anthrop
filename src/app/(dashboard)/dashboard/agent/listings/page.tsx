import Link from "next/link";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { getDashboardRouteContext } from "@/app/(dashboard)/dashboard/_lib/context";
import { listAgentListings } from "@/modules/dashboard/application/service";

export default async function AgentListingsPage() {
  const { session, context } = await getDashboardRouteContext();
  const { items } = await listAgentListings({
    userId: session.user.id,
    organizationId: context.activeOrganizationId ?? null,
    limit: 50,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assigned Listings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assigned listings.</p>
        ) : (
          items.map((listing) => (
            <div key={listing.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <Link href={`/dashboard/agent/listings/${listing.id}`} className="font-medium">
                  {listing.title}
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{listing.listingType}</Badge>
                  <Badge variant="secondary">{listing.workflowStatus}</Badge>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
