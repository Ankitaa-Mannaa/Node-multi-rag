"use client";

import { RAGPage } from "@/components/rag/RAGPage";

export default function ResumePage() {
  return (
    <RAGPage
      ragType="resume"
      title="Resume RAG"
      description="Analyze and improve your resume with AI-powered insights"
      acceptedFileTypes={["application/pdf"]}
    />
  );
}
