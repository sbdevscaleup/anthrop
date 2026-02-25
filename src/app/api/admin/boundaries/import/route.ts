import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { activateBoundaryDatasetVersion } from "@/modules/admin-boundaries/infrastructure/import-boundary-dataset"

const payloadSchema = z.object({
  version: z.string().min(1),
  checksum: z.string().min(1),
  sourceMetaJson: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const parsed = payloadSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const version = await activateBoundaryDatasetVersion(parsed.data)
    return NextResponse.json({ success: true, version })
  } catch (error) {
    console.error("Failed to activate boundary dataset", error)
    return NextResponse.json(
      { success: false, error: "Failed to activate boundary dataset" },
      { status: 500 },
    )
  }
}
