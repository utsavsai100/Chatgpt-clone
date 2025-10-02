import { NextRequest, NextResponse } from "next/server";
import cloudinary from "../../lib/cloudinary";

// /Users/utsavtiwari/chatgpt-clone/src/app/lib/cloudinary.ts

type UploadRequestBody = {
  file: string; // base64 string
};

export const POST = async (req: NextRequest) => {
  try {
    const body: UploadRequestBody = await req.json();
    const { file } = body;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const result = await cloudinary.uploader.upload(file, {
      folder: "chat_uploads",
    });

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
};
