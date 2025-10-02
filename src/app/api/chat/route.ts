import { NextResponse } from "next/server";
import { connectToDB } from "../../lib/mongodb";
import { Message } from "../../models/Message";
import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, type UIMessage } from "ai";

export const maxDuration = 30;

// Trim messages to keep last N
function trimMessages(messages: UIMessage[], maxMessages: number = 20): UIMessage[] {
  if (messages.length <= maxMessages) return messages;
  const firstMessage = messages[0];
  const recentMessages = messages.slice(-(maxMessages - 1));
  return [firstMessage, ...recentMessages];
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Connect to MongoDB
  await connectToDB();

  // Save user messages
  for (const msg of messages) {
    if (msg.role === "user") {
      await Message.create({
        role: msg.role,
        text: msg.parts
          .filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("\n"),
        parts: msg.parts,
      });
    }
  }

  // Trim messages for AI context
  const trimmedMessages = trimMessages(messages, 20);

  // Stream AI response to client
  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages: convertToModelMessages(trimmedMessages),
  });

  return result.toUIMessageStreamResponse();
}
