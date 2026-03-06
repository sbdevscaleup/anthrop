import { redirect } from "next/navigation";

export default async function LegacyOrganizationsRoute() {
  redirect("/dashboard/agent/organization");
}
