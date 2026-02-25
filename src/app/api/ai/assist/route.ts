import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/modules/auth/application/session";
import { assistRequestSchema } from "@/modules/ai/contracts";
import { assist } from "@/modules/ai/service";

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredSession();
    const parsed = assistRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const result = await assist(
      session.user.id,
      session.session.activeOrganizationId ?? null,
      parsed.data,
    );
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    if (error instanceof Error && error.message === "CONSENT_REQUIRED") {
      return NextResponse.json(
        { success: false, error: "Consent token is required" },
        { status: 400 },
      );
    }
    console.error("Failed to process assist request", error);
    return NextResponse.json(
      { success: false, error: "Failed to process assist request" },
      { status: 500 },
    );
  }
}
