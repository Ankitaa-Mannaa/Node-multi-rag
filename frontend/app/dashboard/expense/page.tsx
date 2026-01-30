"use client";

import { RAGPage } from "@/components/rag/RAGPage";

export default function ExpensePage() {
  return (
    <RAGPage
      ragType="expense"
      title="Expense RAG"
      description="Track and analyze your expenses from CSV files"
      acceptedFileTypes={["text/csv"]}
    />
  );
}
