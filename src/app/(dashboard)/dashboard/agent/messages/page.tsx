import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { getDashboardRouteContext } from "@/app/(dashboard)/dashboard/_lib/context";
import { listAgentThreads } from "@/modules/dashboard/application/service";

export default async function AgentMessagesPage() {
  const { session, context } = await getDashboardRouteContext();
  const { items } = await listAgentThreads({
    userId: session.user.id,
    organizationId: context.activeOrganizationId ?? null,
    limit: 50,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Messages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No team conversations.</p>
        ) : (
          items.map((thread) => (
            <div key={thread.id} className="rounded-md border p-3">
              <p className="font-medium">{thread.id}</p>
              <p className="text-sm text-muted-foreground">
                Last message: {thread.lastMessageAt?.toISOString?.() ?? "N/A"}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
