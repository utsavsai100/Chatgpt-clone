import { NextResponse } from "next/server";
import { connectToDB } from "@/app/lib/mongodb"; // ✅ correct import name
import { Message } from "@/app/models/Message";  // ✅ use named import

export async function GET() {
  try {
    await connectToDB();

    const messages = await Message.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("History fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
