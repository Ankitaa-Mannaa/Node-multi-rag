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
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { PromptModal } from "@/components/ui/PromptModal";

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
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    kind: "chat" | "document";
    id: string;
    title: string;
    message: string;
  } | null>(null);
  const [renameState, setRenameState] = useState<Chat | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
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

  const formatRagTitle = (ragTypeLabel?: string) => {
    if (!ragTypeLabel) return "New Chat";
    return `${ragTypeLabel.charAt(0).toUpperCase()}${ragTypeLabel.slice(1)} chat`;
  };

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
      chatsApi
        .getDocuments(selectedChatId)
        .then((res) => setSelectedDocIds(new Set(res.document_ids)))
        .catch(() => setSelectedDocIds(new Set()));
    } else {
      setMessages([]);
      setSelectedDocIds(new Set());
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

  const performDeleteChat = async (chatId: string) => {
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

  const handleDeleteChat = (chatId: string) => {
    setConfirmState({
      kind: "chat",
      id: chatId,
      title: "Delete chat?",
      message: "This will remove the chat and all its messages. This cannot be undone.",
    });
  };

  const handleRenameChat = (chat: Chat) => {
    setRenameState(chat);
    setRenameValue(chat.title || "");
  };

  const handleToggleDocument = async (documentId: string) => {
    if (!selectedChatId) return;
    const next = new Set(selectedDocIds);
    if (next.has(documentId)) {
      next.delete(documentId);
    } else {
      next.add(documentId);
    }
    setSelectedDocIds(next);
    try {
      await chatsApi.setDocuments(selectedChatId, Array.from(next));
    } catch (error) {
      console.error("Failed to update chat documents:", error);
      // reload from server on failure
      try {
        const res = await chatsApi.getDocuments(selectedChatId);
        setSelectedDocIds(new Set(res.document_ids));
      } catch (_) {
        setSelectedDocIds(new Set());
      }
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

  const performDeleteDocument = async (documentId: string) => {
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

  const handleDeleteDocument = (documentId: string) => {
    setConfirmState({
      kind: "document",
      id: documentId,
      title: "Delete document?",
      message: "This will permanently remove the document and its data.",
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmState) return;
    const target = confirmState;
    setConfirmState(null);
    if (target.kind === "chat") {
      await performDeleteChat(target.id);
    } else {
      await performDeleteDocument(target.id);
    }
  };

  const handleConfirmRename = async () => {
    if (!renameState) return;
    const title = renameValue.trim();
    if (!title) return;
    setIsRenaming(true);
    try {
      const response = await chatsApi.update(renameState.id, title);
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === renameState.id ? { ...chat, title: response.chat.title } : chat
        )
      );
      setRenameState(null);
      setRenameValue("");
    } catch (error) {
      console.error("Failed to rename chat:", error);
      alert("Failed to rename chat");
    } finally {
      setIsRenaming(false);
    }
  };

  const canSendMessage = usage !== null && usage.remaining > 0 && !isSending;
  const isUploadDisabled = usage !== null && usage.remaining <= 0;
  const uploadDisabledMessage =
    usage?.reset_at
      ? `Uploads available ${new Date(usage.reset_at).toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : "Uploads are disabled until your limit resets.";

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
        onRenameChat={handleRenameChat}
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
                disabled={isUploadDisabled}
                disabledMessage={uploadDisabledMessage}
              />
            </div>

            {/* Document List */}
            <div>
              {selectedChatId && (
                <p className="text-xs text-gray-600 mb-3">
                  Selected documents are used for this chat. Leave all unchecked to use all documents.
                </p>
              )}
              <DocumentList
                documents={documents}
                onDelete={handleDeleteDocument}
                selectable={Boolean(selectedChatId)}
                selectedIds={selectedDocIds}
                onToggleSelect={handleToggleDocument}
              />
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(confirmState)}
        title={confirmState?.title || ""}
        description={confirmState?.message || ""}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmState(null)}
      />

      <PromptModal
        open={Boolean(renameState)}
        title="Rename chat"
        description="Give this chat a short, clear name."
        value={renameValue}
        placeholder={
          renameState
            ? formatRagTitle(renameState.rag_type)
            : "Chat title"
        }
        confirmText="Save"
        cancelText="Cancel"
        isSaving={isRenaming}
        onChange={setRenameValue}
        onConfirm={handleConfirmRename}
        onCancel={() => {
          if (isRenaming) return;
          setRenameState(null);
          setRenameValue("");
        }}
      />
    </div>
  );
};
