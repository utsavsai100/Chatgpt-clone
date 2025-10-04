// app/history/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

type Message = {
  _id: string;
  role: "user" | "assistant";
  text: string;
  parts: { type: string; text?: string; image_url?: { url: string } }[];
  createdAt: string;
};

export default function HistoryPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch history on page load
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/chat/history");
        const data = await res.json();
        if (data.messages) setMessages(data.messages);
      } catch (err) {
        console.error("Failed to fetch history:", err);
        setMessages([]); // Show empty state on error
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const renderParts = (parts: Message["parts"]) => {
    return parts.map((part, index) => {
      if (part.type === "text") 
        return <div key={index} className="whitespace-pre-wrap">{part.text}</div>;
      if (part.type === "image_url")
        return (
          <div key={index} className="mt-2">
            <img
              src={part.image_url?.url}
              alt="Uploaded"
              className="rounded-lg max-w-xs border border-gray-200"
            />
          </div>
        );
      return null;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-gray-50">
        <div className="text-gray-500">Loading history...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-gray-50">
      {/* Header with back button */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4 flex items-center">
        <Link href="/" className="mr-4 text-gray-600 hover:text-gray-900">
          <FiArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">Chat History</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            No chat history found.
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg._id}
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
                  {renderParts(msg.parts)}
                  <div className="text-xs text-gray-400 mt-1 text-right">
                    {new Date(msg.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}