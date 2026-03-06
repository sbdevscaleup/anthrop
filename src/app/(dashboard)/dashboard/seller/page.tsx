import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { getDashboardRouteContext } from "@/app/(dashboard)/dashboard/_lib/context";
import { getSellerOverview } from "@/modules/dashboard/application/service";

export default async function SellerDashboardPage() {
  const { session } = await getDashboardRouteContext();
  const overview = await getSellerOverview(session.user.id);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>Total Listings</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{overview.listings.total}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Open Leads</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{overview.openLeads}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pending Applications</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">
          {overview.pendingApplications}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Active Threads</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{overview.activeThreads}</CardContent>
      </Card>
    </div>
  );
}
