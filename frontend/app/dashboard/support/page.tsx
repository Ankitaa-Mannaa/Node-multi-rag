"use client";

import { RAGPage } from "@/components/rag/RAGPage";

export default function SupportPage() {
  return (
    <RAGPage
      ragType="support"
      title="Support RAG"
      description="Get answers from your company documentation and support materials"
      acceptedFileTypes={["application/pdf"]}
    />
  );
}
