import { Activity } from "lucide-react";
import { Header } from "@/components/Header";
import { FeedbackLearningReport } from "@/components/FeedbackLearningReport";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <h1 className="mb-6 flex items-center gap-2 text-2xl font-black">
          <Activity className="h-6 w-6 text-amber-500" />
          Administração
        </h1>
        <FeedbackLearningReport />
      </main>
    </div>
  );
}
