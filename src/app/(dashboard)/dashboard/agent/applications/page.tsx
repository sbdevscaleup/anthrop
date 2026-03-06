import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { getDashboardRouteContext } from "@/app/(dashboard)/dashboard/_lib/context";
import { listAgentApplications } from "@/modules/dashboard/application/service";

export default async function AgentApplicationsPage() {
  const { session, context } = await getDashboardRouteContext();
  const { items } = await listAgentApplications({
    userId: session.user.id,
    organizationId: context.activeOrganizationId ?? null,
    limit: 50,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Applications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No applications in queue.</p>
        ) : (
          items.map((application) => (
            <div key={application.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{application.propertyId}</p>
                  <p className="text-sm text-muted-foreground">{application.applicantUserId}</p>
                </div>
                <Badge variant="secondary">{application.status}</Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
