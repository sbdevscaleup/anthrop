import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import { getAiSessionForUser } from "@/modules/ai/service";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getRequiredSession();
    const { id } = await context.params;
    const result = await getAiSessionForUser(id, session.user.id);

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    console.error("Failed to fetch ai session", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch ai session" },
      { status: 500 },
    );
  }
}

