"use client";

import React, { useEffect, useRef, useState } from "react";
import { Message } from "@/types";
import { FiUser, FiCpu } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface ChatWindowProps {
  messages: Message[];
  isLoading?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isLoading,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.length === 0 && !isLoading && (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>Start a conversation by sending a message</p>
        </div>
      )}
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex gap-4",
            message.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          {message.role === "ai" && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-black flex items-center justify-center shadow-sm">
              <FiCpu className="w-5 h-5 text-white" />
            </div>
          )}
          <div
            className={cn(
              "max-w-[70%] rounded-lg px-4 py-3 shadow-sm",
              message.role === "user"
                ? "bg-black text-white"
                : "bg-white text-gray-900 border border-cream-300"
            )}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
            <p className="text-xs mt-1.5 opacity-70">
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          {message.role === "user" && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shadow-sm">
              <FiUser className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
      ))}
      {isLoading && (
        <div className="flex gap-4 justify-start">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-black flex items-center justify-center shadow-sm">
            <FiCpu className="w-5 h-5 text-white" />
          </div>
          <div className="bg-white text-gray-900 rounded-lg px-4 py-3 border border-cream-300 shadow-sm">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
