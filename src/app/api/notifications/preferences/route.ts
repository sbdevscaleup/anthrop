import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import { notificationPreferenceSchema } from "@/modules/notifications/contracts";
import { upsertNotificationPreference } from "@/modules/notifications/service";

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredSession();
    const parsed = notificationPreferenceSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const preference = await upsertNotificationPreference(
      session.user.id,
      parsed.data,
    );
    return NextResponse.json({ success: true, preference });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    console.error("Failed to save notification preferences", error);
    return NextResponse.json(
      { success: false, error: "Failed to save notification preferences" },
      { status: 500 },
    );
  }
}

