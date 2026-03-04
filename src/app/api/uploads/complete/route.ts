import { NextRequest, NextResponse } from "next/server";
import { getRequiredWebSession } from "@/app/api/_shared/session";
import { getIdempotencyKey } from "@/shared/lib/idempotency";
import { uploadCompleteRequestSchema } from "@/infrastructure/storage/contracts";
import { completeUploadForUser } from "@/infrastructure/storage/service";

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredWebSession();
    const parsed = uploadCompleteRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const idempotencyKey = getIdempotencyKey(request.headers);
    const data = await completeUploadForUser(
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
      if (error.message === "UPLOAD_ASSET_NOT_FOUND") {
        return NextResponse.json(
          { success: false, error: "Upload asset not found" },
          { status: 404 },
        );
      }
      if (error.message === "UPLOAD_STORAGE_KEY_MISMATCH") {
        return NextResponse.json(
          { success: false, error: "Upload key mismatch" },
          { status: 400 },
        );
      }
      if (error.message === "UPLOAD_OBJECT_NOT_FOUND") {
        return NextResponse.json(
          { success: false, error: "Uploaded object not found in storage" },
          { status: 404 },
        );
      }
      if (error.message === "UPLOAD_MIME_MISMATCH") {
        return NextResponse.json(
          { success: false, error: "Uploaded file content type mismatch" },
          { status: 400 },
        );
      }
      if (error.message === "UPLOAD_SIZE_MISMATCH") {
        return NextResponse.json(
          { success: false, error: "Uploaded file size mismatch" },
          { status: 400 },
        );
      }
    }

    console.error("Failed to complete upload", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete upload" },
      { status: 500 },
    );
  }
}
