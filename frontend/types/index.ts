export type RAGType = "support" | "resume" | "expense" | "general";

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Chat {
  id: string;
  rag_type: RAGType;
  title: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: "user" | "ai";
  content: string;
  created_at: string;
}

export interface Document {
  id: string;
  rag_type: RAGType;
  file_name: string;
  status: "uploaded" | "processing" | "ready" | "failed";
  error_message?: string | null;
  created_at: string;
}

export interface Usage {
  rag_type: RAGType;
  message_count: number;
  remaining: number;
  limit: number;
  reset_at?: string | null;
}

export interface AuthResponse {
  user: User;
  token: string;
  refresh_token: string;
}

export interface ApiError {
  message: string;
  statusCode?: number;
}
