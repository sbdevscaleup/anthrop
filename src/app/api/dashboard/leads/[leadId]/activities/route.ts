import { NextRequest, NextResponse } from "next/server";
import { getDashboardContext } from "@/app/api/dashboard/_shared/access";
import { createLeadActivityInputSchema } from "@/modules/dashboard/contracts";
import { addLeadActivity } from "@/modules/dashboard/application/service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ leadId: string }> },
) {
  try {
    const { session, context: access } = await getDashboardContext();
    if (!access.canAccessSeller && !access.canAccessAgent) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { leadId } = await context.params;
    const parsed = createLeadActivityInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const activity = await addLeadActivity(leadId, session.user.id, parsed.data);
    return NextResponse.json({ success: true, activity });
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
    if (error instanceof Error && error.message === "LEAD_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
    }
    console.error("Failed to add lead activity", error);
    return NextResponse.json(
      { success: false, error: "Failed to add lead activity" },
      { status: 500 },
    );
  }
}
