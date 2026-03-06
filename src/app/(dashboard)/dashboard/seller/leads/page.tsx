import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { getDashboardRouteContext } from "@/app/(dashboard)/dashboard/_lib/context";
import { listSellerLeads } from "@/modules/dashboard/application/service";

export default async function SellerLeadsPage() {
  const { session } = await getDashboardRouteContext();
  const { items } = await listSellerLeads({ userId: session.user.id, limit: 50 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seller Leads</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leads yet.</p>
        ) : (
          items.map((lead) => (
            <div key={lead.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{lead.title}</p>
                  <p className="text-sm text-muted-foreground">{lead.sourceType}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{lead.priority}</Badge>
                  <Badge variant="secondary">{lead.status}</Badge>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
