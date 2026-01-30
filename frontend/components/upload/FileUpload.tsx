"use client";

import React, { useRef, useState } from "react";
import { FiUpload, FiFile, FiX, FiCheck, FiLoader } from "react-icons/fi";
import { Document, RAGType } from "@/types";
import { documentsApi } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  ragType: RAGType;
  onUploadSuccess?: (document: Document) => void;
  acceptedTypes?: string[];
}

export const FileUpload: React.FC<FileUploadProps> = ({
  ragType,
  onUploadSuccess,
  acceptedTypes = ["application/pdf", "text/csv"],
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!acceptedTypes.includes(file.type)) {
      setError(`Invalid file type. Accepted: ${acceptedTypes.join(", ")}`);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await documentsApi.upload(file, ragType);
      onUploadSuccess?.(result.document);
    } catch (err: any) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <Card className="p-6">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging
            ? "border-black bg-cream-200"
            : "border-cream-300 hover:border-gray-600 bg-cream-50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(",")}
          onChange={handleFileInput}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center">
            <FiLoader className="w-12 h-12 text-black animate-spin mb-4" />
            <p className="text-gray-800">Uploading...</p>
          </div>
        ) : (
          <>
            <FiUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-800 mb-2">
              Drag and drop a file here, or{" "}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-black hover:text-gray-700 underline"
              >
                browse
              </button>
            </p>
            <p className="text-sm text-gray-600">
              Accepted: PDF, CSV (Max 10MB)
            </p>
          </>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-300 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    </Card>
  );
};
