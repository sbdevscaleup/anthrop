import { NextRequest, NextResponse } from "next/server";
import { getRequiredWebSession } from "@/app/api/_shared/session";
import { uploadAccessRequestSchema } from "@/infrastructure/storage/contracts";
import { createUploadAccessForUser } from "@/infrastructure/storage/service";

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredWebSession();
    const parsed = uploadAccessRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = await createUploadAccessForUser(session.user.id, parsed.data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHENTICATED") {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 },
        );
      }
      if (error.message === "UPLOAD_ASSET_NOT_FOUND") {
        return NextResponse.json(
          { success: false, error: "Upload asset not found" },
          { status: 404 },
        );
      }
      if (error.message === "UPLOAD_NOT_COMPLETED") {
        return NextResponse.json(
          { success: false, error: "Upload is not completed yet" },
          { status: 409 },
        );
      }
      if (error.message === "PUBLIC_URL_NOT_CONFIGURED") {
        return NextResponse.json(
          { success: false, error: "Public media URL base is not configured" },
          { status: 500 },
        );
      }
    }

    console.error("Failed to create upload access URL", error);
    return NextResponse.json(
      { success: false, error: "Failed to create upload access URL" },
      { status: 500 },
    );
  }
}
