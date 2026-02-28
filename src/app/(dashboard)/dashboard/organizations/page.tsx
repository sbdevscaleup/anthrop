import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { auth } from "@/modules/auth/infrastructure/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { OrganizationSelect } from "@/app/(dashboard)/dashboard/organizations/_components/organization-select"
import { CreateOrganizationButton } from "@/app/(dashboard)/dashboard/organizations/_components/create-organization-button"
import { OrganizationTabs } from "@/app/(dashboard)/dashboard/organizations/_components/organization-tabs"

export default async function OrganizationsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session == null) return redirect("/auth")

  return (
    <div className="container mx-auto my-4 px-4">
      <Link href="/dashboard" className="inline-flex items-center mb-6">
        <ArrowLeft className="size-4 mr-2" />
        Back to Home
      </Link>

      <div className="flex items-center mb-8 gap-2">
        <OrganizationSelect />
        <CreateOrganizationButton />
      </div>

      <OrganizationTabs />
    </div>
  )
}
