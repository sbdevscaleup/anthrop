import { NextResponse } from "next/server";
import { requireAgentApiAccess } from "@/app/api/dashboard/_shared/access";
import { getAgentOverview } from "@/modules/dashboard/application/service";

export async function GET() {
  try {
    const { session, context } = await requireAgentApiAccess();
    const overview = await getAgentOverview(
      session.user.id,
      context.activeOrganizationId ?? null,
    );
    return NextResponse.json({ success: true, overview });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to fetch agent overview", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch agent overview" },
      { status: 500 },
    );
  }
}
