import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { getDashboardRouteContext } from "@/app/(dashboard)/dashboard/_lib/context";
import { listSellerThreads } from "@/modules/dashboard/application/service";

export default async function SellerMessagesPage() {
  const { session } = await getDashboardRouteContext();
  const { items } = await listSellerThreads({ userId: session.user.id, limit: 50 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seller Messages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active conversations.</p>
        ) : (
          items.map((thread) => (
            <div key={thread.id} className="rounded-md border p-3">
              <p className="font-medium">{thread.title}</p>
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
