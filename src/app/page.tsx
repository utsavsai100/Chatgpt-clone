// app/page.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { FiSend, FiEdit3, FiBox } from "react-icons/fi";

// Fallback ID generator (safe for all environments)
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

// Extend message parts to support images
type ImagePart = {
  type: "image_url";
  image_url: { url: string };
};

type ExtendedPart = UIMessage["parts"][number] | ImagePart;

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const { messages, sendMessage, status, error, setMessages, regenerate } =
    useChat({
      transport: new DefaultChatTransport({
        api: "/api/chat",
      }),
    });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle scroll to show/hide scroll button
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    }
  }, []);

  // Attach scroll listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // Scroll to bottom manually
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollButton(false);
  };

  // Send text message
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "ready" || !input.trim()) return;
    await sendMessage({ text: input.trim() });
    setInput("");
  };

  // Enter edit mode
  const handleEdit = (msg: UIMessage) => {
    if (msg.role !== "user") return;

    const currentText = msg.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");

    setEditingMessageId(msg.id);
    setEditText(currentText);
  };

  // Save edited message and regenerate
  const handleSaveEdit = async () => {
    if (!editingMessageId || !editText.trim()) {
      setEditingMessageId(null);
      return;
    }

    const msgToEdit = messages.find(m => m.id === editingMessageId);
    if (!msgToEdit) return;

    const newTextPart = { type: "text" as const, text: editText.trim() };
    const nonTextParts = msgToEdit.parts.filter((part) => part.type !== "text");
    const updatedParts = [newTextPart, ...nonTextParts];

    const updatedMsg: UIMessage = { ...msgToEdit, parts: updatedParts };
    setMessages(messages.map((m) => (m.id === editingMessageId ? updatedMsg : m)));
    setEditingMessageId(null);

    await regenerate();
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText("");
  };

  // Render message parts (text + images)
  const renderParts = (parts: ExtendedPart[]) => {
    return parts.map((part, index) => {
      if (part.type === "text") {
        return (
          <div key={index} className="whitespace-pre-wrap break-words">
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
              className="rounded-lg max-w-full h-auto border border-gray-200"
            />
          </div>
        );
      }
      return null;
    });
  };

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64 }),
      });
      const data = await res.json();

      if (data.success) {
        const imageMessage: UIMessage = {
          id: generateId(),
          role: "user",
          parts: [
            { type: "text", text: "📷 Uploaded an image:" },
            { type: "image_url", image_url: { url: data.url } },
          ] as any,
        };
        setMessages([...messages, imageMessage]);

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
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
        <h1 className="text-base sm:text-lg font-bold text-gray-800">ChatGPT Clone</h1>
        <button
          onClick={() => window.location.href = '/history'}
          className="text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 sm:px-3 py-1 rounded-lg transition-colors"
        >
          History
        </button>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-100 text-red-700 p-2 text-center text-xs sm:text-sm">
          Error: {error.message}{" "}
          <button
            onClick={() => window.location.reload()}
            className="ml-1 sm:ml-2 text-blue-600 underline text-xs sm:text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 sm:py-3 pb-24 md:pb-28"
      >
        <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
          {messages.map((msg, index) => (
            <div
              key={msg.id || index}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-4 min-h-fit ${msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-none"
                  : "bg-gray-100 text-gray-800 rounded-tl-none"
                  }`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  {msg.role === "assistant" && (
                    <div className="mt-0.5 text-gray-400 flex-shrink-0">
                      <FiBox size={16} className="sm:w-4 sm:h-4 md:w-5 md:h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {msg.role === "user" ? (
                      editingMessageId === msg.id ? (
                        // Editing Mode - Larger on medium+
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full p-2.5 sm:p-3 md:p-4 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm md:text-base"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex gap-2 sm:gap-3 justify-end">
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1.5 text-sm md:px-4 md:py-2 md:text-base bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              className="px-3 py-1.5 text-sm md:px-4 md:py-2 md:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Save & Regenerate
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="prose prose-xs sm:prose-sm md:prose-base whitespace-pre-wrap break-words min-w-0 flex-1">
                            {renderParts(msg.parts as ExtendedPart[])}
                          </div>
                          <button
                            onClick={() => handleEdit(msg)}
                            className="p-2 rounded-full text-gray-300 hover:text-white hover:bg-blue-700 focus:outline-none focus:bg-blue-700 focus:text-white transition-colors flex-shrink-0"
                            title="Edit message"
                            aria-label="Edit message"
                          >
                            <FiEdit3 size={16} className="sm:w-4 sm:h-4 md:w-5 md:h-5" />
                          </button>
                        </div>
                      )
                    ) : (
                      // Assistant message
                      <div className="prose prose-xs sm:prose-sm md:prose-base whitespace-pre-wrap break-words">
                        {renderParts(msg.parts as ExtendedPart[])}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Responsive sizing */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 md:py-4">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 sm:gap-3"
          >
            {/* Attach + Textarea */}
            <div className="flex items-center flex-1 gap-2">
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
                className="p-2.5 sm:p-3 text-gray-500 hover:text-blue-600 flex-shrink-0"
                aria-label="Attach file"
              >
                📎
              </button>
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
                className="flex-1 resize-none border border-gray-300 rounded-2xl py-2.5 px-3 sm:py-3 sm:px-4 md:py-4 md:px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-28 sm:max-h-32 md:max-h-40 text-sm md:text-base font-medium text-gray-900 placeholder-gray-500"
                rows={1}
                disabled={status !== "ready"}
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || status !== "ready"}
              className="p-2.5 sm:p-3 md:p-3.5 rounded-full bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex-shrink-0"
              aria-label="Send message"
            >
              <FiSend size={18} className="sm:w-4.5 sm:h-4.5 md:w-5 md:h-5" />
            </button>
          </form>

          {status !== "ready" && (
            <p className="text-xs sm:text-sm text-gray-500 text-center mt-1 sm:mt-2 animate-pulse">
              Assistant is typing...
            </p>
          )}
        </div>
      </div>


      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 sm:bottom-28 md:bottom-32 right-4 z-20 bg-blue-600 text-white p-2.5 rounded-full shadow-lg hover:bg-blue-700 transition-all"
          aria-label="Scroll to latest message"
        >
          <FiSend size={18} className="rotate-90" />
        </button>
      )}
    </div>
  );
}