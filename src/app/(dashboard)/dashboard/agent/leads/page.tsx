import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { getDashboardRouteContext } from "@/app/(dashboard)/dashboard/_lib/context";
import { listAgentLeads } from "@/modules/dashboard/application/service";

export default async function AgentLeadsPage() {
  const { session, context } = await getDashboardRouteContext();
  const { items } = await listAgentLeads({
    userId: session.user.id,
    organizationId: context.activeOrganizationId ?? null,
    limit: 50,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Leads</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leads in queue.</p>
        ) : (
          items.map((lead) => (
            <div key={lead.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{lead.sourceType}</p>
                  <p className="text-sm text-muted-foreground">
                    Last activity: {lead.lastActivityAt?.toISOString?.() ?? "N/A"}
                  </p>
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
