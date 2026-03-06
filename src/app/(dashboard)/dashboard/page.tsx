import { redirectDashboardHome } from "@/app/(dashboard)/dashboard/_lib/context";

export default async function DashboardPage() {
  await redirectDashboardHome();
}
