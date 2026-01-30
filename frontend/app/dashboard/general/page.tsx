"use client";

import { RAGPage } from "@/components/rag/RAGPage";

export default function GeneralPage() {
  return (
    <RAGPage
      ragType="general"
      title="General RAG"
      description="General purpose AI assistant for any questions"
      acceptedFileTypes={[]}
    />
  );
}
