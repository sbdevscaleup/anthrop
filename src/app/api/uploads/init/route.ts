import { NextRequest, NextResponse } from "next/server";
import { getRequiredWebSession } from "@/app/api/_shared/session";
import { getIdempotencyKey } from "@/shared/lib/idempotency";
import { uploadInitRequestSchema } from "@/infrastructure/storage/contracts";
import { initUploadForUser } from "@/infrastructure/storage/service";

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredWebSession();
    const parsed = uploadInitRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const idempotencyKey = getIdempotencyKey(request.headers);
    const data = await initUploadForUser(
      session.user.id,
      parsed.data,
      idempotencyKey,
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHENTICATED") {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 },
        );
      }
      if (error.message === "INVALID_IDEMPOTENCY_KEY") {
        return NextResponse.json(
          { success: false, error: "Invalid Idempotency-Key header" },
          { status: 400 },
        );
      }
      if (error.message === "UPLOAD_RATE_LIMITED") {
        return NextResponse.json(
          { success: false, error: "Upload init rate limit exceeded" },
          { status: 429 },
        );
      }
      if (error.message === "UNSUPPORTED_MEDIA_TYPE") {
        return NextResponse.json(
          { success: false, error: "Unsupported media type" },
          { status: 415 },
        );
      }
      if (error.message === "UPLOAD_TOO_LARGE") {
        return NextResponse.json(
          { success: false, error: "File exceeds max allowed size" },
          { status: 413 },
        );
      }
      if (error.message === "R2_NOT_CONFIGURED") {
        return NextResponse.json(
          { success: false, error: "Storage is not configured" },
          { status: 500 },
        );
      }
    }

    console.error("Failed to initialize upload", error);
    return NextResponse.json(
      { success: false, error: "Failed to initialize upload" },
      { status: 500 },
    );
  }
}
