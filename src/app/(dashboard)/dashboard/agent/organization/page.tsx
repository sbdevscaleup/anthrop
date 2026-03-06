import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireAgentDashboardContext } from "@/app/(dashboard)/dashboard/_lib/context";
import { OrganizationSelect } from "@/app/(dashboard)/dashboard/organizations/_components/organization-select";
import { CreateOrganizationButton } from "@/app/(dashboard)/dashboard/organizations/_components/create-organization-button";
import { OrganizationTabs } from "@/app/(dashboard)/dashboard/organizations/_components/organization-tabs";

export default async function AgentOrganizationPage() {
  await requireAgentDashboardContext({ requireOrganization: true });

  return (
    <div className="container mx-auto my-4 px-4">
      <Link href="/dashboard/agent" className="mb-6 inline-flex items-center">
        <ArrowLeft className="mr-2 size-4" />
        Back to Agent Home
      </Link>

      <div className="mb-8 flex items-center gap-2">
        <OrganizationSelect />
        <CreateOrganizationButton />
      </div>

      <OrganizationTabs />
    </div>
  );
}
