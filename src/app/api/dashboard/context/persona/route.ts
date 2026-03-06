import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDashboardContext } from "@/app/api/dashboard/_shared/access";
import { db } from "@/infrastructure/db/client";
import { session as authSession } from "@/infrastructure/db/schema";
import { setDashboardPersonaInputSchema } from "@/modules/dashboard/contracts";

export async function POST(request: NextRequest) {
  try {
    const { session, context } = await getDashboardContext();
    const parsed = setDashboardPersonaInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const persona = parsed.data.persona;
    if (persona === "seller" && !context.canAccessSeller) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    if (persona === "agent" && !context.canAccessAgent) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const sessionId = session.session.id;
    const sessionToken = session.session.token;
    if (!sessionId && !sessionToken) {
      return NextResponse.json(
        { success: false, error: "Session reference not found" },
        { status: 400 },
      );
    }

    await db
      .update(authSession)
      .set({ activePersona: persona, updatedAt: new Date() })
      .where(
        sessionId
          ? eq(authSession.id, sessionId)
          : and(eq(authSession.userId, session.user.id), eq(authSession.token, sessionToken!)),
      );

    return NextResponse.json({ success: true, persona });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    console.error("Failed to set dashboard persona", error);
    return NextResponse.json(
      { success: false, error: "Failed to set dashboard persona" },
      { status: 500 },
    );
  }
}
