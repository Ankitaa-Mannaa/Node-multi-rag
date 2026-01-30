"use client";

import React from "react";
import { Chat } from "@/types";
import { FiMessageSquare, FiTrash2, FiEdit2 } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface ChatListProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateNew: () => void;
  onDeleteChat?: (chatId: string) => void;
  onRenameChat?: (chat: Chat) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
  onCreateNew,
  onDeleteChat,
  onRenameChat,
}) => {
  const formatRagTitle = (ragType?: string) => {
    if (!ragType) return "New Chat";
    return `${ragType.charAt(0).toUpperCase()}${ragType.slice(1)} chat`;
  };

  return (
    <div className="w-64 border-r border-cream-300 flex flex-col h-full shadow-sm" style={{ backgroundColor: '#faf8f5' }}>
      <div className="p-4 border-b border-cream-300">
        <button
          onClick={onCreateNew}
          className="w-full px-4 py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-sm"
        >
          + New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {chats.length === 0 ? (
          <div className="text-center text-gray-500 mt-8 px-4">
            <FiMessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No chats yet</p>
            <p className="text-xs mt-1">Create a new chat to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg transition-colors group",
                  selectedChatId === chat.id
                    ? "bg-black text-white shadow-sm"
                    : "text-gray-800 hover:bg-cream-200"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {chat.title || formatRagTitle(chat.rag_type)}
                    </p>
                    <p className="text-xs opacity-70 mt-0.5">
                      {new Date(chat.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {(onDeleteChat || onRenameChat) && (
                    <div className="flex items-center gap-1">
                      {onRenameChat && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRenameChat(chat);
                          }}
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            selectedChatId === chat.id
                              ? "text-white/70 hover:text-white hover:bg-white/10"
                              : "text-gray-500 hover:text-gray-900 hover:bg-cream-200"
                          )}
                          aria-label="Rename chat"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                      )}
                      {onDeleteChat && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(chat.id);
                          }}
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            selectedChatId === chat.id
                              ? "text-white/70 hover:text-white hover:bg-white/10"
                              : "text-gray-500 hover:text-red-500 hover:bg-red-50"
                          )}
                          aria-label="Delete chat"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
