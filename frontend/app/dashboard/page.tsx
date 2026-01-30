"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FiMessageSquare,
  FiFileText,
  FiDollarSign,
  FiZap,
  FiActivity,
  FiBarChart2,
} from "react-icons/fi";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuthStore } from "@/store/authStore";
import { usageApi } from "@/lib/api";
import { chatsApi } from "@/lib/api";
import type { Usage, RAGType, Chat } from "@/types";

const RAG_TYPES: RAGType[] = ["support", "resume", "expense", "general"];

const ragCards = [
  {
    href: "/dashboard/support",
    title: "Support RAG",
    description:
      "Upload company docs and get accurate answers from your internal knowledge base. Use for policies, FAQs, and support materials.",
    icon: FiMessageSquare,
    color: "from-blue-600 to-blue-800",
    ragType: "support" as RAGType,
  },
  {
    href: "/dashboard/resume",
    title: "Resume RAG",
    description:
      "Analyze and improve your resume. Get summaries, score against job profiles, and receive actionable feedback and rewrites.",
    icon: FiFileText,
    color: "from-purple-600 to-purple-800",
    ragType: "resume" as RAGType,
  },
  {
    href: "/dashboard/expense",
    title: "Expense RAG",
    description:
      "Upload CSV expense data for structured analysis. Track spending by category, see trends, and get financial insights.",
    icon: FiDollarSign,
    color: "from-green-600 to-green-800",
    ragType: "expense" as RAGType,
  },
  {
    href: "/dashboard/general",
    title: "General RAG",
    description:
      "General-purpose AI assistant for questions, brainstorming, and topics not covered by your documents or other RAGs.",
    icon: FiZap,
    color: "from-gray-900 to-black",
    ragType: "general" as RAGType,
  },
];

const ragTypeLabel: Record<RAGType, string> = {
  support: "Support RAG",
  resume: "Resume RAG",
  expense: "Expense RAG",
  general: "General RAG",
};

const getUsageTone = (remaining: number, limit: number) => {
  if (!limit || limit <= 0) {
    return { bar: "bg-gray-500", text: "text-gray-500" };
  }
  const remainingRatio = remaining / limit;
  if (remainingRatio <= 0.2) {
    return { bar: "bg-red-500", text: "text-red-600" };
  }
  if (remainingRatio >= 0.6) {
    return { bar: "bg-green-600", text: "text-green-700" };
  }
  return { bar: "bg-yellow-500", text: "text-yellow-600" };
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [usage, setUsage] = useState<Usage[]>([]);
  const [lastUsedChat, setLastUsedChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [usageRes, chatsRes] = await Promise.all([
          Promise.all(RAG_TYPES.map((rt) => usageApi.get(rt))),
          chatsApi.list(undefined, 20, 0),
        ]);
        setUsage(usageRes);
        const chats = chatsRes.chats || [];
        setLastUsedChat(chats.length > 0 ? chats[0] : null);
      } catch (e) {
        console.error("Dashboard load:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const lastUsedLabel = lastUsedChat
    ? ragTypeLabel[lastUsedChat.rag_type]
    : null;
  const lastUsedDate = lastUsedChat
    ? new Date(lastUsedChat.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.email?.split("@")[0]}!
        </h1>
        <p className="text-gray-600">
          Choose a RAG system to get started
        </p>
      </div>

      {/* Four RAG cards in one row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {ragCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Card className="hover:border-black transition-colors cursor-pointer h-full">
                <CardContent className="p-6">
                  <div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-4`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Activity & usage analytics */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <FiBarChart2 className="w-5 h-5" />
          Activity & usage
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Last used RAG */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <FiActivity className="w-5 h-5 text-gray-700" />
                <h3 className="font-semibold text-gray-900">Last used</h3>
              </div>
              {loading ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : lastUsedLabel ? (
                <p className="text-gray-700">
                  <span className="font-medium">{lastUsedLabel}</span>
                  <br />
                  <span className="text-sm text-gray-500">{lastUsedDate}</span>
                </p>
              ) : (
                <p className="text-sm text-gray-500">No activity yet</p>
              )}
            </CardContent>
          </Card>

          {/* Usage summary */}
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Messages used per RAG
              </h3>
              {loading ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : (
                <div className="space-y-3">
                  {usage.map((u) => {
                    const tone = getUsageTone(u.remaining, u.limit);
                    return (
                      <div
                        key={u.rag_type}
                        className="flex items-center justify-between gap-4"
                      >
                        <span className="text-sm font-medium text-gray-800 min-w-[100px]">
                          {ragTypeLabel[u.rag_type]}
                        </span>
                        <div className="flex-1 h-2 bg-cream-300 rounded-full overflow-hidden max-w-[200px]">
                          <div
                            className={`h-full ${tone.bar} rounded-full transition-all`}
                            style={{
                              width: `${Math.min(
                                100,
                                (u.message_count / u.limit) * 100
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 tabular-nums w-20 text-right">
                          {u.message_count} / {u.limit}
                        </span>
                        <span
                          className={`text-xs font-medium w-14 ${tone.text}`}
                        >
                          {u.remaining} left
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Remaining messages per RAG - compact table */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Remaining messages per RAG
            </h3>
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {usage.map((u) => (
                  <div
                    key={u.rag_type}
                    className="p-4 rounded-lg border border-cream-300 bg-cream-50"
                  >
                    <p className="text-xs text-gray-500 mb-1">
                      {ragTypeLabel[u.rag_type]}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {u.remaining}
                      <span className="text-sm font-normal text-gray-500">
                        {" "}
                        / {u.limit}
                      </span>
                    </p>
                    <p className="text-xs text-gray-600 mt-1">messages left</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
