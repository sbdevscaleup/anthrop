import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import { sendMessageInputSchema } from "@/modules/property-threads/contracts";
import { sendMessage } from "@/modules/property-threads/service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ threadId: string }> },
) {
  try {
    const session = await getRequiredSession();
    const { threadId } = await context.params;
    const parsed = sendMessageInputSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const message = await sendMessage(session.user.id, threadId, parsed.data);
    return NextResponse.json({ success: true, message });
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
    console.error("Failed to send message", error);
    return NextResponse.json(
      { success: false, error: "Failed to send message" },
      { status: 500 },
    );
  }
}

