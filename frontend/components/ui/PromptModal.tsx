"use client";

import React, { useEffect } from "react";
import { FiEdit2 } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface PromptModalProps {
  open: boolean;
  title: string;
  description?: string;
  value: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export const PromptModal: React.FC<PromptModalProps> = ({
  open,
  title,
  description,
  value,
  placeholder,
  confirmText = "Save",
  cancelText = "Cancel",
  onChange,
  onConfirm,
  onCancel,
  isSaving = false,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const isInvalid = !value.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-cream-300 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-gradient-to-r from-gray-900 via-gray-600 to-gray-900" />
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cream-200 text-gray-900">
              <FiEdit2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              {description && (
                <p className="mt-1 text-sm text-gray-600">{description}</p>
              )}
            </div>
          </div>
          <div className="mt-4">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              maxLength={120}
            />
          </div>
          <div className="mt-6 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
              {cancelText}
            </Button>
            <Button
              variant="primary"
              onClick={onConfirm}
              isLoading={isSaving}
              disabled={isInvalid || isSaving}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
