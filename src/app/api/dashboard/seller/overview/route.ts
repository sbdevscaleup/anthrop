import { NextResponse } from "next/server";
import { requireSellerApiAccess } from "@/app/api/dashboard/_shared/access";
import { getSellerOverview } from "@/modules/dashboard/application/service";

export async function GET() {
  try {
    const { session } = await requireSellerApiAccess();
    const overview = await getSellerOverview(session.user.id);
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
    console.error("Failed to fetch seller overview", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch seller overview" },
      { status: 500 },
    );
  }
}
