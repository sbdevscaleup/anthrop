import Link from "next/link";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { getDashboardRouteContext } from "@/app/(dashboard)/dashboard/_lib/context";
import { listSellerListings } from "@/modules/dashboard/application/service";

export default async function SellerListingsPage() {
  const { session } = await getDashboardRouteContext();
  const { items } = await listSellerListings({ userId: session.user.id, limit: 50 });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Seller Listings</CardTitle>
        <Link href="/dashboard/seller/listings/new" className="text-sm underline">
          Create listing
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No listings yet.</p>
        ) : (
          items.map((listing) => (
            <div key={listing.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <Link href={`/dashboard/seller/listings/${listing.id}`} className="font-medium">
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
