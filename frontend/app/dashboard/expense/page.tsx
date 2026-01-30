"use client";

import { RAGPage } from "@/components/rag/RAGPage";

export default function ExpensePage() {
  return (
    <RAGPage
      ragType="expense"
      title="Expense RAG"
      description="Track and analyze your expenses from PDF, CSV, or TXT files"
      acceptedFileTypes={[
        "application/pdf",
        "text/csv",
        "application/vnd.ms-excel",
        "text/plain",
      ]}
    />
  );
}
