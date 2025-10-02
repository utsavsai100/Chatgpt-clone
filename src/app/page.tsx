"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { FiSend, FiEdit3, FiBox } from "react-icons/fi";

// ---- Extend UIMessage parts to include images ----
type ImagePart = {
  type: "image_url";
  image_url: { url: string };
};

type ExtendedPart = UIMessage["parts"][number] | ImagePart;

export default function ChatPage() {
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, error, setMessages, regenerate } =
    useChat({
      transport: new DefaultChatTransport({
        api: "/api/chat",
      }),
    });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- Send text message ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "ready") return;
    if (!input.trim()) return;
    await sendMessage({ text: input.trim() });
    setInput("");
  };

  // ---- Edit user message ----
  const handleEdit = (msg: UIMessage) => {
    if (msg.role !== "user") return;

    const currentText = msg.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");

    const updatedText = prompt("Edit your message:", currentText);
    if (!updatedText?.trim()) return;

    const newTextPart = { type: "text" as const, text: updatedText.trim() };
    const nonTextParts = msg.parts.filter((part) => part.type !== "text");
    const updatedParts = [newTextPart, ...nonTextParts];

    const updatedMsg: UIMessage = { ...msg, parts: updatedParts };
    setMessages(messages.map((m) => (m.id === msg.id ? updatedMsg : m)));
    regenerate();
  };

  // ---- Render text + image parts ----
  const renderParts = (parts: ExtendedPart[]) => {
    return parts.map((part, index) => {
      if (part.type === "text") {
        return (
          <div key={index} className="whitespace-pre-wrap">
            {part.text}
          </div>
        );
      }
      if (part.type === "image_url") {
        return (
          <div key={index} className="mt-2">
            <img
              src={part.image_url.url}
              alt="Uploaded content"
              className="rounded-lg max-w-xs border border-gray-200"
            />
          </div>
        );
      }
      return null;
    });
  };

  // ---- File input change (uploads image to Cloudinary) ----
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("Uploading file:", file.name);

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;

      // Send image to your API route
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64 }),
      });
      const data = await res.json();

      if (data.success) {
        // 1️⃣ Add image to chat immediately
        const imageMessage: UIMessage = {
          id: crypto.randomUUID(),
          role: "user",
          parts: [
            { type: "text", text: "📷 Uploaded an image:" },
            { type: "image_url", image_url: { url: data.url } },
          ] as any,
        };
        setMessages([...messages, imageMessage]);

        // 2️⃣ Send image to assistant so it can respond
        await sendMessage({
          text: "",
          parts: [{ type: "image_url", image_url: { url: data.url } }] as any,
        });
      } else {
        console.error("Upload failed", data.error);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-dvh bg-gray-50" role="main">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-bold text-gray-800">ChatGPT Clone</h1>
      </header>

      {/* Error */}
      {error && (
        <div className="bg-red-100 text-red-700 p-2 text-center text-sm">
          Error: {error.message}{" "}
          <button
            onClick={() => window.location.reload()}
            className="ml-2 text-blue-600 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg, index) => (
            <div
              key={msg.id || index}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : "bg-gray-100 text-gray-800 rounded-tl-none"
                }`}
              >
                <div className="flex items-start gap-2 group">
                  {msg.role === "assistant" && (
                    <div className="mt-0.5 text-gray-400">
                      <FiBox size={16} />
                    </div>
                  )}
                  <div className="prose prose-sm whitespace-pre-wrap">
                    {renderParts(msg.parts as ExtendedPart[])}
                  </div>
                  {msg.role === "user" && (
                    <button
                      onClick={() => handleEdit(msg)}
                      className="ml-2 mt-0.5 text-blue-200 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FiEdit3 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-end gap-2"
        >
          {/* File input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-blue-600"
          >
            📎
          </button>

          {/* Text input */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Message ChatGPT..."
            className="w-full resize-none border border-gray-300 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32 font-semibold text-gray-900 placeholder-gray-500"
            rows={1}
            disabled={status !== "ready"}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={!input.trim() || status !== "ready"}
            className="mb-1 p-2 rounded-full bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            <FiSend size={18} />
          </button>
        </form>

        {status !== "ready" && (
          <p className="text-xs text-gray-500 text-center mt-2 animate-pulse">
            Assistant is typing...
          </p>
        )}
      </div>
    </div>
  );
}


// utsavtiwari398_db_user
// axGVbzV1P5WlBtjE
// mongodb+srv://utsavtiwari398_db_user:axGVbzV1P5WlBtjE@gptcluster.i5fabke.mongodb.net/