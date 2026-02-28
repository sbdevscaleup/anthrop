"use client";

import { Card, CardContent } from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { authClient } from "@/modules/auth/application/auth-client";
import { MembersTab } from "./members-tab";
import { InvitesTab } from "./invites-tab";

export function OrganizationTabs() {
  const { data: activeOrganization } = authClient.useActiveOrganization();

  return (
    <div className="space-y-4">
      {activeOrganization && (
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          </TabsList>
          <Card>
            <CardContent>
              <TabsContent value="members">
                <MembersTab />
              </TabsContent>

              <TabsContent value="invitations">
                <InvitesTab />
              </TabsContent>

              <TabsContent value="subscriptions">
                {/* <SubscriptionsTab /> */}
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      )}
    </div>
  );
}