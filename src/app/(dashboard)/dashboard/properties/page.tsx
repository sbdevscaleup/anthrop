import { redirect } from "next/navigation";
import { getDashboardRouteContext } from "@/app/(dashboard)/dashboard/_lib/context";

export default async function LegacyPropertiesRoute() {
  const { context } = await getDashboardRouteContext();

  if (context.canAccessSeller && (!context.activePersona || context.activePersona === "seller")) {
    redirect("/dashboard/seller/listings");
  }

  if (context.canAccessAgent) {
    redirect("/dashboard/agent/listings");
  }

  if (context.canAccessSeller) {
    redirect("/dashboard/seller/listings");
  }

  redirect("/");
}
