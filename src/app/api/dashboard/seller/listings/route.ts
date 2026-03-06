import { NextRequest, NextResponse } from "next/server";
import { requireSellerApiAccess } from "@/app/api/dashboard/_shared/access";
import { dashboardListQuerySchema } from "@/modules/dashboard/contracts";
import { listSellerListings } from "@/modules/dashboard/application/service";

export async function GET(request: NextRequest) {
  try {
    const { session } = await requireSellerApiAccess();
    const parsed = dashboardListQuerySchema.safeParse({
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
      cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const result = await listSellerListings({
      userId: session.user.id,
      ...parsed.data,
    });

    return NextResponse.json({ success: true, ...result });
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
    console.error("Failed to list seller listings", error);
    return NextResponse.json(
      { success: false, error: "Failed to list seller listings" },
      { status: 500 },
    );
  }
}
