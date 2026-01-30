"use client";

import React from "react";
import { Document } from "@/types";
import { FiFile, FiCheck, FiLoader, FiX, FiTrash2 } from "react-icons/fi";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface DocumentListProps {
  documents: Document[];
  onDelete?: (documentId: string) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (documentId: string) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onDelete,
  selectable = false,
  selectedIds,
  onToggleSelect,
}) => {
  const getStatusIcon = (status: Document["status"]) => {
    switch (status) {
      case "ready":
        return <FiCheck className="w-4 h-4 text-green-400" />;
      case "processing":
        return <FiLoader className="w-4 h-4 text-black animate-spin" />;
      case "failed":
        return <FiX className="w-4 h-4 text-red-400" />;
      default:
        return <FiFile className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Document["status"]) => {
    switch (status) {
      case "ready":
        return "text-green-400";
      case "processing":
        return "text-black";
      case "failed":
        return "text-red-400";
      default:
        return "text-gray-500";
    }
  };

  const getStatusLabel = (status: Document["status"]) => {
    if (status === "uploaded") return "attached";
    return status;
  };

  if (documents.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-500">No documents uploaded yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>
      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-start justify-between gap-3 p-3 bg-cream-50 rounded-lg border border-cream-300"
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {selectable && (
                <button
                  type="button"
                  onClick={() => onToggleSelect?.(doc.id)}
                  className={cn(
                    "mt-0.5 h-5 w-5 rounded border flex items-center justify-center text-xs",
                    selectedIds?.has(doc.id)
                      ? "bg-black border-black text-white"
                      : "bg-white border-cream-300 text-transparent",
                    doc.status !== "ready" && "opacity-40 cursor-not-allowed"
                  )}
                  disabled={doc.status !== "ready"}
                  aria-label={
                    selectedIds?.has(doc.id)
                      ? "Deselect document for this chat"
                      : "Select document for this chat"
                  }
                >
                  ✓
                </button>
              )}
              {getStatusIcon(doc.status)}
              <div className="flex-1 min-w-0 w-full">
                <p className="text-sm font-medium text-gray-900 break-all whitespace-normal">
                  {doc.file_name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn("text-xs", getStatusColor(doc.status))}>
                    {getStatusLabel(doc.status)}
                  </span>
                  {doc.error_message && (
                    <span className="text-xs text-red-600 truncate">
                      - {doc.error_message}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {onDelete && doc.status !== "processing" && (
              <button
                onClick={() => onDelete(doc.id)}
                className="p-2 text-gray-500 hover:text-red-400 transition-colors shrink-0"
                aria-label="Delete document"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
