import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import {
  createThreadInputSchema,
  listThreadsQuerySchema,
} from "@/modules/property-threads/contracts";
import {
  createThread,
  listThreadsForProperty,
} from "@/modules/property-threads/service";

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredSession();
    const parsed = createThreadInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const thread = await createThread(session.user.id, parsed.data);
    return NextResponse.json({ success: true, thread });
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
    console.error("Failed to create thread", error);
    return NextResponse.json(
      { success: false, error: "Failed to create thread" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredSession();
    const parsed = listThreadsQuerySchema.safeParse({
      propertyId: request.nextUrl.searchParams.get("propertyId") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const threads = await listThreadsForProperty(
      session.user.id,
      parsed.data.propertyId,
      parsed.data.limit,
    );
    return NextResponse.json({ success: true, threads });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    console.error("Failed to list threads", error);
    return NextResponse.json(
      { success: false, error: "Failed to list threads" },
      { status: 500 },
    );
  }
}

