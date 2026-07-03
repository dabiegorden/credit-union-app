import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

/**
 * POST /api/upload
 * Body: { file: <data URI or remote URL>, folder?: string }
 * Uploads an image to Cloudinary and returns its secure URL.
 * Public — used during client self-registration (Ghana card + signature).
 */
export async function POST(request: NextRequest) {
  try {
    const { file, folder } = await request.json();

    if (!file || typeof file !== "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Only allow image uploads
    if (!file.startsWith("data:image/") && !file.startsWith("http")) {
      return NextResponse.json(
        { error: "Only image uploads are allowed" },
        { status: 400 },
      );
    }

    const result = await cloudinary.uploader.upload(file, {
      folder: folder || "credit-union/uploads",
      resource_type: "image",
    });

    return NextResponse.json({ success: true, url: result.secure_url });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
