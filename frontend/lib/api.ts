import axios, { AxiosError } from "axios";
import type { AuthResponse, Chat, Message, Document, Usage, RAGType, User } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          const response = await axios.post<AuthResponse>(
            `${API_BASE_URL}/auth/refresh`,
            { refresh_token: refreshToken }
          );
          const { token, refresh_token } = response.data;
          localStorage.setItem("token", token);
          localStorage.setItem("refresh_token", refresh_token);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/register", {
      email,
      password,
    });
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      await api.post("/auth/logout", { refresh_token: refreshToken });
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
  },

  getMe: async () => {
    const response = await api.get<{ user: User }>("/auth/me");
    return response.data.user;
  },
};

// Chats API
export const chatsApi = {
  create: async (ragType: RAGType, title?: string): Promise<{ chat: Chat }> => {
    const response = await api.post<{ chat: Chat }>("/chats", {
      rag_type: ragType,
      title,
    });
    return response.data;
  },

  list: async (ragType?: RAGType, limit = 50, offset = 0): Promise<{ chats: Chat[] }> => {
    const params = new URLSearchParams();
    if (ragType) params.append("rag_type", ragType);
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());
    const response = await api.get<{ chats: Chat[] }>(`/chats?${params.toString()}`);
    return response.data;
  },
  delete: async (chatId: string): Promise<void> => {
    await api.delete(`/chats/${chatId}`);
  },
};

// Messages API
export const messagesApi = {
  list: async (chatId: string, limit = 50, offset = 0): Promise<{ messages: Message[] }> => {
    const params = new URLSearchParams({
      chat_id: chatId,
      limit: limit.toString(),
      offset: offset.toString(),
    });
    const response = await api.get<{ messages: Message[] }>(`/messages?${params.toString()}`);
    return response.data;
  },
};

// Documents API
export const documentsApi = {
  upload: async (
    file: File,
    ragType: RAGType
  ): Promise<{ document: Document }> => {
    const formData = new FormData();
    formData.append("rag_type", ragType);
    formData.append("file", file);
    const response = await api.post<{ document: Document }>(
      "/documents/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  list: async (ragType?: RAGType): Promise<{ documents: Document[] }> => {
    const params = new URLSearchParams();
    if (ragType) params.append("rag_type", ragType);
    const response = await api.get<{ documents: Document[] }>(
      `/documents?${params.toString()}`
    );
    return response.data;
  },
  delete: async (documentId: string): Promise<void> => {
    await api.delete(`/documents/${documentId}`);
  },
};

// RAG API
export const ragApi = {
  query: async (chatId: string, message: string): Promise<any> => {
    const response = await api.post("/rag/query", {
      chat_id: chatId,
      message,
    });
    return response.data;
  },
};

// Usage API
export const usageApi = {
  get: async (ragType: RAGType): Promise<Usage> => {
    const response = await api.get<Usage>(`/usage?rag_type=${ragType}`);
    return response.data;
  },
};

export default api;
