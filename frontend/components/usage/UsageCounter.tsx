"use client";

import React from "react";
import { Usage } from "@/types";
import { Card } from "@/components/ui/Card";
import { FiMessageSquare } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface UsageCounterProps {
  usage: Usage;
}

export const UsageCounter: React.FC<UsageCounterProps> = ({ usage }) => {
  const percentage = (usage.message_count / usage.limit) * 100;
  const isNearLimit = usage.remaining <= 5;
  const isAtLimit = usage.remaining === 0;
  const resetAt = usage.reset_at ? new Date(usage.reset_at) : null;
  const resetText = resetAt
    ? `Resets ${resetAt.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "Resets in 24 hours";

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <FiMessageSquare className="w-5 h-5 text-black" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">Message Usage</p>
          <p className="text-xs text-gray-600">
            {usage.message_count} / {usage.limit} messages used
          </p>
        </div>
        <div
          className={cn(
            "px-3 py-1 rounded-full text-sm font-medium",
            isAtLimit
              ? "bg-red-100 text-red-700"
              : isNearLimit
              ? "bg-gray-200 text-gray-800"
              : "bg-green-100 text-green-700"
          )}
        >
          {usage.remaining} left
        </div>
      </div>
      <div className="w-full bg-cream-300 rounded-full h-2">
        <div
          className={cn(
            "h-2 rounded-full transition-all",
            isAtLimit
              ? "bg-red-500"
              : isNearLimit
              ? "bg-black"
              : "bg-green-500"
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {isAtLimit && (
        <div className="mt-2 space-y-1">
          <p className="text-xs text-red-600">
            You've reached your message limit for this RAG type
          </p>
          <p className="text-xs text-gray-600">{resetText}</p>
        </div>
      )}
    </Card>
  );
};
