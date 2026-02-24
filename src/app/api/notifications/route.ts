import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import { getNotificationsQuerySchema } from "@/modules/notifications/contracts";
import { listNotificationsForUser } from "@/modules/notifications/service";

export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredSession();
    const parsed = getNotificationsQuerySchema.safeParse({
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
      cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const result = await listNotificationsForUser(session.user.id, parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    console.error("Failed to list notifications", error);
    return NextResponse.json(
      { success: false, error: "Failed to list notifications" },
      { status: 500 },
    );
  }
}

