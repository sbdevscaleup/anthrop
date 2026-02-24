import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import { rentalApplicationDecisionInputSchema } from "@/modules/rental-applications/contracts";
import { decideRentalApplication } from "@/modules/rental-applications/service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getRequiredSession();
    const { id } = await context.params;
    const parsed = rentalApplicationDecisionInputSchema.safeParse(
      await request.json(),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const application = await decideRentalApplication(
      session.user.id,
      id,
      parsed.data,
    );
    return NextResponse.json({ success: true, application });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    if (
      error instanceof Error &&
      (error.message === "TERMINAL_STATE" || error.message === "INVALID_STATUS")
    ) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }
    if (
      error instanceof Error &&
      error.message === "RENTAL_APPLICATION_NOT_FOUND"
    ) {
      return NextResponse.json(
        { success: false, error: "Rental application not found" },
        { status: 404 },
      );
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }
    console.error("Failed to decide rental application", error);
    return NextResponse.json(
      { success: false, error: "Failed to decide rental application" },
      { status: 500 },
    );
  }
}
