import { auth } from "@/modules/auth/infrastructure/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session == null) return redirect("/auth")

  return (
    <div className="px-2 py-4">
      <h1>Hi, this is MAIN Dashboard Page</h1>
    </div>
  )
}
