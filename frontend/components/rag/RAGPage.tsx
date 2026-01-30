"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { RAGType, Chat, Message, Document, Usage } from "@/types";
import { chatsApi, messagesApi, ragApi, usageApi, documentsApi } from "@/lib/api";
import { ChatList } from "@/components/chat/ChatList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatInput } from "@/components/chat/ChatInput";
import { FileUpload } from "@/components/upload/FileUpload";
import { DocumentList } from "@/components/upload/DocumentList";
import { UsageCounter } from "@/components/usage/UsageCounter";
import { Card } from "@/components/ui/Card";

interface RAGPageProps {
  ragType: RAGType;
  title: string;
  description: string;
  acceptedFileTypes?: string[];
}

export const RAGPage: React.FC<RAGPageProps> = ({
  ragType,
  title,
  description,
  acceptedFileTypes,
}) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sortMessages = useCallback((items: Message[]) => {
    return [...items].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      if (timeA !== timeB) return timeA - timeB;
      if (a.role !== b.role) return a.role === "user" ? -1 : 1;
      return a.id.localeCompare(b.id);
    });
  }, []);

  // Load chats
  const loadChats = useCallback(async () => {
    try {
      const response = await chatsApi.list(ragType);
      setChats(response.chats);
      if (response.chats.length > 0 && !selectedChatId) {
        setSelectedChatId(response.chats[0].id);
      }
    } catch (error) {
      console.error("Failed to load chats:", error);
    }
  }, [ragType, selectedChatId]);

  // Load messages
  const loadMessages = useCallback(async (chatId: string) => {
    try {
      const response = await messagesApi.list(chatId);
      setMessages(sortMessages(response.messages));
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  }, [sortMessages]);

  // Load documents
  const loadDocuments = useCallback(async () => {
    try {
      const response = await documentsApi.list(ragType);
      setDocuments(response.documents);
    } catch (error) {
      console.error("Failed to load documents:", error);
    }
  }, [ragType]);

  // Load usage
  const loadUsage = useCallback(async () => {
    try {
      const response = await usageApi.get(ragType);
      setUsage(response);
    } catch (error) {
      console.error("Failed to load usage:", error);
    }
  }, [ragType]);

  useEffect(() => {
    loadChats();
    loadDocuments();
    loadUsage();
  }, [loadChats, loadDocuments, loadUsage]);

  useEffect(() => {
    if (selectedChatId) {
      loadMessages(selectedChatId);
    } else {
      setMessages([]);
    }
  }, [selectedChatId, loadMessages]);

  const handleCreateChat = async () => {
    try {
      setIsLoading(true);
      const response = await chatsApi.create(
        ragType,
        `${title} chat`
      );
      setChats((prev) => [response.chat, ...prev]);
      setSelectedChatId(response.chat.id);
      setMessages([]);
    } catch (error) {
      console.error("Failed to create chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    const shouldDelete = window.confirm(
      "Delete this chat and its messages? This cannot be undone."
    );
    if (!shouldDelete) return;

    const previousChats = chats;
    const previousSelected = selectedChatId;
    const previousMessages = messages;
    const remaining = chats.filter((chat) => chat.id !== chatId);
    setChats(remaining);

    if (selectedChatId === chatId) {
      const nextChatId = remaining[0]?.id ?? null;
      setSelectedChatId(nextChatId);
      if (!nextChatId) {
        setMessages([]);
      }
    }

    try {
      await chatsApi.delete(chatId);
    } catch (error) {
      console.error("Failed to delete chat:", error);
      setChats(previousChats);
      setSelectedChatId(previousSelected);
      setMessages(previousMessages);
      alert("Failed to delete chat");
    }
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedChatId || !usage || usage.remaining <= 0) {
      return;
    }

    let userMessageId: string | null = null;

    try {
      setIsSending(true);

      // Add user message to UI immediately
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        chat_id: selectedChatId,
        role: "user",
        content: message,
        created_at: new Date().toISOString(),
      };
      userMessageId = userMessage.id;
      setMessages((prev) => sortMessages([...prev, userMessage]));

      // Send to API
      const response = await ragApi.query(selectedChatId, message);

      // Add AI response
      if (response.message) {
        const aiMessage: Message = {
          id: response.message_id || `ai-${Date.now()}`,
          chat_id: selectedChatId,
          role: "ai",
          content: response.message,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => sortMessages([...prev, aiMessage]));
      }

      // Reload messages and usage
      await loadMessages(selectedChatId);
      await loadUsage();
    } catch (error: any) {
      console.error("Failed to send message:", error);
      // Remove the user message on error
      if (userMessageId) {
        setMessages((prev) => prev.filter((m) => m.id !== userMessageId));
      }
      alert(error.response?.data?.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleUploadSuccess = async (document: Document) => {
    setDocuments((prev) => [document, ...prev]);
    await loadDocuments();
  };

  const handleDeleteDocument = async (documentId: string) => {
    const shouldDelete = window.confirm(
      "Delete this document? This cannot be undone."
    );
    if (!shouldDelete) return;

    const previousDocuments = documents;
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));

    try {
      await documentsApi.delete(documentId);
    } catch (error) {
      console.error("Failed to delete document:", error);
      setDocuments(previousDocuments);
      alert("Failed to delete document");
    }
  };

  const canSendMessage = usage !== null && usage.remaining > 0 && !isSending;

  useEffect(() => {
    const hasPending = documents.some(
      (doc) => doc.status === "uploaded" || doc.status === "processing"
    );

    if (hasPending && !pollRef.current) {
      pollRef.current = setInterval(() => {
        loadDocuments();
      }, 3000);
    }

    if (!hasPending && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [documents, loadDocuments]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Chat List Sidebar */}
      <ChatList
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={handleSelectChat}
        onCreateNew={handleCreateChat}
        onDeleteChat={handleDeleteChat}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-cream-300 p-6 shrink-0 shadow-sm" style={{ backgroundColor: '#faf8f5' }}>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>
          <p className="text-gray-600">{description}</p>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col" style={{ backgroundColor: '#f5f3f0' }}>
            {selectedChatId ? (
              <>
                <ChatWindow messages={messages} isLoading={isSending} />
                <ChatInput
                  onSend={handleSendMessage}
                  disabled={!canSendMessage}
                  placeholder={
                    usage && usage.remaining === 0
                      ? "Message limit reached"
                      : "Type your message..."
                  }
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">No chat selected</p>
                  <p className="text-sm">Create a new chat to get started</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l border-cream-300 overflow-y-auto p-6 space-y-6 shadow-sm" style={{ backgroundColor: '#faf8f5' }}>
            {/* Usage Counter */}
            {usage && <UsageCounter usage={usage} />}

            {/* File Upload */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Upload Documents
              </h3>
              <FileUpload
                ragType={ragType}
                onUploadSuccess={handleUploadSuccess}
                acceptedTypes={acceptedFileTypes}
              />
            </div>

            {/* Document List */}
            <div>
              <DocumentList
                documents={documents}
                onDelete={handleDeleteDocument}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
