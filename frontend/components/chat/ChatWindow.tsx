"use client";

import React, { useEffect, useRef } from "react";
import { Message } from "@/types";
import { FiUser, FiCpu } from "react-icons/fi";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface ChatWindowProps {
  messages: Message[];
  isLoading?: boolean;
}

type WithChildren<T = {}> = React.PropsWithChildren<T>;

const markdownComponents: Components = {
  p: ({ children }: WithChildren) => (
    <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: WithChildren) => (
    <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }: WithChildren) => (
    <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  li: ({ children }: WithChildren) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }: WithChildren) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  em: ({ children }: WithChildren) => <em className="italic">{children}</em>,
  a: ({ children, href }: WithChildren<{ href?: string }>) => (
    <a
      className="text-blue-700 underline underline-offset-2 hover:text-blue-800"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ),
  code: ({ inline, children }: WithChildren<{ inline?: boolean }>) =>
    inline ? (
      <code className="rounded bg-cream-100 px-1 py-0.5 font-mono text-[0.85em]">
        {children}
      </code>
    ) : (
      <code className="block whitespace-pre-wrap rounded-md bg-cream-100 p-3 font-mono text-sm">
        {children}
      </code>
    ),
  pre: ({ children }: WithChildren) => (
    <pre className="my-3 overflow-x-auto rounded-md bg-cream-100 p-3">
      {children}
    </pre>
  ),
  blockquote: ({ children }: WithChildren) => (
    <blockquote className="my-3 border-l-4 border-cream-300 pl-4 italic text-gray-700">
      {children}
    </blockquote>
  ),
  h1: ({ children }: WithChildren) => (
    <h1 className="mt-4 mb-2 text-lg font-semibold">{children}</h1>
  ),
  h2: ({ children }: WithChildren) => (
    <h2 className="mt-4 mb-2 text-base font-semibold">{children}</h2>
  ),
  h3: ({ children }: WithChildren) => (
    <h3 className="mt-3 mb-2 text-base font-semibold">{children}</h3>
  ),
};

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
            <div className="shrink-0 w-8 h-8 rounded-full bg-black flex items-center justify-center shadow-sm">
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
            {message.role === "ai" ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <p className="whitespace-pre-wrap wrap-break-words">
                {message.content}
              </p>
            )}
            <p className="text-xs mt-1.5 opacity-70">
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          {message.role === "user" && (
            <div className="shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shadow-sm">
              <FiUser className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
      ))}
      {isLoading && (
        <div className="flex gap-4 justify-start">
          <div className="shrink-0 w-8 h-8 rounded-full bg-black flex items-center justify-center shadow-sm">
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
