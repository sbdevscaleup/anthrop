import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import {
  createRentalApplicationInputSchema,
  listRentalApplicationsQuerySchema,
} from "@/modules/rental-applications/contracts";
import {
  createRentalApplication,
  listRentalApplications,
} from "@/modules/rental-applications/service";

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredSession();
    const parsed = createRentalApplicationInputSchema.safeParse(
      await request.json(),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const created = await createRentalApplication(session.user.id, parsed.data);
    return NextResponse.json({ success: true, application: created });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    if (error instanceof Error && error.message === "PROPERTY_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: "Property not found" },
        { status: 404 },
      );
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }
    console.error("Failed to create rental application", error);
    return NextResponse.json(
      { success: false, error: "Failed to create rental application" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredSession();
    const parsed = listRentalApplicationsQuerySchema.safeParse({
      propertyId: request.nextUrl.searchParams.get("propertyId") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
      cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const result = await listRentalApplications(session.user.id, parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    if (error instanceof Error && error.message === "PROPERTY_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: "Property not found" },
        { status: 404 },
      );
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }
    console.error("Failed to list rental applications", error);
    return NextResponse.json(
      { success: false, error: "Failed to list rental applications" },
      { status: 500 },
    );
  }
}
