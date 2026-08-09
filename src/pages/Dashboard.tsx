import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase, TrendingUp, AlertTriangle, CheckCircle2, Loader2, ArrowRight,
} from "lucide-react";
import { getDashboardStats, type JobListing } from "../lib/api";
import { supabase } from "../lib/supabase";

interface DashboardStats {
  totalJobs: number;
  avgMatch: number;
  inProgress: number;
  scamJobs: number;
  offers: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileExists, setProfileExists] = useState(false);
  const [recentJobs, setRecentJobs] = useState<JobListing[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;

      // Check if user has any CV documents
      const { data: cvs } = await supabase
        .from("cv_documents")
        .select("id")
        .eq("user_id", userId)
        .limit(1);
      setProfileExists((cvs?.length ?? 0) > 0);

      const dashboardStats = await getDashboardStats();
      setStats(dashboardStats);

      // Get recent job listings
      const { data: jobs } = await supabase
        .from("job_listings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentJobs(jobs as JobListing[] || []);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!profileExists) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Briefcase className="w-12 h-12 text-primary/30 mb-4" />
        <h2 className="text-xl font-heading font-bold text-foreground tracking-tight">
          Welcome to JobAgent
        </h2>
        <p className="text-foreground/50 text-sm mt-2 max-w-md">
          Upload your CV and tell us what role you're looking for. We'll analyze your profile,
          find matching jobs, and help you prepare for interviews.
        </p>
        <button
          onClick={() => navigate("/upload-cv")}
          className="btn-primary mt-6"
        >
          Get Started
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const statCards = [
    {
      label: "Jobs Analyzed",
      value: stats?.totalJobs ?? 0,
      icon: Briefcase,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Avg Match Score",
      value: `${stats?.avgMatch ?? 0}%`,
      icon: TrendingUp,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "In Progress",
      value: stats?.inProgress ?? 0,
      icon: CheckCircle2,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Scams Flagged",
      value: stats?.scamJobs ?? 0,
      icon: AlertTriangle,
      color: stats?.scamJobs ? "text-destructive" : "text-foreground/40",
      bg: stats?.scamJobs ? "bg-destructive/10" : "bg-muted",
    },
    {
      label: "Offers",
      value: stats?.offers ?? 0,
      icon: CheckCircle2,
      color: "text-success",
      bg: "bg-success/10",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-heading font-bold text-foreground tracking-tight">
          Dashboard
        </h2>
        <p className="text-foreground/50 text-sm mt-1">
          Your job search at a glance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card-base">
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold font-heading text-foreground">{card.value}</p>
              <p className="text-xs text-foreground/50 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Jobs */}
      <div className="card-base">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground/80">Recent Job Matches</h3>
          <button
            onClick={() => navigate("/jobs")}
            className="text-xs text-primary hover:text-secondary transition-colors cursor-pointer"
          >
            View all
          </button>
        </div>

        {recentJobs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-foreground/40 text-sm">
              No jobs yet. Head to the Job Matches tab to discover opportunities.
            </p>
            <button
              onClick={() => navigate("/jobs")}
              className="btn-primary mt-4 text-sm"
            >
              <Briefcase className="w-4 h-4" />
              Find Jobs
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => {
                  localStorage.setItem("jobagent_selected_job", JSON.stringify(job));
                  navigate("/jobs");
                }}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {job.title}
                  </p>
                  <p className="text-xs text-foreground/50">
                    {job.company}
                    {job.location ? ` · ${job.location}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  {job.match_score != null && job.match_score > 0 && (
                    <span className={`text-sm font-bold font-heading ${
                      job.match_score >= 75 ? "text-success" :
                      job.match_score >= 50 ? "text-warning" : "text-foreground/40"
                    }`}>
                      {job.match_score}%
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 text-foreground/20 group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}