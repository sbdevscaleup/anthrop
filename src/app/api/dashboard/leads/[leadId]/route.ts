import { NextRequest, NextResponse } from "next/server";
import { getDashboardContext } from "@/app/api/dashboard/_shared/access";
import { updateLeadInputSchema } from "@/modules/dashboard/contracts";
import { updateLead } from "@/modules/dashboard/application/service";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ leadId: string }> },
) {
  try {
    const { session, context: access } = await getDashboardContext();
    if (!access.canAccessSeller && !access.canAccessAgent) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { leadId } = await context.params;
    const parsed = updateLeadInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const lead = await updateLead(leadId, session.user.id, parsed.data);
    return NextResponse.json({ success: true, lead });
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
    console.error("Failed to update lead", error);
    return NextResponse.json(
      { success: false, error: "Failed to update lead" },
      { status: 500 },
    );
  }
}
