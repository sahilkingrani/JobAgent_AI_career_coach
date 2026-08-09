import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, Mic, Columns3, LogOut, Upload,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/upload-cv", label: "Upload CV", icon: Upload },
  { path: "/jobs", label: "Job Matches", icon: Briefcase },
  { path: "/kanban", label: "Tracker", icon: Columns3 },
  { path: "/interview", label: "Mock Interview", icon: Mic },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-5 border-b border-border">
          <h1 className="text-lg font-heading font-bold text-primary tracking-tight">
            JobAgent
          </h1>
          <p className="text-xs text-foreground/40 mt-0.5">AI Career Coach</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-foreground/60 hover:text-foreground hover:bg-muted/50 border border-transparent"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground/40 hover:text-destructive hover:bg-destructive/5 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}