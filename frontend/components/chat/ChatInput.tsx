"use client";

import React, { useState, KeyboardEvent } from "react";
import { FiSend } from "react-icons/fi";
import { Button } from "@/components/ui/Button";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = "Type your message...",
}) => {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-cream-300 p-4" style={{ backgroundColor: '#faf8f5' }}>
      <div className="flex gap-3 items-end">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 px-4 py-3 bg-white border border-cream-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none max-h-32 disabled:opacity-50 shadow-sm"
        />
        <Button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          size="md"
          className="flex-shrink-0"
        >
          <FiSend className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
