import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { Loader2 } from "lucide-react";
import Layout from "./components/Layout";
import AuthForm from "./components/AuthForm";
import Dashboard from "./pages/Dashboard";
import UploadCV from "./pages/UploadCV";
import Jobs from "./pages/Jobs";
import Kanban from "./pages/Kanban";
import Interview from "./pages/Interview";

function AppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-foreground/40">Loading JobAgent…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthForm onAuthSuccess={() => {}} />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload-cv" element={<UploadCV />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/kanban" element={<Kanban />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}