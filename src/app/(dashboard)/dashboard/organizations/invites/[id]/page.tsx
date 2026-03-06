import { redirect } from "next/navigation";

export default async function LegacyOrganizationInviteRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/agent/organization/invites/${id}`);
}
